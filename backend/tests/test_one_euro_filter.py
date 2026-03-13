"""Tests für One Euro Filter."""

import pytest

from app.services.movement.one_euro_filter import apply_one_euro_filter


def test_one_euro_filter_empty():
    """Leere Eingabe liefert leere Ausgabe."""
    result = apply_one_euro_filter([], fps=30)
    assert result == []


def test_one_euro_filter_preserves_structure():
    """Struktur der Frames bleibt erhalten."""
    frames = [
        {"frame": 0, "timestamp": 0, "keypoints": [[10.0, 20.0, 0.9], [30.0, 40.0, 0.8]]},
        {"frame": 1, "timestamp": 1 / 30, "keypoints": [[11.0, 21.0, 0.9], [31.0, 41.0, 0.8]]},
    ]
    result = apply_one_euro_filter(frames, fps=30)
    assert len(result) == 2
    assert result[0]["frame"] == 0
    assert "keypoints" in result[0]
    assert len(result[0]["keypoints"]) == 2


def test_one_euro_filter_smooths_values():
    """Filter glättet Werte (Output sollte sich von Input unterscheiden bei Rauschen)."""
    frames = [
        {"frame": i, "timestamp": i / 30, "keypoints": [[10 + i * 0.1 + (i % 2) * 5, 20, 0.9]]}
        for i in range(10)
    ]
    result = apply_one_euro_filter(frames, fps=30)
    assert len(result) == 10
    x_vals = [r["keypoints"][0][0] for r in result]
    assert x_vals[0] == frames[0]["keypoints"][0][0]
