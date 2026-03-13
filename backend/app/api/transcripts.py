"""Transcripts API – Audio-Upload, Transkription, SOAP-Strukturierung."""

import asyncio
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.config import settings
from app.core.database import update_progress_sync
from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.transcript import Transcript
from app.models.record import Record
from app.services.transcription import transcribe_audio
from app.services.soap_structure import structure_text_to_soap
from app.services.settings_service import get_app_settings_for_llm

router = APIRouter()

ALLOWED_AUDIO = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"}


class TranscriptResponse(BaseModel):
    id: str
    patient_id: Optional[str]
    audio_path: Optional[str]
    raw_text: Optional[str]
    soap_json: Optional[dict]
    status: str
    error_message: Optional[str]
    created_at: str
    updated_at: str
    progress_percent: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


def _to_response(t: Transcript) -> TranscriptResponse:
    return TranscriptResponse(
        id=t.id,
        patient_id=t.patient_id,
        audio_path=t.audio_path,
        raw_text=t.raw_text,
        soap_json=t.soap_json,
        status=t.status,
        error_message=t.error_message,
        created_at=t.created_at.isoformat(),
        updated_at=t.updated_at.isoformat(),
        progress_percent=getattr(t, "progress_percent", None),
    )


@router.get("", response_model=list[TranscriptResponse])
async def list_transcripts(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    patient_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Liste Transkripte."""
    q = (
        select(Transcript)
        .order_by(Transcript.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if patient_id:
        q = q.where(Transcript.patient_id == patient_id)
    result = await db.execute(q)
    items = result.scalars().all()
    return [_to_response(t) for t in items]


@router.post("", response_model=TranscriptResponse, status_code=201)
async def upload_audio(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
):
    """Audio hochladen und Transkript anlegen."""
    if not file.filename:
        raise HTTPException(400, "Kein Dateiname")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_AUDIO:
        raise HTTPException(
            400,
            f"Nur folgende Formate erlaubt: {', '.join(ALLOWED_AUDIO)}",
        )

    upload_dir = Path(settings.UPLOAD_DIR) / "transcripts"
    upload_dir.mkdir(parents=True, exist_ok=True)

    stem = Path(file.filename).stem[:50]
    out_path = upload_dir / f"{stem}_{_user_id[:8]}{ext}"
    idx = 0
    while out_path.exists():
        idx += 1
        out_path = upload_dir / f"{stem}_{_user_id[:8]}_{idx}{ext}"

    try:
        content = await file.read()
        out_path.write_bytes(content)
    except OSError as e:
        raise HTTPException(500, f"Datei konnte nicht gespeichert werden: {e}")

    transcript = Transcript(
        patient_id=patient_id,
        audio_path=str(out_path),
        status="pending",
        created_by=_user_id,
    )
    db.add(transcript)
    await db.flush()
    await db.refresh(transcript)
    return _to_response(transcript)


@router.get("/{transcript_id}", response_model=TranscriptResponse)
async def get_transcript(
    transcript_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Transkript abrufen."""
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transkript nicht gefunden")
    return _to_response(t)


@router.post("/{transcript_id}/process", response_model=TranscriptResponse)
async def process_transcript(
    transcript_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """
    Transkription ausführen (Whisper).
    Erfordert OPENAI_API_KEY.
    """
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transkript nicht gefunden")
    if not t.audio_path:
        raise HTTPException(400, "Kein Audio hinterlegt")

    t.status = "transcribing"
    t.progress_percent = 0
    t.error_message = None
    await db.flush()

    audio_path = Path(t.audio_path).resolve()
    if not audio_path.exists():
        t.status = "failed"
        t.progress_percent = None
        t.error_message = f"Audio-Datei nicht gefunden: {audio_path}"
        await db.flush()
        await db.refresh(t)
        return _to_response(t)

    def _progress_cb(pct: int, _total: int) -> None:
        update_progress_sync("transcripts", "id", transcript_id, min(90, pct))

    def _transcribe_with_progress() -> str:
        return transcribe_audio(str(audio_path), progress_callback=_progress_cb)

    try:
        raw_text = await asyncio.wait_for(
            asyncio.to_thread(_transcribe_with_progress),
            timeout=300,
        )
        t.raw_text = raw_text or ""
        t.status = "completed"
        t.progress_percent = 100
    except asyncio.TimeoutError:
        t.status = "failed"
        t.error_message = "Transkription dauerte zu lange (Timeout). Kürzere Aufnahme versuchen oder kleineres Modell (FASTER_WHISPER_MODEL=base) in .env."
    except ValueError as e:
        t.status = "failed"
        t.error_message = str(e)
    except Exception as e:
        t.status = "failed"
        t.error_message = f"{type(e).__name__}: {e}"
    finally:
        t.progress_percent = 100 if t.status == "completed" else None

    await db.flush()
    await db.refresh(t)
    return _to_response(t)


class StructureSoapRequest(BaseModel):
    provider: str = "ollama"
    model: Optional[str] = None


@router.post("/{transcript_id}/structure-soap", response_model=TranscriptResponse)
async def structure_transcript_to_soap(
    transcript_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    body: Optional[StructureSoapRequest] = None,
):
    """
    Rohtext via LLM in SOAP strukturieren (S/O/A/P).
    Erfordert Ollama oder OPENAI_API_KEY.
    """
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transkript nicht gefunden")
    if not t.raw_text:
        raise HTTPException(400, "Kein transkribierter Text vorhanden. Zuerst Transkribieren.")

    opts = body or StructureSoapRequest()
    app_cfg = await get_app_settings_for_llm(db)
    provider = opts.provider or app_cfg["llm_provider"]
    model = opts.model or app_cfg["llm_model"]
    try:
        soap = await structure_text_to_soap(
            t.raw_text,
            provider=provider,
            model=model,
            openai_api_key=app_cfg["openai_api_key"] or None,
            nvidia_api_key=app_cfg["nvidia_api_key"] or None,
        )
        t.soap_json = soap
    except Exception as e:
        raise HTTPException(500, f"SOAP-Strukturierung fehlgeschlagen: {e}")

    await db.flush()
    await db.refresh(t)
    return _to_response(t)


class CreateRecordFromTranscriptRequest(BaseModel):
    title: Optional[str] = None


@router.post("/{transcript_id}/create-record", response_model=dict)
async def create_record_from_transcript(
    transcript_id: str,
    db: DbSession,
    user_id: str = Depends(get_current_user_id_required),
    body: Optional[CreateRecordFromTranscriptRequest] = None,
):
    """
    Erstellt eine Akte (Record) aus dem transkribierten und strukturierten SOAP.
    Erfordert patient_id am Transcript und soap_json (z.B. nach structure-soap).
    """
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transkript nicht gefunden")
    if not t.patient_id:
        raise HTTPException(400, "Transcript muss einem Patient zugeordnet sein.")
    soap = t.soap_json or {}
    if not isinstance(soap, dict):
        raise HTTPException(400, "Zuerst SOAP-Strukturierung ausführen.")

    record = Record(
        patient_id=t.patient_id,
        title=body.title if body and body.title else f"Akte aus Transkript {transcript_id[:8]}",
        record_type="soap",
        subjective=soap.get("subjective"),
        objective=soap.get("objective"),
        assessment=soap.get("assessment"),
        plan=soap.get("plan"),
        created_by=user_id,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return {"id": record.id, "message": "Akte erstellt"}


@router.delete("/{transcript_id}", status_code=204)
async def delete_transcript(
    transcript_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Transkript löschen."""
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Transkript nicht gefunden")
    await db.delete(t)
    return None
