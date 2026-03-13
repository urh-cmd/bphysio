# Online-Buchungssystem für BroPhysio

## Übersicht

Das Online-Buchungssystem ermöglicht Patienten die Terminbuchung ohne Login.

## Features

- **Öffentliche Buchungsseite**: `/buchen` - Kein Login erforderlich
- **KI-Chat-Assistent**: Natürliche Spracheingabe für Terminfindung
- **Kalender-Ansicht**: Wochenansicht mit verfügbaren Slots
- **Echtzeit-Verfügbarkeit**: Zeigt nur freie Termine an
- **Buchungsbestätigung**: Mit E-Mail-Benachrichtigung

## API-Endpunkte

### Öffentliche Endpunkte (kein Auth)

- `GET /api/appointments/config` - Buchungskonfiguration
- `GET /api/appointments/slots` - Verfügbare Termine
- `POST /api/appointments/book` - Termin buchen
- `POST /api/appointments/chat` - KI-Chat für Terminfindung
- `GET /api/appointments/therapists` - Liste der Therapeuten

### Admin-Endpunkte (mit Auth)

- `POST /api/appointments/admin/slots/generate` - Slots generieren

## Datenbank-Models

### Therapist
- id, name, email, phone, specialization
- availability_json (Wochenplan)

### Room
- id, name, description, resources

### AppointmentSlot
- id, therapist_id, room_id
- start_time, end_time
- is_booked, slot_type

### Appointment
- id, slot_id, patient_id (optional)
- patient_name, patient_email, patient_phone
- reason, notes, status

### OnlineBookingConfig
- is_enabled, min_advance_hours, max_advance_days
- ai_chat_enabled, ai_provider, ai_model
- business_hours_json

## Frontend-Komponenten

- `OnlineBooking.tsx` - Hauptkomponente mit Step-Workflow
- `AIChat.tsx` - KI-Assistent für natürliche Dialoge
- `SlotCalendar.tsx` - Kalender-Ansicht mit Slots
- `BookingForm.tsx` - Patientendaten-Formular
- `BookingConfirmation.tsx` - Bestätigungsseite

## Workflow

1. **Chat** (optional): Patient beschreibt Anliegen → KI schlägt Termine vor
2. **Kalender**: Patient wählt Tag und Zeit
3. **Formular**: Patient gibt Kontaktdaten ein
4. **Bestätigung**: Buchung wird erstellt, E-Mail wird gesendet

## KI-Integration

Unterstützte Provider:
- Ollama (lokal, empfohlen für Datenschutz)
- OpenAI (GPT-4o-mini)
- Anthropic (Claude)
- NVIDIA NIM (Kimi K2.5)

Konfiguration über `OnlineBookingConfig` in der Datenbank.

## Setup

1. Datenbank-Migrationen ausführen (Models sind erstellt)
2. Therapeuten und Räume in der Datenbank anlegen
3. Slots generieren (Admin-Endpunkt)
4. KI-Provider konfigurieren (optional)

## Nächste Schritte

- [ ] E-Mail-Versand für Bestätigungen implementieren
- [ ] Terminerinnerungen (24h vorher) einrichten
- [ ] Stornierungslink in E-Mail
- [ ] Warteliste für ausgebuchte Termine
- [ ] ICS-Kalender-Export für Patienten
