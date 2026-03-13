"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health():
    """Liveness check."""
    return {"status": "ok", "app": "BroPhysio"}


@router.get("/ready")
async def ready():
    """Readiness check – DB connectivity (optional)."""
    return {"status": "ready"}
