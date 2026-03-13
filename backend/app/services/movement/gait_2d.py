"""
BroPhysio - Ganganalyse (Haile-Logik)
=====================================
Berechnet klinische Gangmetriken aus Pose-Keypoints.
"""

import numpy as np
from typing import List, Dict, Tuple
from dataclasses import dataclass


@dataclass
class GaitMetrics:
    """Container für berechnete Gangmetriken."""
    step_count: int = 0
    cadence: float = 0.0
    step_time_left: float = 0.0
    step_time_right: float = 0.0
    double_support_percent: float = 0.0
    single_support_percent: float = 0.0
    swing_phase_left: float = 0.0
    swing_phase_right: float = 0.0
    stance_phase_left: float = 0.0
    stance_phase_right: float = 0.0
    swing_symmetry_index: float = 0.0
    stance_symmetry_index: float = 0.0
    step_length_left: float = 0.0
    step_length_right: float = 0.0
    stride_length: float = 0.0
    step_width: float = 0.0
    base_of_support: float = 0.0
    symmetry_index: float = 0.0
    left_right_ratio: float = 1.0
    max_knee_flexion: float = 0.0
    hip_range_of_motion: float = 0.0
    ankle_dorsiflexion: float = 0.0
    # Oberkörper (Schultern, Ellbogen)
    shoulder_rom_left: float = 0.0
    shoulder_rom_right: float = 0.0
    elbow_rom_left: float = 0.0
    elbow_rom_right: float = 0.0
    has_asymmetry: bool = False
    has_irregular_cadence: bool = False
    has_phase_asymmetry: bool = False


def calculate_gait_phases(
    keypoints_data: List[Dict], left_strikes: List[int],
    right_strikes: List[int], fps: float = 30.0
) -> Dict[str, float]:
    """Berechnet Gangphasen-Prozentsätze."""
    if not left_strikes or not right_strikes or len(keypoints_data) < 10:
        return {
            "double_support": 0.0, "single_support": 0.0,
            "swing_left": 0.0, "swing_right": 0.0,
            "stance_left": 0.0, "stance_right": 0.0,
            "swing_symmetry": 0.0, "stance_symmetry": 0.0,
        }

    total_frames = len(keypoints_data)
    all_events = [("left", f) for f in left_strikes] + [("right", f) for f in right_strikes]
    all_events.sort(key=lambda x: x[1])

    if len(all_events) < 4:
        return {k: 0.0 for k in [
            "double_support", "single_support", "swing_left", "swing_right",
            "stance_left", "stance_right", "swing_symmetry", "stance_symmetry",
        ]}

    double_support_frames = single_support_frames = 0
    left_swing_frames = right_swing_frames = 0
    left_stance_frames = right_stance_frames = 0

    for i in range(len(all_events) - 1):
        current_side, current_frame = all_events[i]
        next_side, next_frame = all_events[i + 1]
        duration = next_frame - current_frame
        if current_side != next_side:
            single_support_frames += duration
            if current_side == "left":
                left_stance_frames += duration
                right_swing_frames += duration
            else:
                right_stance_frames += duration
                left_swing_frames += duration
        else:
            double_support_frames += duration // 2
            single_support_frames += duration // 2

    def safe_percent(frames):
        return (frames / total_frames * 100) if total_frames > 0 else 0.0

    swing_left_pct = safe_percent(left_swing_frames)
    swing_right_pct = safe_percent(right_swing_frames)
    stance_left_pct = safe_percent(left_stance_frames)
    stance_right_pct = safe_percent(right_stance_frames)

    total_cycle = swing_left_pct + stance_left_pct
    if total_cycle > 0:
        swing_left_pct = (swing_left_pct / total_cycle) * 100
        stance_left_pct = (stance_left_pct / total_cycle) * 100
    total_cycle_right = swing_right_pct + stance_right_pct
    if total_cycle_right > 0:
        swing_right_pct = (swing_right_pct / total_cycle_right) * 100
        stance_right_pct = (stance_right_pct / total_cycle_right) * 100

    swing_symmetry = (
        abs(swing_left_pct - swing_right_pct) / ((swing_left_pct + swing_right_pct) / 2) * 100
        if (swing_left_pct + swing_right_pct) > 0 else 0
    )
    stance_symmetry = (
        abs(stance_left_pct - stance_right_pct) / ((stance_left_pct + stance_right_pct) / 2) * 100
        if (stance_left_pct + stance_right_pct) > 0 else 0
    )

    return {
        "double_support": safe_percent(double_support_frames),
        "single_support": safe_percent(single_support_frames),
        "swing_left": swing_left_pct, "swing_right": swing_right_pct,
        "stance_left": stance_left_pct, "stance_right": stance_right_pct,
        "swing_symmetry": swing_symmetry, "stance_symmetry": stance_symmetry,
    }


def detect_heel_strikes(
    keypoints_data: List[Dict], fps: float = 30.0,
    min_step_interval_ms: float = 200.0,
    effective_fps: float | None = None,
) -> Tuple[List[int], List[int]]:
    """Erkennt Fersenkontakt (Heel Strike) links und rechts.
    effective_fps: Bei Frame-Sampling die tatsächliche Keypoint-Rate (z.B. 10 bei jedem 3. Frame von 30fps).
    """
    left_strikes, right_strikes = [], []
    rate = effective_fps if effective_fps and effective_fps > 0 else fps
    min_frame_interval = max(1, int((min_step_interval_ms / 1000.0) * rate))
    left_y_history, right_y_history = [], []

    for i, frame in enumerate(keypoints_data):
        kps = frame.get("keypoints", [])
        if len(kps) < 17:
            continue
        left_ankle = kps[15] if len(kps) > 15 and len(kps[15]) >= 3 and kps[15][2] > 0.3 else None
        right_ankle = kps[16] if len(kps) > 16 and len(kps[16]) >= 3 and kps[16][2] > 0.3 else None
        if left_ankle and right_ankle:
            left_y_history.append((i, left_ankle[1]))
            right_y_history.append((i, right_ankle[1]))

    if len(left_y_history) < 10 or len(right_y_history) < 10:
        return left_strikes, right_strikes

    def find_strikes(y_history):
        strikes = []
        window_size = max(3, min_frame_interval // 2)
        for i in range(window_size, len(y_history) - window_size):
            frame_idx, y_val = y_history[i]
            is_minimum = all(
                (i - j < 0 or y_history[i - j][1] >= y_val) and
                (i + j >= len(y_history) or y_history[i + j][1] >= y_val)
                for j in range(1, window_size + 1)
            )
            if is_minimum and (not strikes or (frame_idx - strikes[-1]) >= min_frame_interval):
                strikes.append(frame_idx)
        return strikes

    return find_strikes(left_y_history), find_strikes(right_y_history)


def estimate_pixel_to_cm(keypoints_data: List[Dict], ref_cm: float = 80.0) -> float:
    """Schätzt pixel_to_cm aus Hüfte–Knöchel-Abstand (Referenz ~80cm für Erwachsene)."""
    if not keypoints_data or ref_cm <= 0:
        return 1.0
    dists = []
    for frame in keypoints_data[:min(30, len(keypoints_data))]:
        kps = frame.get("keypoints", [])
        if len(kps) >= 17:
            for side in [(11, 15), (12, 16)]:
                a, b = kps[side[0]], kps[side[1]]
                if len(a) >= 2 and len(b) >= 2 and (a[2] if len(a) > 2 else 1) > 0.3 and (b[2] if len(b) > 2 else 1) > 0.3:
                    d = np.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
                    if d > 10:
                        dists.append(d)
    if not dists:
        return 1.0
    mean_px = float(np.median(dists))
    if mean_px < 5:
        return 1.0
    ratio = ref_cm / mean_px
    return float(np.clip(ratio, 0.05, 3.0))


def calculate_step_lengths(
    keypoints_data: List[Dict], pixel_to_cm: float = 1.0
) -> Tuple[float, float]:
    """Berechnet Schrittlängen links und rechts in cm."""
    left_strikes, right_strikes = detect_heel_strikes(keypoints_data)
    left_lengths, right_lengths = [], []

    for i in range(len(left_strikes) - 1):
        kps1 = keypoints_data[left_strikes[i]].get("keypoints", [])
        kps2 = keypoints_data[left_strikes[i + 1]].get("keypoints", [])
        if len(kps1) > 15 and len(kps2) > 15 and len(kps1[15]) >= 2 and len(kps2[15]) >= 2:
            left_lengths.append(abs(kps2[15][0] - kps1[15][0]) * pixel_to_cm)

    for i in range(len(right_strikes) - 1):
        kps1 = keypoints_data[right_strikes[i]].get("keypoints", [])
        kps2 = keypoints_data[right_strikes[i + 1]].get("keypoints", [])
        if len(kps1) > 16 and len(kps2) > 16 and len(kps1[16]) >= 2 and len(kps2[16]) >= 2:
            right_lengths.append(abs(kps2[16][0] - kps1[16][0]) * pixel_to_cm)

    return (
        float(np.mean(left_lengths)) if left_lengths else 0.0,
        float(np.mean(right_lengths)) if right_lengths else 0.0,
    )


def _angle_at(p1: List, p2: List, p3: List) -> float:
    """Winkel bei p2 (Vertex) zwischen p1-p2 und p3-p2, in Grad."""
    try:
        v1 = np.array([float(p1[0]), float(p1[1])])
        v2 = np.array([float(p2[0]), float(p2[1])])
        v3 = np.array([float(p3[0]), float(p3[1])])
        a, b = v1 - v2, v3 - v2
        na, nb = np.linalg.norm(a), np.linalg.norm(b)
        if na < 1e-10 or nb < 1e-10:
            return 0.0
        cos_a = np.clip(np.dot(a, b) / (na * nb), -1.0, 1.0)
        return 180.0 - np.degrees(np.arccos(cos_a))
    except Exception:
        return 0.0


def calculate_joint_angles(keypoints_data: List[Dict]) -> Dict[str, List[float]]:
    """Berechnet Gelenkwinkel über Zeit (Beine + Oberkörper)."""
    angles = {
        "knee_left": [], "knee_right": [],
        "hip_left": [], "hip_right": [],
        "ankle_left": [], "ankle_right": [],
        "shoulder_left": [], "shoulder_right": [],  # Schulter: 5-7-9, 6-8-10
        "elbow_left": [], "elbow_right": [],        # Ellbogen: 5-7-9, 6-8-10
    }

    for frame in keypoints_data:
        kps = frame.get("keypoints", [])
        if len(kps) < 17:
            continue
        # Beine
        if all(len(kps[i]) >= 2 for i in [11, 13, 15]):
            angles["knee_left"].append(_angle_at(kps[11], kps[13], kps[15]))
        if all(len(kps[i]) >= 2 for i in [12, 14, 16]):
            angles["knee_right"].append(_angle_at(kps[12], kps[14], kps[16]))
        if all(len(kps[i]) >= 2 for i in [5, 11, 13]):
            angles["hip_left"].append(_angle_at(kps[5], kps[11], kps[13]))
        if all(len(kps[i]) >= 2 for i in [6, 12, 14]):
            angles["hip_right"].append(_angle_at(kps[6], kps[12], kps[14]))
        # Oberkörper: Schulter (5-6-7, 6-5-8) bzw. Arm-Schulter-Ellbogen (5-7-9, 6-8-10)
        # Ellbogen: Schulter-Ellbogen-Handgelenk
        if all(len(kps[i]) >= 2 for i in [5, 7, 9]):
            angles["elbow_left"].append(_angle_at(kps[5], kps[7], kps[9]))
        if all(len(kps[i]) >= 2 for i in [6, 8, 10]):
            angles["elbow_right"].append(_angle_at(kps[6], kps[8], kps[10]))
        # Schulter: Hüfte-Schulter-Ellbogen (Rumpf-Arm-Winkel)
        if all(len(kps[i]) >= 2 for i in [11, 5, 7]):
            angles["shoulder_left"].append(_angle_at(kps[11], kps[5], kps[7]))
        if all(len(kps[i]) >= 2 for i in [12, 6, 8]):
            angles["shoulder_right"].append(_angle_at(kps[12], kps[6], kps[8]))

    return angles


def analyze_gait(
    keypoints_data: List[Dict],
    fps: float = 30.0,
    duration_seconds: float = None,
    pixel_to_cm: float = 1.0,
    effective_fps: float | None = None,
    auto_calibrate: bool = True,
) -> GaitMetrics:
    """Vollständige Ganganalyse.
    effective_fps: Bei Frame-Sampling die tatsächliche Keypoint-Rate.
    auto_calibrate: pixel_to_cm aus Hüfte-Knöchel-Abstand schätzen, falls pixel_to_cm=1.0.
    """
    metrics = GaitMetrics()
    if not keypoints_data:
        return metrics

    if auto_calibrate and pixel_to_cm == 1.0:
        pixel_to_cm = estimate_pixel_to_cm(keypoints_data)

    left_strikes, right_strikes = detect_heel_strikes(
        keypoints_data, fps, effective_fps=effective_fps
    )
    total_steps = len(left_strikes) + len(right_strikes)
    metrics.step_count = total_steps

    if duration_seconds and duration_seconds > 0:
        metrics.cadence = (total_steps / duration_seconds) * 60

    def step_time_from_timestamps(strikes: List[int]) -> float:
        if len(strikes) < 2:
            return 0.0
        dts = []
        for i in range(len(strikes) - 1):
            t1 = keypoints_data[strikes[i]].get("timestamp")
            t2 = keypoints_data[strikes[i + 1]].get("timestamp")
            if t1 is not None and t2 is not None:
                dts.append(float(t2) - float(t1))
        return float(np.mean(dts)) if dts else 0.0

    metrics.step_time_left = step_time_from_timestamps(left_strikes)
    metrics.step_time_right = step_time_from_timestamps(right_strikes)

    phases = calculate_gait_phases(keypoints_data, left_strikes, right_strikes, fps)
    metrics.double_support_percent = phases["double_support"]
    metrics.single_support_percent = phases["single_support"]
    metrics.swing_phase_left = phases["swing_left"]
    metrics.swing_phase_right = phases["swing_right"]
    metrics.stance_phase_left = phases["stance_left"]
    metrics.stance_phase_right = phases["stance_right"]
    metrics.swing_symmetry_index = phases["swing_symmetry"]
    metrics.stance_symmetry_index = phases["stance_symmetry"]
    metrics.has_phase_asymmetry = (
        metrics.swing_symmetry_index > 15 or metrics.stance_symmetry_index > 15
    )

    left_length, right_length = calculate_step_lengths(keypoints_data, pixel_to_cm)
    metrics.step_length_left = left_length
    metrics.step_length_right = right_length
    metrics.stride_length = (left_length + right_length)

    if left_length > 0 and right_length > 0:
        metrics.symmetry_index = abs(left_length - right_length) / ((left_length + right_length) / 2) * 100
        metrics.left_right_ratio = left_length / right_length
        metrics.has_asymmetry = metrics.symmetry_index > 10

    angles = calculate_joint_angles(keypoints_data)
    if angles["knee_left"]:
        metrics.max_knee_flexion = max(angles["knee_left"])
    if angles["hip_left"]:
        metrics.hip_range_of_motion = max(angles["hip_left"]) - min(angles["hip_left"])
    # Oberkörper: Range of Motion (Bewegungsumfang)
    if angles["shoulder_left"]:
        metrics.shoulder_rom_left = max(angles["shoulder_left"]) - min(angles["shoulder_left"])
    if angles["shoulder_right"]:
        metrics.shoulder_rom_right = max(angles["shoulder_right"]) - min(angles["shoulder_right"])
    if angles["elbow_left"]:
        metrics.elbow_rom_left = max(angles["elbow_left"]) - min(angles["elbow_left"])
    if angles["elbow_right"]:
        metrics.elbow_rom_right = max(angles["elbow_right"]) - min(angles["elbow_right"])

    return metrics


def generate_clinical_summary(metrics: GaitMetrics) -> str:
    """Erzeugt klinischen Befund-Text aus Metriken (plain text, kein Markdown)."""
    lines: list[str] = []
    if metrics.has_asymmetry:
        lines.append(f"BEFUND: Auffälligkeit – Asymmetrisches Gangbild (Symmetrie-Index {metrics.symmetry_index:.1f}%, Normal <10%)")
    else:
        lines.append("BEFUND: Symmetrischer Gang erkannt")
    lines.append(f"SCHRITTANZAHL:{metrics.step_count}")
    lines.append(f"CADENZ:{metrics.cadence:.1f}")
    if metrics.step_length_left > 0 or metrics.step_length_right > 0:
        lines.append(f"SCHRITTLÄNGE_LINKS:{metrics.step_length_left:.1f}")
        lines.append(f"SCHRITTLÄNGE_RECHTS:{metrics.step_length_right:.1f}")
    if metrics.max_knee_flexion > 0:
        lines.append(f"MAX_KNIEFLEXION:{metrics.max_knee_flexion:.1f}")
    if metrics.hip_range_of_motion > 0:
        lines.append(f"HÜFTBEWEGUNGSUMFANG:{metrics.hip_range_of_motion:.1f}°")
    # Oberkörper
    if metrics.shoulder_rom_left > 0 or metrics.shoulder_rom_right > 0:
        lines.append(f"SCHULTER_BEWEGUNGSUMFANG_LINKS:{metrics.shoulder_rom_left:.1f}° RECHTS:{metrics.shoulder_rom_right:.1f}°")
    if metrics.elbow_rom_left > 0 or metrics.elbow_rom_right > 0:
        lines.append(f"ELLBOGEN_BEWEGUNGSUMFANG_LINKS:{metrics.elbow_rom_left:.1f}° RECHTS:{metrics.elbow_rom_right:.1f}°")
    return "\n".join(lines)
