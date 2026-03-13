"""Tests für PDF-Report."""

import pytest

from app.services.pdf_report import generate_gait_report_pdf


def test_pdf_report_minimal():
    """PDF mit minimalen Daten wird erstellt."""
    pdf = generate_gait_report_pdf(
        patient_id="P001",
        session_id="abc123",
        metrics={},
        clinical_summary=None,
        created_at=None,
    )
    assert isinstance(pdf, bytes)
    assert len(pdf) > 500
    assert pdf[:4] == b"%PDF"


def test_pdf_report_with_metrics():
    """PDF mit Metriken wird korrekt erstellt."""
    metrics = {
        "step_count": 10,
        "cadence": 100.5,
        "symmetry_index": 8.2,
        "step_length_left": 65.0,
        "step_length_right": 62.0,
        "has_asymmetry": False,
    }
    pdf = generate_gait_report_pdf(
        patient_id="P002",
        session_id="sess456",
        metrics=metrics,
        clinical_summary="Symmetrischer Gang.",
        created_at="05.03.2025 14:30",
    )
    assert len(pdf) > 1000
    assert pdf[:4] == b"%PDF"


def test_pdf_report_clinical_summary_escaping():
    """HTML-Sonderzeichen in clinical_summary werden escaped."""
    pdf = generate_gait_report_pdf(
        patient_id="P003",
        session_id="sess789",
        metrics={"step_count": 1},
        clinical_summary="Test mit <script> & \"quotes\"",
        created_at=None,
    )
    assert b"script" not in pdf or b"&lt;" in pdf
