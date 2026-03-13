"""Tests für Ganganalyse (gait_2d)."""

import numpy as np
import pytest

from app.services.movement.gait_2d import (
    analyze_gait,
    calculate_gait_phases,
    calculate_step_lengths,
    detect_heel_strikes,
    generate_clinical_summary,
)


def _make_frame(frame_idx: int, fps: float, left_ankle_y: float, right_ankle_y: float) -> dict:
    """Erstellt einen Test-Frame mit 17 Keypoints."""
    kps = [[0.0, 0.0, 0.0] for _ in range(17)]
    kps[15] = [100.0, left_ankle_y, 0.9]
    kps[16] = [200.0, right_ankle_y, 0.9]
    kps[11], kps[12] = [90, 50, 0.9], [210, 50, 0.9]
    kps[13], kps[14] = [95, 120, 0.9], [205, 120, 0.9]
    return {"frame": frame_idx, "timestamp": frame_idx / fps, "keypoints": kps}


def test_analyze_gait_empty():
    """Leere Keypoint-Daten liefern leere Metriken."""
    m = analyze_gait([])
    assert m.step_count == 0
    assert m.cadence == 0.0
    assert m.symmetry_index == 0.0


def test_analyze_gait_minimal_steps():
    """Minimaler Datensatz mit 2–3 Schritten pro Seite."""
    fps = 30.0
    frames = []
    for i in range(90):
        left_y = 200 + 20 * np.sin(2 * np.pi * i / 15)
        right_y = 200 + 20 * np.sin(2 * np.pi * (i - 7.5) / 15)
        frames.append(_make_frame(i, fps, left_y, right_y))
    m = analyze_gait(frames, fps=fps, duration_seconds=3.0, pixel_to_cm=1.0)
    assert m.step_count >= 2
    assert m.cadence >= 0 or m.step_count == 0


def test_detect_heel_strikes_insufficient_data():
    """Weniger als 10 Frames mit Ankles → leere Strikes."""
    frames = [_make_frame(i, 30, 200, 200) for i in range(5)]
    left, right = detect_heel_strikes(frames, fps=30)
    assert left == []
    assert right == []


def test_calculate_step_lengths_empty():
    """Keine Heel Strikes → Schrittlänge 0."""
    frames = [{"keypoints": [[0, 0, 0]] * 17} for _ in range(20)]
    left, right = calculate_step_lengths(frames)
    assert left == 0.0
    assert right == 0.0


def test_generate_clinical_summary_asymmetric():
    """Klinische Zusammenfassung bei Asymmetrie."""
    from app.services.movement.gait_2d import GaitMetrics

    m = GaitMetrics(step_count=10, cadence=100, symmetry_index=15, has_asymmetry=True)
    s = generate_clinical_summary(m)
    assert "Auffälligkeit" in s or "Asymmetrie" in s
    assert "15" in s


def test_generate_clinical_summary_symmetric():
    """Klinische Zusammenfassung bei symmetrischem Gang."""
    from app.services.movement.gait_2d import GaitMetrics

    m = GaitMetrics(step_count=12, cadence=110, symmetry_index=5, has_asymmetry=False)
    s = generate_clinical_summary(m)
    assert "Symmetrisch" in s or "symmetrisch" in s
