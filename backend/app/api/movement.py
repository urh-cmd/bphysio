"""Movement / Ganganalyse API."""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.config import settings
from app.core.dependencies import DbSession, get_current_user_id_required
from app.models.movement import MovementSession
from app.models.patient import Patient
from app.services.ai_report import generate_ai_report
from app.services.settings_service import get_app_settings_for_llm
from app.services.pdf_report import generate_ai_report_pdf, generate_gait_report_pdf
from app.services.movement.gait_2d import analyze_gait, generate_clinical_summary
from app.services.movement.one_euro_filter import apply_one_euro_filter
from app.services.movement.pose_2d import extract_keypoints_from_video

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=2)
logger = logging.getLogger(__name__)


class SessionResponse(BaseModel):
    id: str
    patient_id: Optional[str]
    patient_name: Optional[str] = None
    status: str
    session_type: str
    capture_mode: str
    fps: Optional[float]
    frame_count: Optional[int]
    metrics_json: Optional[dict]
    clinical_summary: Optional[str]
    error_message: Optional[str]
    created_at: str
    keypoints_2d_json: Optional[dict] = None
    progress_percent: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


@router.post("/upload", response_model=SessionResponse, status_code=201)
async def upload_video(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
):
    """Video hochladen und Session anlegen."""
    if not file.filename or not file.filename.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
        raise HTTPException(400, "Nur MP4, AVI, MOV, MKV erlaubt")

    try:
        upload_dir = Path(settings.UPLOAD_DIR).resolve()
        upload_dir.mkdir(parents=True, exist_ok=True)

        stem = Path(file.filename).stem[:50]
        ext = Path(file.filename).suffix
        out_path = upload_dir / f"{stem}_{_user_id[:8]}{ext}"
        idx = 0
        while out_path.exists():
            idx += 1
            out_path = upload_dir / f"{stem}_{_user_id[:8]}_{idx}{ext}"

        content = await file.read()
        out_path.write_bytes(content)
    except OSError as e:
        raise HTTPException(500, f"Datei konnte nicht gespeichert werden: {e}")
    except Exception as e:
        raise HTTPException(500, f"Upload-Fehler: {type(e).__name__}: {e}")

    try:
        session = MovementSession(
            patient_id=patient_id,
            session_type="gait",
            capture_mode="single",
            camera_count=1,
            video_path=str(out_path),
            status="pending",
        )
        db.add(session)
        await db.flush()
        await db.refresh(session)
    except Exception as e:
        if out_path.exists():
            try:
                out_path.unlink()
            except OSError:
                pass
        raise HTTPException(500, f"Datenbank-Fehler: {type(e).__name__}: {e}")

    name = await _get_patient_name(db, session.patient_id)
    return _session_response(session, include_keypoints=False, patient_name=name)


@router.post("/process/{session_id}", response_model=SessionResponse)
async def process_session(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Session verarbeiten – synchron wie Streamlit, Frontend ruft Backend direkt auf."""
    try:
        return await _do_process_session(session_id, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Process-Session Fehler für %s: %s", session_id, e)
        raise HTTPException(500, f"Verarbeitung fehlgeschlagen: {str(e)}")


async def _do_process_session(session_id: str, db: DbSession):
    """Interne Logik für Session-Verarbeitung."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    if session.status == "completed":
        name = await _get_patient_name(db, session.patient_id)
        return _session_response(session, include_keypoints=True, patient_name=name)
    video_path_str = session.video_path
    if not video_path_str:
        raise HTTPException(400, "Kein Video zugeordnet")
    video_path_str = video_path_str.replace("\\", "/")  # Windows-Pfade normalisieren
    video_path = Path(video_path_str)
    if not video_path.is_absolute():
        video_path = (Path.cwd() / video_path_str).resolve()
    if not video_path.exists():
        upload_dir = Path(settings.UPLOAD_DIR).resolve()
        alt = upload_dir / Path(video_path_str).name
        if alt.exists():
            video_path_str = str(alt)
        else:
            raise HTTPException(400, f"Video nicht gefunden: {video_path_str}")
    else:
        video_path_str = str(video_path.resolve())

    session.status = "processing"
    session.progress_percent = 0
    await db.flush()

    try:
        loop = asyncio.get_running_loop()
        raw_keypoints, fps, total_frames = await loop.run_in_executor(
            _executor,
            lambda: extract_keypoints_from_video(
                video_path_str,
                progress_callback=None,
                max_frames=180,
            ),
        )
        duration = total_frames / fps if fps > 0 else 0
        n_keypoints = len(raw_keypoints)
        effective_fps = (n_keypoints / duration) if duration > 0 and n_keypoints > 0 else fps
        keypoints_data = apply_one_euro_filter(
            raw_keypoints, fps=effective_fps
        )
        metrics = analyze_gait(
            keypoints_data,
            fps=fps,
            duration_seconds=duration,
            pixel_to_cm=1.0,
            effective_fps=effective_fps,
            auto_calibrate=True,
        )

        session.keypoints_2d_json = {"frames": keypoints_data}
        session.fps = fps
        session.frame_count = len(keypoints_data)
        session.metrics_json = {
            "step_count": metrics.step_count,
            "cadence": metrics.cadence,
            "symmetry_index": metrics.symmetry_index,
            "has_asymmetry": metrics.has_asymmetry,
            "has_phase_asymmetry": metrics.has_phase_asymmetry,
            "step_length_left": metrics.step_length_left,
            "step_length_right": metrics.step_length_right,
            "stride_length": metrics.stride_length,
            "left_right_ratio": metrics.left_right_ratio,
            "swing_phase_left": metrics.swing_phase_left,
            "swing_phase_right": metrics.swing_phase_right,
            "stance_phase_left": metrics.stance_phase_left,
            "stance_phase_right": metrics.stance_phase_right,
            "swing_symmetry_index": metrics.swing_symmetry_index,
            "stance_symmetry_index": metrics.stance_symmetry_index,
            "step_time_left": metrics.step_time_left,
            "step_time_right": metrics.step_time_right,
            "double_support_percent": metrics.double_support_percent,
            "single_support_percent": metrics.single_support_percent,
            "max_knee_flexion": metrics.max_knee_flexion,
            "hip_range_of_motion": metrics.hip_range_of_motion,
            "shoulder_rom_left": metrics.shoulder_rom_left,
            "shoulder_rom_right": metrics.shoulder_rom_right,
            "elbow_rom_left": metrics.elbow_rom_left,
            "elbow_rom_right": metrics.elbow_rom_right,
        }
        session.clinical_summary = generate_clinical_summary(metrics)
        session.status = "completed"
    except Exception as e:
        session.status = "failed"
        session.error_message = str(e)
        logger.exception("Verarbeitung fehlgeschlagen für Session %s: %s", session_id, e)
    finally:
        session.progress_percent = 100 if session.status == "completed" else None

    try:
        await db.flush()
        await db.refresh(session)
        name = await _get_patient_name(db, session.patient_id)
        return _session_response(session, include_keypoints=True, patient_name=name)
    except Exception as e:
        logger.exception("DB-Flush/Refresh fehlgeschlagen für Session %s: %s", session_id, e)
        raise HTTPException(500, f"Verarbeitung abgeschlossen, Speichern fehlgeschlagen: {e}")


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    skip: int = 0,
    limit: int = 50,
    patient_id: Optional[str] = None,
):
    """Sessions auflisten."""
    query = select(MovementSession).offset(skip).limit(limit).order_by(MovementSession.created_at.desc())
    if patient_id:
        query = query.where(MovementSession.patient_id == patient_id)
    result = await db.execute(query)
    sessions = result.scalars().all()
    ids = [s.patient_id for s in sessions if s.patient_id]
    names: dict[str, str] = {}
    if ids:
        r = await db.execute(select(Patient).where(Patient.id.in_(ids)))
        for p in r.scalars().all():
            names[p.id] = f"{p.last_name}, {p.first_name}"
    return [
        _session_response(s, include_keypoints=False, patient_name=names.get(s.patient_id) if s.patient_id else None)
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Session abrufen."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    name = await _get_patient_name(db, session.patient_id)
    return _session_response(session, include_keypoints=True, patient_name=name)


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Bewegungssession löschen (inkl. Video-Datei)."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    if session.status == "processing":
        raise HTTPException(409, "Session wird gerade verarbeitet – bitte warten.")
    video_path = session.video_path
    await db.delete(session)
    await db.flush()
    if video_path:
        path = Path(video_path)
        if not path.exists() or not path.is_absolute():
            path = Path(settings.UPLOAD_DIR).resolve() / Path(video_path).name
        if path.exists():
            try:
                path.unlink()
            except OSError:
                pass
    return None


@router.get("/sessions/{session_id}/video")
async def get_session_video(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Video-Datei streamen (für Pose-Overlay-Player)."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    if not session.video_path:
        raise HTTPException(404, "Kein Video zugeordnet")
    path = Path(session.video_path)
    if not path.exists():
        path = Path(settings.UPLOAD_DIR).resolve() / Path(session.video_path).name
    if not path.exists():
        raise HTTPException(404, "Video-Datei nicht gefunden")
    ext = path.suffix.lower()
    media_types = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".avi": "video/x-msvideo", ".mkv": "video/x-matroska"}
    media_type = media_types.get(ext, "video/mp4")
    return FileResponse(path, media_type=media_type)


@router.get("/sessions/{session_id}/pdf-report")
async def get_pdf_report(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """PDF-Befundbericht herunterladen."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    if session.status != "completed":
        raise HTTPException(400, "Session muss verarbeitet sein")

    patient_id = session.patient_id or "patient"
    metrics = session.metrics_json or {}
    clinical_summary = session.clinical_summary
    created_at = session.created_at.strftime("%d.%m.%Y %H:%M") if session.created_at else None
    date_str = session.created_at.strftime("%Y-%m-%d") if session.created_at else "unknown"

    pdf_bytes = generate_gait_report_pdf(
        patient_id=patient_id,
        session_id=session_id,
        metrics=metrics,
        clinical_summary=clinical_summary,
        created_at=created_at,
    )
    filename = f"Ganganalyse_{date_str}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class AIReportRequest(BaseModel):
    provider: str = "ollama"
    api_key: Optional[str] = None
    model: Optional[str] = None


class AIReportPdfRequest(BaseModel):
    report: str


@router.post("/sessions/{session_id}/ai_report")
async def create_ai_report(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    body: Optional[AIReportRequest] = Body(None),
):
    """KI-Befundbericht generieren."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    if session.status != "completed":
        raise HTTPException(400, "Session muss verarbeitet sein")

    patient_id = session.patient_id or "Unbekannt"
    clinical_summary = session.clinical_summary or ""
    metrics = session.metrics_json or {}

    opts = body or AIReportRequest()
    api_key: Optional[str] = opts.api_key
    if not api_key and opts.provider.lower() in ("openai", "nvidia"):
        app_cfg = await get_app_settings_for_llm(db)
        if opts.provider.lower() == "openai":
            api_key = (app_cfg.get("openai_api_key") or "").strip() or None
        else:
            api_key = (app_cfg.get("nvidia_api_key") or "").strip() or None

    try:
        report = await asyncio.get_event_loop().run_in_executor(
            _executor,
            lambda: generate_ai_report(
                patient_id=patient_id,
                clinical_summary=clinical_summary,
                metrics=metrics,
                provider=opts.provider,
                api_key=api_key,
                model=opts.model,
                ollama_base_url=settings.OLLAMA_BASE_URL,
            ),
        )
        return {"report": report}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"KI-Bericht konnte nicht erstellt werden: {str(e)}")


@router.post("/sessions/{session_id}/ai_report_pdf")
async def create_ai_report_pdf_endpoint(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    body: AIReportPdfRequest = Body(...),
):
    """KI-Befundbericht als PDF herunterladen."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    if session.status != "completed":
        raise HTTPException(400, "Session muss verarbeitet sein")
    if not body.report or not body.report.strip():
        raise HTTPException(400, "Kein Berichtstext angegeben. Bitte zuerst KI-Bericht generieren.")

    patient_id = session.patient_id or "—"
    created_at = session.created_at.strftime("%d.%m.%Y %H:%M") if session.created_at else None
    date_str = session.created_at.strftime("%Y-%m-%d") if session.created_at else "unknown"

    pdf_bytes = generate_ai_report_pdf(
        report=body.report.strip(),
        patient_id=patient_id,
        session_id=session_id,
        created_at=created_at,
    )
    filename = f"KI-Befundbericht_{date_str}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/sessions/{session_id}/keypoints")
async def get_session_keypoints(
    session_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Keypoints separat abrufen (für Keypoint-Analyse und Pose-Video)."""
    result = await db.execute(select(MovementSession).where(MovementSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session nicht gefunden")
    kp = session.keypoints_2d_json
    if not kp or "frames" not in kp:
        return {"frames": []}
    return kp


async def _get_patient_name(db: DbSession, patient_id: Optional[str]) -> Optional[str]:
    """Liest Patientennamen aus DB."""
    if not patient_id:
        return None
    r = await db.execute(select(Patient).where(Patient.id == patient_id))
    p = r.scalar_one_or_none()
    return f"{p.last_name}, {p.first_name}" if p else None


def _session_response(
    session: MovementSession,
    include_keypoints: bool = False,
    patient_name: Optional[str] = None,
) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        patient_id=session.patient_id,
        patient_name=patient_name,
        status=session.status,
        session_type=session.session_type,
        capture_mode=session.capture_mode,
        fps=session.fps,
        frame_count=session.frame_count,
        metrics_json=session.metrics_json,
        clinical_summary=session.clinical_summary,
        error_message=session.error_message,
        created_at=session.created_at.isoformat() if session.created_at else "",
        keypoints_2d_json=session.keypoints_2d_json if include_keypoints else None,
        progress_percent=getattr(session, "progress_percent", None),
    )
