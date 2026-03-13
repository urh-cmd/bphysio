"""
BroPhysio - Transkription Service
==================================
Audio → Text via faster-whisper (lokal, Open-Source) oder OpenAI Whisper API.

- faster_whisper: Läuft lokal, keine API-Kosten, gleiche Whisper-Modelle
- openai: Cloud-API, erfordert OPENAI_API_KEY und Abo
"""

from pathlib import Path
from typing import Callable

from app.core.config import settings

# Cache für faster-whisper Modell (nur einmal laden)
_faster_whisper_model = None


def _get_faster_whisper_model():
    """Lazy-Load des faster-whisper Modells."""
    global _faster_whisper_model
    if _faster_whisper_model is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as e:
            raise ImportError(
                "faster-whisper benötigt: pip install faster-whisper"
            ) from e
        device = (settings.FASTER_WHISPER_DEVICE or "cpu").strip().lower()
        if device == "auto":
            try:
                import ctranslate2
                count = getattr(ctranslate2, "get_cuda_device_count", lambda: 0)()
                device = "cuda" if count and count > 0 else "cpu"
            except Exception:
                device = "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        try:
            _faster_whisper_model = WhisperModel(
                settings.FASTER_WHISPER_MODEL,
                device=device,
                compute_type=compute_type,
            )
        except (RuntimeError, OSError) as e:
            err_lower = str(e).lower()
            if device == "cuda" or any(x in err_lower for x in ("cublas", "cuda", "cudnn", ".dll")):
                # CUDA-Bibliotheken fehlen (z.B. cublas64_12.dll) → Fallback auf CPU
                _faster_whisper_model = WhisperModel(
                    settings.FASTER_WHISPER_MODEL,
                    device="cpu",
                    compute_type="int8",
                )
            else:
                raise
    return _faster_whisper_model


def _ensure_wav(audio_path: Path) -> Path:
    """Konvertiert zu WAV 16kHz mono – optimale Qualität für Whisper."""
    path = Path(audio_path).resolve()
    try:
        from pydub import AudioSegment
        ext = path.suffix.lower()
        if ext in (".webm", ".ogg", ".mp4", ".m4a", ".mp3", ".wav"):
            wav_path = path.with_suffix(".converted.wav")
            if not wav_path.exists() or wav_path.stat().st_mtime < path.stat().st_mtime:
                seg = AudioSegment.from_file(str(path), ext.lstrip(".") or None)
                # 16 kHz mono = Whisper-Spezifikation, bessere Erkennung
                seg = seg.set_frame_rate(16000).set_channels(1)
                seg.export(str(wav_path), format="wav")
            return wav_path
    except Exception:
        pass
    return path


def _transcribe_faster_whisper(
    audio_path: Path,
    progress_callback: Callable[[int, int], None] | None = None,
) -> str:
    """Transkription via faster-whisper (lokal, kostenlos)."""
    path = Path(audio_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Audio-Datei nicht gefunden: {path}")
    wav_path = _ensure_wav(path)
    model = _get_faster_whisper_model()
    segments, info = model.transcribe(
        str(wav_path),
        language="de",
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=300),
    )
    total_duration = getattr(info, "duration", None) or 1.0
    texts = []
    last_end = 0.0
    for seg in segments:
        if seg.text:
            texts.append(seg.text)
        if progress_callback and total_duration > 0:
            pct = min(90, int(100 * (seg.end or last_end) / total_duration))
            progress_callback(pct, 100)
        last_end = seg.end if seg.end is not None else last_end
    return " ".join(texts).strip()


def _transcribe_openai(audio_path: Path) -> str:
    """Transkription via OpenAI Whisper API (Cloud, Abo)."""
    try:
        from openai import OpenAI
    except ImportError as err:
        raise ImportError("openai package benötigt: pip install openai") from err

    if not settings.OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY nicht gesetzt. "
            "Für Cloud-Transkription in .env hinzufügen oder "
            "TRANSCRIPTION_PROVIDER=faster_whisper nutzen (lokal, kostenlos)."
        )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    with open(audio_path, "rb") as f:
        resp = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="de",
        )
    return resp.text or ""


def transcribe_audio(
    audio_path: str | Path,
    progress_callback: Callable[[int, int], None] | None = None,
) -> str:
    """
    Transkribiert Audio-Datei zu Text.

    Provider aus TRANSCRIPTION_PROVIDER in .env:
    - faster_whisper (Standard): Lokal, kostenlos, keine API nötig
    - openai: Cloud-API, erfordert OPENAI_API_KEY
    """
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio-Datei nicht gefunden: {path}")

    provider = (settings.TRANSCRIPTION_PROVIDER or "faster_whisper").strip().lower()
    api_key = (settings.OPENAI_API_KEY or "").strip()

    if provider == "openai" and api_key and api_key.lower() not in ("none", "null", "false"):
        return _transcribe_openai(path)
    return _transcribe_faster_whisper(path, progress_callback=progress_callback)
