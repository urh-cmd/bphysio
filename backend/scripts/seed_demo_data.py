"""Seed-Demo: System mit realistischen Beispieldaten füllen.
Run: python -m scripts.seed_demo_data
"""

import asyncio
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, get_sync_engine
from app.core.security import get_password_hash
from app.models.user import Role, User, UserRole
from app.models.patient import Patient
from app.models.zuweiser import Zuweiser
from app.models.record import Record
from app.models.transcript import Transcript
from app.models.training_plan import TrainingPlan
from app.models.recall import Recall
from app.models.treatment_log import TreatmentLog
from app.models.movement import MovementSession
from app.models.appointment import Therapist, Room, AppointmentSlot, Appointment, OnlineBookingConfig
from app.models.app_setting import AppSetting
from app.models.service_catalog import ServiceCatalog
from app.models.prescription import Prescription, PrescriptionItem


# Heilmittel-Leistungskatalog (EBM-orientiert)
SERVICE_CATALOG = [
    {"code": "KG", "name": "Krankengymnastik", "description": "KG für Stütz- und Bewegungsorgane", "default_duration_min": 20, "amount_eur": 30.03},
    {"code": "KG-Gerät", "name": "Gerätegestützte Krankengymnastik", "description": "KG am Gerät", "default_duration_min": 20, "amount_eur": 24.73},
    {"code": "KG-ZNS", "name": "KG-ZNS (Bobath/Vojta/PNF)", "description": "Neurophysiologische Techniken", "default_duration_min": 25, "amount_eur": 44.89},
    {"code": "MT", "name": "Manuelle Therapie", "description": "MT Wirbelsäule und Gelenke", "default_duration_min": 20, "amount_eur": 35.93},
    {"code": "MT-Extremität", "name": "MT Extremitäten", "description": "Manuelle Therapie an Extremitäten", "default_duration_min": 20, "amount_eur": 35.93},
    {"code": "PNF", "name": "PNF (Propriozeptive Neuromuskuläre Fazilitation)", "description": "Neurophysiologische Methode", "default_duration_min": 25, "amount_eur": 44.89},
    {"code": "Massage", "name": "Klassische Massage", "description": "Massage einzelner Körperregionen", "default_duration_min": 20, "amount_eur": 21.18},
    {"code": "BGG", "name": "Bewegungstherapie im Gerät", "description": "Training am Gerät", "default_duration_min": 20, "amount_eur": 24.73},
    {"code": "KGG", "name": "Krankengymnastik am Gerät", "description": "KG mit Geräten", "default_duration_min": 20, "amount_eur": 24.73},
    {"code": "KG-Komplex", "name": "KG-Komplexbehandlung", "description": "Mehrere Techniken kombiniert", "default_duration_min": 30, "amount_eur": 39.48},
]

# Realistische deutsche Beispieldaten (inkl. Versicherung)
PATIENTS = [
    {"first_name": "Anna", "last_name": "Müller", "date_of_birth": "1985-03-15", "gender": "w", "email": "anna.mueller@example.de", "phone": "0151 12345678", "insurance_type": "gkv", "insurance_name": "AOK Nordost", "insurance_number": "A123456789"},
    {"first_name": "Peter", "last_name": "Schmidt", "date_of_birth": "1972-08-22", "gender": "m", "email": "p.schmidt@example.de", "phone": "0172 9876543", "insurance_type": "gkv", "insurance_name": "Barmer", "insurance_number": "B987654321"},
    {"first_name": "Maria", "last_name": "Weber", "date_of_birth": "1990-11-08", "gender": "w", "email": "maria.weber@web.de", "phone": "0160 5551234", "insurance_type": "pkv", "insurance_name": "Debeka", "insurance_number": "PKV-45678"},
    {"first_name": "Thomas", "last_name": "Fischer", "date_of_birth": "1968-01-30", "gender": "m", "email": "th.fischer@example.de", "phone": "0178 2345678", "insurance_type": "gkv", "insurance_name": "Techniker Krankenkasse", "insurance_number": "TK123456789"},
    {"first_name": "Sabine", "last_name": "Bauer", "date_of_birth": "1978-06-12", "gender": "w", "email": "s.bauer@example.de", "phone": "0152 8765432", "insurance_type": "gkv", "insurance_name": "DAK Gesundheit", "insurance_number": "DAK555666"},
    {"first_name": "Michael", "last_name": "Klein", "date_of_birth": "1955-09-25", "gender": "m", "email": "m.klein@example.de", "phone": "0163 1122334", "insurance_type": "self", "insurance_name": None, "insurance_number": None},
    {"first_name": "Lisa", "last_name": "Hoffmann", "date_of_birth": "1995-04-18", "gender": "w", "email": "lisa.hoffmann@example.de", "phone": "0176 4455667", "insurance_type": "gkv", "insurance_name": "BKK Verkehr", "insurance_number": "BKK789012"},
]

ZWEISER = [
    {"title": "Dr. med.", "first_name": "Klaus", "last_name": "Wagner", "specialization": "Orthopädie", "practice_name": "MVZ Orthopädie Zentrum", "phone": "030 123456", "email": "wagner@ortho-mvz.de"},
    {"title": "Dr. med.", "first_name": "Stefanie", "last_name": "Krause", "specialization": "Neurologie", "practice_name": "Praxis Dr. Krause", "phone": "030 234567", "email": "krause@neurologie-berlin.de"},
    {"title": "Dr. med.", "first_name": "Andreas", "last_name": "Becker", "specialization": "Unfallchirurgie", "practice_name": "Chirurgische Gemeinschaftspraxis", "phone": "030 345678"},
]

RECORD_TITLES = [
    "Erstbefund LWS", "Kontrollbefund Knie", "Anamnese Hüfte", "Behandlungsbericht Schulter", "Verlaufsdokumentation"
]

SOAP_SUBJECTIVE = "Patient berichtet über Schmerzen seit 2 Wochen. Zunahme bei Belastung."
SOAP_OBJECTIVE = "Einschränkung der Beweglichkeit, Druckschmerz palpatorisch."
SOAP_ASSESSMENT = "Verdacht auf muskulo-skelettale Dysfunktion."
SOAP_PLAN = "Manuelle Therapie 6x, Eigenübungen, Wiedervorstellung in 2 Wochen."

TRAINING_TITLES = ["Rückenschule", "Kräftigung Knie", "Mobilisation Hüfte", "Schulterstabilisation"]
TRAINING_CONTENT = """## Übung 1: Dehnung
- 3x 30 Sekunden halten
- Atmung ruhig halten

## Übung 2: Kräftigung
- 2 Sätze à 15 Wiederholungen
- Pause 60 Sekunden zwischen Sätzen"""

RECALL_REASONS = ["Kontrolltermin", "Verlaufsprüfung", "Nachbehandlung", "Rezeptausstellung"]
SERVICE_CODES = ["KG", "MT", "PNF", "KG-Gerät", "Massage"]
TREATMENT_NOTES = ["Gut toleriert.", "Leichte Besserung.", "Übungen demonstriert.", "Hausaufgaben mitgegeben."]


async def seed():
    async with AsyncSessionLocal() as db:
        # Rollen
        for rid, rname in [("admin", "Administrator"), ("therapeut", "Therapeut"), ("assistent", "Assistent")]:
            if await db.get(Role, rid) is None:
                db.add(Role(id=rid, name=rname, description="Voller Zugriff" if rid == "admin" else None))
        await db.flush()

        # Leistungskatalog (EBM/Heilmittel)
        existing_services = (await db.execute(select(ServiceCatalog))).scalars().all()
        if len(existing_services) < 5:
            for s in SERVICE_CATALOG:
                exists = (await db.execute(select(ServiceCatalog).where(ServiceCatalog.code == s["code"]))).scalar_one_or_none()
                if not exists:
                    db.add(ServiceCatalog(
                        code=s["code"],
                        name=s["name"],
                        description=s.get("description"),
                        default_duration_min=s.get("default_duration_min"),
                        amount_eur=s.get("amount_eur"),
                        is_active=True,
                    ))
            await db.flush()

        # Benutzer
        admin = (await db.execute(select(User).where(User.email == "admin@example.com"))).scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                display_name="Administrator",
                is_active=True,
            )
            db.add(admin)
            await db.flush()
            db.add(UserRole(user_id=admin.id, role_id="admin"))

        therapeut = (await db.execute(select(User).where(User.email == "therapeut@brophysio.de"))).scalar_one_or_none()
        if not therapeut:
            therapeut = User(
                email="therapeut@brophysio.de",
                password_hash=get_password_hash("therapeut123"),
                display_name="Sarah Schneider",
                is_active=True,
            )
            db.add(therapeut)
            await db.flush()
            db.add(UserRole(user_id=therapeut.id, role_id="therapeut"))

        # Patienten
        existing = (await db.execute(select(Patient))).scalars().all()
        if len(existing) < 3:
            for p in PATIENTS:
                pt = Patient(
                    first_name=p["first_name"],
                    last_name=p["last_name"],
                    date_of_birth=date.fromisoformat(p["date_of_birth"]) if p.get("date_of_birth") else None,
                    gender=p.get("gender"),
                    email=p.get("email"),
                    phone=p.get("phone"),
                    insurance_type=p.get("insurance_type"),
                    insurance_name=p.get("insurance_name"),
                    insurance_number=p.get("insurance_number"),
                )
                db.add(pt)
            await db.flush()

        # Zuweiser
        existing_z = (await db.execute(select(Zuweiser))).scalars().all()
        if len(existing_z) < 2:
            for z in ZWEISER:
                zw = Zuweiser(**z, is_active=True)
                db.add(zw)
            await db.flush()

        patients = (await db.execute(select(Patient))).scalars().all()
        if not patients:
            print("Keine Patienten – Seed admin zuerst ausführen.")
            await db.commit()
            return

        # Akten (Records)
        existing_r = (await db.execute(select(Record))).scalars().all()
        if len(existing_r) < 3:
            for i, pt in enumerate(patients[:5]):
                for j in range(2):
                    r = Record(
                        patient_id=pt.id,
                        title=RECORD_TITLES[(i + j) % len(RECORD_TITLES)],
                        record_type="soap",
                        subjective=SOAP_SUBJECTIVE,
                        objective=SOAP_OBJECTIVE,
                        assessment=SOAP_ASSESSMENT,
                        plan=SOAP_PLAN,
                        created_by=admin.id,
                    )
                    db.add(r)
            await db.flush()

        # Transkripte (mit sinnvollem raw_text, ohne echtes Audio)
        existing_t = (await db.execute(select(Transcript))).scalars().all()
        if len(existing_t) < 3:
            raw_sample = "Patient klagt über Rückenschmerzen. Seit zwei Wochen bestehend. Besserung in Ruhe. Keine Neurologie."
            soap_sample = {"subjective": "Rückenschmerzen", "objective": "BWS eingeschränkt", "assessment": "Muskulär", "plan": "MT"}
            for i, pt in enumerate(patients[:4]):
                t = Transcript(
                    patient_id=pt.id,
                    audio_path=None,
                    raw_text=raw_sample,
                    soap_json=soap_sample,
                    status="completed",
                    created_by=admin.id,
                )
                db.add(t)
            await db.flush()

        # Trainingspläne
        existing_tp = (await db.execute(select(TrainingPlan))).scalars().all()
        if len(existing_tp) < 3:
            for i, pt in enumerate(patients[:4]):
                tp = TrainingPlan(
                    patient_id=pt.id,
                    title=TRAINING_TITLES[i % len(TRAINING_TITLES)],
                    description="Individueller Übungsplan für zu Hause",
                    content=TRAINING_CONTENT,
                    is_template=False,
                    created_by=admin.id,
                )
                db.add(tp)
            # Vorlage ohne Patient
            tpl = TrainingPlan(
                patient_id=None,
                title="Standard Rückentraining",
                description="Allgemeine Übungen für den Rücken",
                content=TRAINING_CONTENT,
                is_template=True,
                created_by=admin.id,
            )
            db.add(tpl)
            await db.flush()

        # Wiedervorstellungen
        existing_rc = (await db.execute(select(Recall))).scalars().all()
        if len(existing_rc) < 3:
            today = date.today()
            for i, pt in enumerate(patients[:5]):
                rc = Recall(
                    patient_id=pt.id,
                    recall_date=today + timedelta(days=7 + i * 3),
                    reason=RECALL_REASONS[i % len(RECALL_REASONS)],
                    notes="Rezept mitbringen" if i % 2 == 0 else None,
                    notified=i < 2,
                    completed=False,
                )
                db.add(rc)
                rc2 = Recall(
                    patient_id=pt.id,
                    recall_date=today - timedelta(days=5),
                    reason="Kontrolltermin",
                    completed=True,
                )
                db.add(rc2)
            await db.flush()

        # Verordnungen
        zuweiser_list = (await db.execute(select(Zuweiser))).scalars().all()
        existing_pr = (await db.execute(select(Prescription))).scalars().all()
        if len(existing_pr) < 2 and zuweiser_list:
            for i, pt in enumerate(patients[:3]):
                pr = Prescription(
                    patient_id=pt.id,
                    zuweiser_id=zuweiser_list[i % len(zuweiser_list)].id,
                    prescription_date=today - timedelta(days=14),
                    valid_until=today + timedelta(days=70),
                    diagnosis_code="M54.5" if i % 2 == 0 else "M25.5",
                    prescription_number=f"REZ-2025-{1000 + i}",
                    status="active",
                )
                db.add(pr)
                await db.flush()
                for svc in [{"code": "KG", "qty": 6}, {"code": "MT", "qty": 6}]:
                    db.add(PrescriptionItem(prescription_id=pr.id, service_code=svc["code"], quantity=svc["qty"]))
            await db.flush()

        prescriptions_list = (await db.execute(select(Prescription))).scalars().all()

        # Behandlungsprotokolle
        existing_tl = (await db.execute(select(TreatmentLog))).scalars().all()
        if len(existing_tl) < 5:
            for i, pt in enumerate(patients[:6]):
                pr_id = prescriptions_list[i % len(prescriptions_list)].id if prescriptions_list else None
                for j in range(2):
                    tl = TreatmentLog(
                        patient_id=pt.id,
                        treatment_date=today - timedelta(days=j * 7 + i),
                        service_code=SERVICE_CODES[(i + j) % len(SERVICE_CODES)],
                        prescription_id=pr_id if j == 0 else None,
                        duration_minutes=30,
                        note=TREATMENT_NOTES[(i + j) % len(TREATMENT_NOTES)],
                        created_by=therapeut.id,
                    )
                    db.add(tl)
            await db.flush()

        # Ganganalyse-Sessions (ohne Video, mit Beispieldaten)
        existing_m = (await db.execute(select(MovementSession))).scalars().all()
        if len(existing_m) < 3:
            metrics_sample = {
                "step_count": 24,
                "cadence": 108.5,
                "symmetry_index": 4.2,
                "has_asymmetry": False,
                "step_length_left": 68.2,
                "step_length_right": 66.1,
                "stride_length": 134.3,
                "swing_phase_left": 38.5,
                "swing_phase_right": 38.2,
                "stance_phase_left": 61.5,
                "stance_phase_right": 61.8,
                "max_knee_flexion": 62.1,
            }
            summary = "Unauffälliges Gangbild. Leichte Asymmetrie der Schrittlänge innerhalb der Norm."
            for i, pt in enumerate(patients[:4]):
                m = MovementSession(
                    patient_id=pt.id,
                    session_type="gait",
                    capture_mode="single",
                    status="completed",
                    metrics_json=metrics_sample,
                    clinical_summary=summary,
                    fps=30,
                    frame_count=450,
                    notes=f"Ganganalyse {pt.last_name}",
                )
                db.add(m)
            await db.flush()

        # Termin-System: Therapeuten, Räume, Slots, Buchungen
        therapists = (await db.execute(select(Therapist))).scalars().all()
        if not therapists:
            t1 = Therapist(name="Sarah Schneider", email="sarah@brophysio.de", specialization="Physiotherapeutin", is_active=True)
            t2 = Therapist(name="Markus Vogel", email="markus@brophysio.de", specialization="Sportphysiotherapeut", is_active=True)
            db.add(t1)
            db.add(t2)
            await db.flush()
            therapists = [t1, t2]

        rooms = (await db.execute(select(Room))).scalars().all()
        if not rooms:
            r1 = Room(name="Behandlungsraum 1", description="mit Fango")
            r2 = Room(name="Behandlungsraum 2", description="mit Geräten")
            db.add(r1)
            db.add(r2)
            await db.flush()
            rooms = [r1, r2]

        slots = (await db.execute(select(AppointmentSlot))).scalars().all()
        if len(slots) < 5:
            base = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
            created_slots = []
            for day in range(5):
                for h in [9, 10, 11, 14, 15]:
                    st = base + timedelta(days=day, hours=h - 9)
                    et = st + timedelta(minutes=30)
                    slot = AppointmentSlot(
                        therapist_id=therapists[day % 2].id,
                        room_id=rooms[day % 2].id,
                        start_time=st,
                        end_time=et,
                        is_booked=False,
                    )
                    db.add(slot)
                    created_slots.append(slot)
            await db.flush()

            # Einige Buchungen für die ersten Slots
            for i, slot in enumerate(created_slots[:4]):
                pt = patients[i % len(patients)]
                appt = Appointment(
                    slot_id=slot.id,
                    patient_id=pt.id,
                    patient_name=f"{pt.first_name} {pt.last_name}",
                    patient_email=pt.email or "patient@example.de",
                    patient_phone=pt.phone or "0151 0000000",
                    reason="Rückenschmerzen",
                    status="confirmed",
                )
                db.add(appt)
                slot.is_booked = True
            await db.flush()

        # Online-Buchung Konfiguration
        config = (await db.execute(select(OnlineBookingConfig).limit(1))).scalar_one_or_none()
        if not config:
            cfg = OnlineBookingConfig(is_enabled=True, ai_chat_enabled=True)
            db.add(cfg)
            await db.flush()

        # App-Einstellungen
        llm = (await db.execute(select(AppSetting).where(AppSetting.key == "llm_provider"))).scalar_one_or_none()
        if not llm:
            db.add(AppSetting(key="llm_provider", value="ollama"))
            db.add(AppSetting(key="llm_model", value="llama3.2"))
            await db.flush()

        await db.commit()
        print("Demo-Daten erfolgreich angelegt.")
        print("Login: admin@example.com / admin123")
        print("Therapeut: therapeut@brophysio.de / therapeut123")


if __name__ == "__main__":
    asyncio.run(seed())
