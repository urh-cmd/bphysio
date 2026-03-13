"""Authentication API."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DbSession, get_current_user_id_required
from app.core.security import create_access_token, get_password_hash, verify_password
from pydantic import BaseModel, EmailStr

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    roles: list[str] = []


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DbSession):
    """Login – returns JWT. For Meilenstein 1: create admin if not exists."""
    from sqlalchemy import select
    from app.models.user import User

    result = await db.execute(
        select(User).where(User.email == data.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige Anmeldedaten",
        )
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(db: DbSession, user_id: str = Depends(get_current_user_id_required)):
    """Current user info inkl. Rollen."""
    from sqlalchemy import select
    from app.models.user import User, UserRole

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    await db.refresh(user, ["roles"])
    roles = [ur.role_id for ur in user.roles]
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name or user.email,
        roles=roles,
    )
