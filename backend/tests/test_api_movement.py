"""Tests für Movement-API."""

import inspect
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.api import movement


@pytest.mark.asyncio
async def test_upload_requires_auth():
    """Upload ohne Token liefert 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test.mp4", b"fake", "video/mp4")}
        r = await client.post("/api/movement/upload", files=files)
    assert r.status_code == 401


def test_upload_has_patient_id_param():
    """Upload-Endpoint hat patient_id Parameter für Form."""
    sig = inspect.signature(movement.upload_video)
    assert "patient_id" in sig.parameters
