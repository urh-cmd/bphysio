"""AI service for online booking chat and other AI features."""

import os
from typing import Optional
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    async def chat_completion(
        self, 
        system_prompt: str, 
        user_message: str, 
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """Generate a chat completion."""
        pass


class OllamaProvider(LLMProvider):
    """Ollama local LLM provider."""
    
    def __init__(self, model: str = "llama3.2", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
    
    async def chat_completion(
        self, 
        system_prompt: str, 
        user_message: str, 
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required: pip install openai")
        
        client = OpenAI(base_url=f"{self.base_url}/v1", api_key="ollama")
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        resp = client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""


class OpenAIProvider(LLMProvider):
    """OpenAI API provider."""
    
    def __init__(self, model: str = "gpt-4o-mini", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key required")
    
    async def chat_completion(
        self, 
        system_prompt: str, 
        user_message: str, 
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required: pip install openai")
        
        client = OpenAI(api_key=self.api_key)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        resp = client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider."""
    
    def __init__(self, model: str = "claude-3-5-sonnet-20241022", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key required")
    
    async def chat_completion(
        self, 
        system_prompt: str, 
        user_message: str, 
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        try:
            from anthropic import Anthropic
        except ImportError:
            raise ImportError("anthropic package required: pip install anthropic")
        
        client = Anthropic(api_key=self.api_key)
        
        resp = client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return resp.content[0].text if resp.content else ""


class NvidiaNIMProvider(LLMProvider):
    """NVIDIA NIM provider (e.g., Kimi K2.5)."""
    
    def __init__(self, model: str = "moonshotai/kimi-k2.5", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        if not self.api_key:
            raise ValueError("NVIDIA API key required")
    
    async def chat_completion(
        self, 
        system_prompt: str, 
        user_message: str, 
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required: pip install openai")
        
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=self.api_key,
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        resp = client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""


def get_llm_provider(provider: str = "ollama", model: Optional[str] = None) -> LLMProvider:
    """Factory function to get the appropriate LLM provider."""
    
    providers = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "nvidia_nim": NvidiaNIMProvider,
    }
    
    if provider not in providers:
        raise ValueError(f"Unknown provider: {provider}. Available: {list(providers.keys())}")
    
    provider_class = providers[provider]
    
    if provider == "ollama":
        return provider_class(model=model or "llama3.2")
    elif provider == "openai":
        return provider_class(model=model or "gpt-4o-mini")
    elif provider == "anthropic":
        return provider_class(model=model or "claude-3-5-sonnet-20241022")
    elif provider == "nvidia_nim":
        return provider_class(model=model or "moonshotai/kimi-k2.5")
    
    return provider_class()
