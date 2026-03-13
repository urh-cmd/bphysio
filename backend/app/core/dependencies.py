"""FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import UserRole

security = HTTPBearer(auto_error=False)

# Type alias for DB session
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_user_roles(db: AsyncSession, user_id: str) -> list[str]:
    """Rollen eines Benutzers aus DB laden."""
    result = await db.execute(
        select(UserRole.role_id).where(UserRole.user_id == user_id)
    )
    return [r for r in result.scalars().all()]


async def get_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security)
    ] = None,
) -> str | None:
    """Extract user id from JWT. Returns None if no/invalid token."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return payload.get("sub")


async def get_current_user_id_required(
    user_id: str | None = Depends(get_current_user_id),
) -> str:
    """Require authenticated user."""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht authentifiziert",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


def require_roles(*allowed_roles: str):
    """Dependency: Erfordert mindestens eine der angegebenen Rollen."""

    async def _check(
        db: DbSession,
        user_id: str = Depends(get_current_user_id_required),
    ) -> str:
        roles = await get_user_roles(db, user_id)
        if any(r in allowed_roles for r in roles):
            return user_id
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Keine Berechtigung für diese Aktion",
        )

    return _check


# Nur Admin/Therapeut dürfen löschen
RequireDeleteRole = Annotated[
    str, Depends(require_roles("admin", "therapeut"))
]
