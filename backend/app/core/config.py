"""Application configuration."""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    """BroPhysio settings."""

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "BroPhysio"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://bpyhsio:bpyhsio_local@localhost:5432/bpyhsio"

    # Auth
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Storage
    UPLOAD_DIR: str = "data/uploads"
    PROCESSED_DIR: str = "data/processed"

    # KI / LLM
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OPENAI_API_KEY: str | None = None
    NVIDIA_API_KEY: str | None = None

    # Transkription
    # Provider: "faster_whisper" (lokal, kostenlos) | "openai" (API, Abo)
    TRANSCRIPTION_PROVIDER: str = "faster_whisper"
    # faster-whisper: tiny, base, small, medium, large-v2, large-v3 (größer = genauer, langsamer)
    FASTER_WHISPER_MODEL: str = "small"
    # cpu | cuda | auto (auto = CUDA wenn verfügbar, sonst CPU)
    FASTER_WHISPER_DEVICE: str = "auto"

    # CORS
    CORS_ORIGINS: list[str] = [
        *[f"http://localhost:{p}" for p in range(3000, 3010)],
        *[f"http://127.0.0.1:{p}" for p in range(3000, 3010)],
    ]


settings = Settings()
