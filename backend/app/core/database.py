"""Database connection and session."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine

from app.core.config import settings


def _sync_database_url() -> str:
    """Sync DB-URL für Thread-Updates (psycopg2 statt asyncpg)."""
    url = settings.DATABASE_URL
    if "+asyncpg" in url:
        return url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)
    if url.startswith("postgresql://") or url.startswith("postgresql:"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1).replace("postgresql:", "postgresql+psycopg2:", 1)
    return url


_sync_engine = None


def get_sync_engine():
    """Sync Engine für Thread-seitige DB-Updates."""
    global _sync_engine
    if _sync_engine is None:
        _sync_engine = create_engine(_sync_database_url(), pool_pre_ping=True)
    return _sync_engine


def update_progress_sync(table: str, id_column: str, entity_id: str, percent: int) -> None:
    """Thread-sicher: progress_percent in DB setzen."""
    with get_sync_engine().connect() as conn:
        conn.execute(text(f"UPDATE {table} SET progress_percent = :p WHERE {id_column} = :id"), {"p": percent, "id": entity_id})
        conn.commit()


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""

    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """Dependency for async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
