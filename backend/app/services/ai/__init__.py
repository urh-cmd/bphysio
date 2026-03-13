"""
BroPhysio – Multi-LLM-Provider (Ollama, OpenAI, Claude, NVIDIA NIM).
"""

from app.services.ai.router import get_llm_provider

__all__ = ["get_llm_provider"]
