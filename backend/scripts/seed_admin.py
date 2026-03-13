"""Seed admin user. Run: python -m scripts.seed_admin"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import Role, User, UserRole


async def seed():
    async with AsyncSessionLocal() as db:
        # Rollen anlegen
        for rid, rname in [("admin", "Administrator"), ("therapeut", "Therapeut"), ("assistent", "Assistent")]:
            role = await db.get(Role, rid)
            if not role:
                role = Role(id=rid, name=rname, description="Voller Zugriff" if rid == "admin" else None)
                db.add(role)
        await db.flush()

        # Admin user (admin@example.com / admin123)
        from sqlalchemy import select

        result = await db.execute(
            select(User).where(User.email == "admin@example.com")
        )
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                display_name="Administrator",
                is_active=True,
            )
            db.add(user)
            await db.flush()
            user_role = UserRole(user_id=user.id, role_id="admin")
            db.add(user_role)

        await db.commit()
        print("Admin user ready: admin@example.com / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
