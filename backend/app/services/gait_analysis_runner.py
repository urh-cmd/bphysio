"""
Führt die funktionierende Gait-Analysis Streamlit-Pipeline aus.
Ruft die Pipeline unter GAIT_ANALYSIS_ROOT als Subprocess auf.
"""

import json
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Pfad zur Gait-Analysis Pipeline (Streamlit-App)
# Kann über Umgebungsvariable GAIT_ANALYSIS_PATH überschrieben werden
import os
_default = r"C:\Users\Nutzer\Desktop\Projekte\gait-analysis"
GAIT_ANALYSIS_ROOT = Path(os.environ.get("GAIT_ANALYSIS_PATH", _default))


def run_gait_analysis(video_path: str, timeout_seconds: int = 300) -> dict[str, Any]:
    """
    Führt die Gait-Analysis Pipeline aus (wie in der Streamlit-App).
    
    Args:
        video_path: Absoluter Pfad zur Video-Datei
        timeout_seconds: Max. Wartezeit
    
    Returns:
        Ergebnis-Dict mit metrics, poses, processing, etc.
    
    Raises:
        FileNotFoundError: Video oder Pipeline nicht gefunden
        subprocess.TimeoutExpired: Timeout
        ValueError: Pipeline-Fehler
    """
    video_path = Path(video_path).resolve()
    if not video_path.exists():
        raise FileNotFoundError(f"Video nicht gefunden: {video_path}")
    
    if not GAIT_ANALYSIS_ROOT.exists():
        raise FileNotFoundError(
            f"Gait-Analysis Pipeline nicht gefunden: {GAIT_ANALYSIS_ROOT}\n"
            "Bitte Pfad in gait_analysis_runner.py anpassen."
        )
    
    run_script = GAIT_ANALYSIS_ROOT / "run_pipeline.py"
    if not run_script.exists():
        raise FileNotFoundError(f"run_pipeline.py nicht gefunden: {run_script}")
    
    with tempfile.TemporaryDirectory(prefix="bpyhsio_gait_") as tmpdir:
        output_dir = Path(tmpdir)
        cmd = [
            "python",
            str(run_script),
            str(video_path),
            str(output_dir),
        ]
        
        logger.info("Starte Gait-Analysis: %s", " ".join(cmd))
        
        result = subprocess.run(
            cmd,
            cwd=str(GAIT_ANALYSIS_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
        )
        
        if result.returncode != 0:
            err = result.stderr or result.stdout or "Unbekannter Fehler"
            logger.error("Gait-Analysis Fehler: %s", err)
            raise ValueError(f"Pipeline fehlgeschlagen: {err[:500]}")
        
        output_file = output_dir / f"{video_path.stem}_analysis.json"
        if not output_file.exists():
            raise ValueError(
                f"Keine Ausgabe erzeugt: {output_file}\n"
                f"stdout: {result.stdout[:500] if result.stdout else '-'}"
            )
        
        with open(output_file, encoding="utf-8") as f:
            data = json.load(f)
        
        return data


def convert_to_bpyhsio_format(gait_result: dict[str, Any]) -> dict[str, Any]:
    """Konvertiert Gait-Analysis Ausgabe ins BPyhsio-Format (metrics_json, keypoints_2d_json)."""
    metrics = gait_result.get("metrics", {})
    poses = gait_result.get("poses", [])
    processing = gait_result.get("processing", {})
    
    # Metriken mappen
    temporal = metrics.get("temporal", {})
    spatial = metrics.get("spatial", {})
    angular = metrics.get("angular", {})
    symmetry = metrics.get("symmetry", {})
    
    cadence = temporal.get("cadence_spm") or 0.0
    step_time_l = temporal.get("step_time_left_ms")
    step_time_r = temporal.get("step_time_right_ms")
    frames_processed = processing.get("frames_processed", len(poses))
    
    fps_val = processing.get("fps", 30.0) or 30.0
    duration_sec = frames_processed / fps_val if fps_val > 0 else 0
    step_count = int(cadence * duration_sec / 60) if cadence and duration_sec > 0 else 0

    metrics_json = {
        "step_count": step_count,
        "cadence": cadence,
        "symmetry_index": 100.0 * (1 - abs((symmetry.get("step_time_ratio") or 1.0) - 1.0)) if symmetry.get("step_time_ratio") else 100.0,
        "has_asymmetry": symmetry.get("step_time_ratio") is not None and abs((symmetry.get("step_time_ratio") or 1) - 1) > 0.1,
        "has_phase_asymmetry": False,
        "step_length_left": spatial.get("step_length_left_px") or 0.0,
        "step_length_right": spatial.get("step_length_right_px") or 0.0,
        "stride_length": (spatial.get("step_length_left_px") or 0) + (spatial.get("step_length_right_px") or 0),
        "left_right_ratio": (symmetry.get("step_length_ratio") or 1.0),
        "swing_phase_left": 0.0,
        "swing_phase_right": 0.0,
        "stance_phase_left": 0.0,
        "stance_phase_right": 0.0,
        "swing_symmetry_index": 0.0,
        "stance_symmetry_index": 0.0,
        "step_time_left": (step_time_l or 0) / 1000.0,
        "step_time_right": (step_time_r or 0) / 1000.0,
        "double_support_percent": 0.0,
        "single_support_percent": 0.0,
        "max_knee_flexion": 0.0,
        "hip_range_of_motion": 0.0,
    }
    
    knee_left = angular.get("knee_flexion_left_range") or [None, None]
    knee_right = angular.get("knee_flexion_right_range") or [None, None]
    if knee_left[1] is not None:
        metrics_json["max_knee_flexion"] = max(knee_left[1], knee_right[1] or 0)
    
    # Gait-Analysis nutzt benannte Keypoints; Mapping zu COCO-17-Indizes
    NAME_TO_IDX = {
        "nose": 0, "left_hip": 11, "right_hip": 12, "left_knee": 13, "right_knee": 14,
        "left_ankle": 15, "right_ankle": 16,
    }
    
    keypoint_frames = []
    for i, pose in enumerate(poses):
        kp_dict = pose.get("keypoints", pose) if isinstance(pose, dict) else getattr(pose, "keypoints", {})
        kps = [[0.0, 0.0, 0.0] for _ in range(17)]
        fps = processing.get("fps", 30.0)
        
        for name, val in (kp_dict.items() if isinstance(kp_dict, dict) else []):
            if name in NAME_TO_IDX:
                idx = NAME_TO_IDX[name]
                if hasattr(val, "x"):
                    kps[idx] = [val.x, val.y, getattr(val, "confidence", 1.0)]
                elif isinstance(val, dict):
                    kps[idx] = [val.get("x", 0), val.get("y", 0), val.get("confidence", 1.0)]
        
        keypoint_frames.append({
            "frame": i,
            "timestamp": i / fps if fps else 0,
            "keypoints": kps,
        })
    
    return {
        "metrics_json": metrics_json,
        "keypoints_2d_json": {"frames": keypoint_frames} if keypoint_frames else None,
        "fps": processing.get("fps"),
        "frame_count": len(poses),
        "clinical_summary": _build_summary(metrics_json, angular),
    }


def _build_summary(metrics_json: dict, angular: dict) -> str:
    """Erstellt klinische Kurzzusammenfassung."""
    parts = []
    if metrics_json.get("cadence"):
        parts.append(f"Cadence: {metrics_json['cadence']:.1f} Schritte/min")
    if metrics_json.get("has_asymmetry"):
        parts.append("Asymmetrie erkennbar")
    else:
        parts.append("Symmetrischer Gang")
    knee = angular.get("knee_flexion_left_range") or angular.get("knee_flexion_right_range")
    if knee and knee[1] is not None:
        parts.append(f"Kniebeugung: {knee[0]:.0f}°–{knee[1]:.0f}°")
    return ". ".join(parts) if parts else "Analyse abgeschlossen."
