"""Test der Pose2D-Pipeline (pose_2d + one_euro_filter + gait_2d)."""
import sys
from pathlib import Path

# Backend root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

def create_test_video(path: str, num_frames: int = 30, fps: float = 30.0) -> None:
    """Erstellt ein minimales Testvideo (dunkles Bild mit weißen Punkten als Platzhalter)."""
    import cv2
    import numpy as np
    out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (640, 480))
    for i in range(num_frames):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (40, 40, 40)
        # Simulierter "Körper" - weiße Kreise als Platzhalter
        cx, cy = 320, 240
        cv2.circle(frame, (cx, cy - 80), 15, (255, 255, 255), -1)  # Kopf
        cv2.circle(frame, (cx - 40, cy - 40), 10, (255, 255, 255), -1)  # Schulter L
        cv2.circle(frame, (cx + 40, cy - 40), 10, (255, 255, 255), -1)  # Schulter R
        cv2.circle(frame, (cx - 60, cy + 20), 8, (255, 255, 255), -1)   # Ellbogen L
        cv2.circle(frame, (cx + 60, cy + 20), 8, (255, 255, 255), -1)   # Ellbogen R
        cv2.circle(frame, (cx - 80, cy + 80), 8, (255, 255, 255), -1)   # Hand L
        cv2.circle(frame, (cx + 80, cy + 80), 8, (255, 255, 255), -1)   # Hand R
        cv2.circle(frame, (cx - 25, cy + 60), 10, (255, 255, 255), -1)  # Hüfte L
        cv2.circle(frame, (cx + 25, cy + 60), 10, (255, 255, 255), -1)  # Hüfte R
        cv2.circle(frame, (cx - 30, cy + 140), 10, (255, 255, 255), -1) # Knie L
        cv2.circle(frame, (cx + 30, cy + 140), 10, (255, 255, 255), -1) # Knie R
        cv2.circle(frame, (cx - 35, cy + 220), 8, (255, 255, 255), -1)  # Knöchel L
        cv2.circle(frame, (cx + 35, cy + 220), 8, (255, 255, 255), -1)  # Knöchel R
        out.write(frame)
    out.release()
    print(f"Test-Video erstellt: {path} ({num_frames} Frames)")


def main():
    from app.services.movement.pose_2d import extract_keypoints_from_video
    from app.services.movement.one_euro_filter import apply_one_euro_filter
    from app.services.movement.gait_2d import analyze_gait, generate_clinical_summary

    backend = Path(__file__).resolve().parents[1]
    # Bevorzuge Sample-Video (echte Person), sonst synthetisches
    video_path = backend / "data" / "sample_test.mp4"
    if not video_path.exists():
        video_path = backend / "data" / "test_pose2d.mp4"
    video_path.parent.mkdir(parents=True, exist_ok=True)

    if not video_path.exists():
        create_test_video(str(video_path), num_frames=60)

    print("=" * 50)
    print("1. Pose-Extraktion (pose_2d)")
    print("=" * 50)
    raw_kp, fps, total = extract_keypoints_from_video(
        str(video_path),
        max_frames=30,  # Schneller Test
        progress_callback=lambda c, t: print(f"  Frame {c}/{t}"),
    )
    print(f"  -> {len(raw_kp)} Frames, fps={fps}, total={total}")
    if raw_kp:
        k0 = raw_kp[0]
        kps = k0.get("keypoints", [])
        print(f"  -> Erster Frame: {len(kps)} Keypoints")
        if kps:
            print(f"     Keypoint 0: {kps[0]}")

    print("\n" + "=" * 50)
    print("2. One-Euro-Filter")
    print("=" * 50)
    filtered = apply_one_euro_filter(raw_kp, fps=fps)
    print(f"  -> {len(filtered)} Frames gefiltert")

    print("\n" + "=" * 50)
    print("3. Ganganalyse (gait_2d)")
    print("=" * 50)
    duration = total / fps if fps > 0 else 0
    metrics = analyze_gait(filtered, fps=fps, duration_seconds=duration, pixel_to_cm=1.0)
    print(f"  -> Schritte: {metrics.step_count}, Cadence: {metrics.cadence:.1f}")

    summary = generate_clinical_summary(metrics)
    print(f"\nKlinischer Befund:\n{summary}")
    print("\n" + "=" * 50)
    print("Pose2D-Pipeline: OK")
    print("=" * 50)


if __name__ == "__main__":
    main()
