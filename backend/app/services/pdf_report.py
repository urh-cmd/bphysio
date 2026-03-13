"""
BroPhysio - PDF-Ganganalyse-Bericht
===================================
Erstellt einen druckbaren Befundbericht aus Ganganalyse-Daten.
"""

from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _fmt(v: Any, decimals: int = 1) -> str:
    """Formatiert Zahlen für den Bericht."""
    if v is None:
        return "—"
    if isinstance(v, (int, float)):
        if isinstance(v, float) and decimals >= 0:
            return f"{v:.{decimals}f}"
        return str(v)
    return str(v)


def generate_gait_report_pdf(
    patient_id: str,
    session_id: str,
    metrics: dict,
    clinical_summary: Optional[str] = None,
    created_at: Optional[str] = None,
) -> bytes:
    """
    Generiert einen PDF-Bericht für die Ganganalyse.

    Returns:
        PDF als Bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "Heading",
        parent=styles["Heading2"],
        fontSize=12,
        spaceAfter=8,
    )
    body_style = styles["Normal"]

    story = []

    # Titel
    story.append(Paragraph("Ganganalyse-Befundbericht", title_style))
    story.append(Spacer(1, 0.5 * cm))

    # Meta
    meta_data = [
        ["Patient-ID:", patient_id or "—"],
        ["Session-ID:", session_id],
        ["Datum:", created_at or datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M")],
    ]
    meta_table = Table(meta_data, colWidths=[4 * cm, 10 * cm])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 1 * cm))

    # Klinische Zusammenfassung
    if clinical_summary:
        story.append(Paragraph("Klinische Zusammenfassung", heading_style))
        safe = clinical_summary.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        story.append(Paragraph(safe.replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 0.5 * cm))

    # Kernmetriken
    story.append(Paragraph("Kernmetriken", heading_style))
    m = metrics
    core_data = [
        ["Metrik", "Wert", "Einheit"],
        ["Schritte", _fmt(m.get("step_count"), 0), "—"],
        ["Cadenz", _fmt(m.get("cadence")), "Schritte/min"],
        ["Symmetrie-Index", _fmt(m.get("symmetry_index")), "%"],
        ["Schrittlänge links", _fmt(m.get("step_length_left")), "cm"],
        ["Schrittlänge rechts", _fmt(m.get("step_length_right")), "cm"],
        ["Stride Length", _fmt(m.get("stride_length")), "cm"],
        ["Status", "Auffällig" if m.get("has_asymmetry") else "Normal", "—"],
    ]
    core_table = Table(core_data, colWidths=[6 * cm, 4 * cm, 4 * cm])
    core_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ]
        )
    )
    story.append(core_table)
    story.append(Spacer(1, 1 * cm))

    # Zeitliche Parameter
    story.append(Paragraph("Zeitliche Parameter", heading_style))
    time_data = [
        ["Parameter", "Wert"],
        ["Schrittzeit links", _fmt(m.get("step_time_left"), 2) + " s"],
        ["Schrittzeit rechts", _fmt(m.get("step_time_right"), 2) + " s"],
        ["Swing Phase links", _fmt(m.get("swing_phase_left")) + " %"],
        ["Swing Phase rechts", _fmt(m.get("swing_phase_right")) + " %"],
        ["Stance Phase links", _fmt(m.get("stance_phase_left")) + " %"],
        ["Stance Phase rechts", _fmt(m.get("stance_phase_right")) + " %"],
        ["Double Support", _fmt(m.get("double_support_percent")) + " %"],
        ["Single Support", _fmt(m.get("single_support_percent")) + " %"],
    ]
    time_table = Table(time_data, colWidths=[7 * cm, 7 * cm])
    time_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ]
        )
    )
    story.append(time_table)
    story.append(Spacer(1, 1 * cm))

    # Symmetrie
    if m.get("has_phase_asymmetry"):
        story.append(Paragraph("Phasen-Asymmetrie", heading_style))
        sym_data = [
            ["Swing Symmetrie", _fmt(m.get("swing_symmetry_index")) + " %"],
            ["Stance Symmetrie", _fmt(m.get("stance_symmetry_index")) + " %"],
        ]
        sym_table = Table(sym_data, colWidths=[7 * cm, 7 * cm])
        sym_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#b45309")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(sym_table)
        story.append(Spacer(1, 0.5 * cm))

    # Fußzeile
    story.append(Spacer(1, 2 * cm))
    story.append(
        Paragraph(
            "<i>BroPhysio Ganganalyse – Automatisch generierter Befundbericht</i>",
            ParagraphStyle("footer", parent=body_style, fontSize=8, textColor=colors.grey),
        )
    )

    doc.build(story)
    return buffer.getvalue()
