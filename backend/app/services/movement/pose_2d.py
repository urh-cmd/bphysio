"""
BroPhysio - 2D Pose Estimation (YOLOv8-Pose)
============================================
Pipeline-Schritt 1: Video laden (OpenCV) + Pose Estimation (YOLOv8n-Pose).
- Video: cv2.VideoCapture
- Modell: yolov8n-pose.pt (17 Keypoints)
- Keypoints: Nase, Augen, Ohren, Schultern, Ellbogen, Handgelenke, Hüften, Knie, Knöchel
"""

from pathlib import Path
from typing import Any, Callable

import cv2


def extract_keypoints_from_video(
    video_path: str,
    model_path: str | None = None,
    conf: float = 0.3,
    progress_callback: Callable[[int, int], None] | None = None,
    max_frames: int | None = None,
) -> tuple[list[dict[str, Any]], float, int]:
    """
    Extrahiert Pose-Keypoints aus Video mit YOLOv8-pose.
    Bei langen Videos (>120 Frames) wird jedes 2. Frame verarbeitet für schnellere Laufzeit.
    Returns: (keypoints_data, fps, total_frames)
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        raise RuntimeError("ultralytics nicht installiert. pip install ultralytics")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Video konnte nicht geöffnet werden: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Frame-Sampling: lange Videos schneller verarbeiten, aber ausreichend für Ganganalyse
    frame_step = 1
    if max_frames is None and total_frames > 90:
        frame_step = 3  # Jedes 3. Frame → ~66% weniger, gute Gangauflösung
    elif max_frames is not None:
        frame_step = max(1, total_frames // max_frames) if total_frames > max_frames else 1

    if not model_path:
        backend_root = Path(__file__).resolve().parents[3]
        for candidate in [backend_root / "yolov8n-pose.pt", backend_root.parent / "yolov8n-pose.pt"]:
            if candidate.exists():
                model_path = str(candidate)
                break
        else:
            model_path = "yolov8n-pose.pt"  # ultralytics lädt bei Bedarf
    model = YOLO(model_path)

    keypoints_data = []
    frame_count = 0
    frames_to_process = (total_frames + frame_step - 1) // frame_step if frame_step > 1 else total_frames

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_step != 0:
            frame_count += 1
            continue
        try:
            results = model(frame, verbose=False, conf=conf)
            frame_data = {
                "frame": frame_count,
                "timestamp": frame_count / fps if fps > 0 else 0,
                "keypoints": [],
            }
            for result in results:
                if result.keypoints is not None and result.keypoints.xy is not None and len(result.keypoints.xy) > 0:
                    kp_xy = result.keypoints.xy[0].cpu().numpy()
                    kp_conf = result.keypoints.conf[0].cpu().numpy() if result.keypoints.conf is not None else None
                    for i, (x, y) in enumerate(kp_xy):
                        c = float(kp_conf[i]) if kp_conf is not None else 1.0
                        frame_data["keypoints"].append([float(x), float(y), c])
            keypoints_data.append(frame_data)
        except Exception:
            keypoints_data.append({"frame": frame_count, "timestamp": frame_count / fps, "keypoints": []})
        frame_count += 1
        if progress_callback and total_frames > 0:
            step = max(1, min(10, total_frames // 10))
            if frame_count % step == 0 or frame_count == total_frames:
                progress_callback(min(frame_count, total_frames), total_frames)

    if progress_callback and total_frames > 0:
        progress_callback(total_frames, total_frames)
    cap.release()
    if not keypoints_data:
        raise ValueError("Keine Keypoints extrahiert")
    return keypoints_data, float(fps), total_frames
