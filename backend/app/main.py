"""
BroPhysio – FastAPI Backend
"""

import logging
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, app_settings, billing, health, llm, movement, patients, appointments, prescriptions, records, transcripts, training_plans, zuweiser, recall, treatment_log
from app.core.config import settings

logger = logging.getLogger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Loggt unerwartete Fehler und gibt strukturierte JSON-Antwort zurück. HTTPException wird nicht abgefangen."""
    if isinstance(exc, HTTPException):
        raise exc
    tb = traceback.format_exc()
    logger.error("Unhandled exception: %s\n%s", exc, tb)
    print(f"\n[ERROR] {exc}\n{tb}", flush=True)
    detail = str(exc) if settings.DEBUG else "Interner Serverfehler. Backend-Logs prüfen."
    return JSONResponse(status_code=500, content={"detail": detail})


app = FastAPI(
    title="BroPhysio API",
    description="Physiotherapie-Praxis-Software API",
    version="0.1.0",
)

app.add_exception_handler(Exception, global_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(transcripts.router, prefix="/api/transcripts", tags=["transcripts"])
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])
app.include_router(app_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(training_plans.router, prefix="/api/training-plans", tags=["training-plans"])
app.include_router(zuweiser.router, prefix="/api/zuweiser", tags=["zuweiser"])
app.include_router(recall.router, prefix="/api/recalls", tags=["recall"])
app.include_router(treatment_log.router, prefix="/api/treatment-logs", tags=["treatment-log"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(prescriptions.router, prefix="/api/prescriptions", tags=["prescriptions"])
app.include_router(movement.router, prefix="/api/movement", tags=["movement"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
