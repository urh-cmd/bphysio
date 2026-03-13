"""Billing (Abrechnung) API – Leistungskatalog, Export, externe Schnittstellen."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from app.core.dependencies import DbSession, get_current_user_id_required
from app.models.patient import Patient
from app.models.service_catalog import ServiceCatalog
from app.models.treatment_log import TreatmentLog

router = APIRouter()


# --- Service Catalog ---

class ServiceCatalogResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    default_duration_min: Optional[int]
    points: Optional[float]
    amount_eur: Optional[float]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


@router.get("/services", response_model=list[ServiceCatalogResponse])
async def list_services(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    active_only: bool = Query(True),
):
    """Leistungskatalog abrufen (EBM/Heilmittel)."""
    q = select(ServiceCatalog).order_by(ServiceCatalog.code)
    if active_only:
        q = q.where(ServiceCatalog.is_active == True)
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        ServiceCatalogResponse(
            id=s.id,
            code=s.code,
            name=s.name,
            description=s.description,
            default_duration_min=s.default_duration_min,
            points=float(s.points) if s.points is not None else None,
            amount_eur=float(s.amount_eur) if s.amount_eur is not None else None,
            is_active=s.is_active,
        )
        for s in items
    ]


# --- Abrechnungs-Export ---

@router.get("/export")
async def export_billing_data(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    format: str = Query("csv", pattern="^(csv|json)$"),
):
    """
    Behandlungsdaten für externe Abrechnungssoftware exportieren.
    CSV: Semikolon-getrennt, UTF-8 mit BOM (Excel-kompatibel).
    JSON: Strukturiert für API-Anbindung.
    """
    q = (
        select(TreatmentLog, Patient)
        .join(Patient, TreatmentLog.patient_id == Patient.id)
        .where(
            TreatmentLog.treatment_date >= from_date,
            TreatmentLog.treatment_date <= to_date,
        )
        .order_by(TreatmentLog.treatment_date, Patient.last_name, Patient.first_name)
    )
    result = await db.execute(q)
    rows = result.all()

    if format == "csv":
        import csv
        import io

        out = io.StringIO()
        out.write("\ufeff")  # BOM für Excel
        writer = csv.writer(out, delimiter=";", quoting=csv.QUOTE_MINIMAL)
        writer.writerow([
            "Behandlungs-ID", "Datum", "Patient-ID", "Nachname", "Vorname", "Geburtsdatum",
            "Versicherung", "Versicherungsnummer", "Leistungscode", "Dauer_Min", "Verordnung-ID",
            "Notiz", "Erstellt"
        ])
        for tl, pt in rows:
            writer.writerow([
                tl.id,
                tl.treatment_date.isoformat() if tl.treatment_date else "",
                pt.id,
                pt.last_name or "",
                pt.first_name or "",
                pt.date_of_birth.isoformat() if pt.date_of_birth else "",
                pt.insurance_name or "",
                pt.insurance_number or "",
                tl.service_code or "",
                str(tl.duration_minutes) if tl.duration_minutes is not None else "",
                tl.prescription_id or "",
                (tl.note or "").replace("\n", " ")[:200],
                tl.created_at.isoformat() if tl.created_at else "",
            ])
        out.seek(0)
        return StreamingResponse(
            iter([out.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="abrechnung_{from_date}_{to_date}.csv"'
            },
        )

    # JSON
    data = [
        {
            "id": tl.id,
            "treatment_date": tl.treatment_date.isoformat() if tl.treatment_date else None,
            "patient_id": pt.id,
            "patient_last_name": pt.last_name,
            "patient_first_name": pt.first_name,
            "patient_date_of_birth": pt.date_of_birth.isoformat() if pt.date_of_birth else None,
            "insurance_name": pt.insurance_name,
            "insurance_number": pt.insurance_number,
            "service_code": tl.service_code,
            "duration_minutes": tl.duration_minutes,
            "prescription_id": tl.prescription_id,
            "note": tl.note,
        }
        for tl, pt in rows
    ]
    return {"from_date": from_date.isoformat(), "to_date": to_date.isoformat(), "items": data}
