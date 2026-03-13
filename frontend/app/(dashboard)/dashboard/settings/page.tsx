"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Settings, Loader2, Check } from "lucide-react";

type SettingsData = {
  llm_provider: string;
  llm_model: string;
  openai_api_key: string;
  nvidia_api_key: string;
  openai_configured: boolean;
  nvidia_configured: boolean;
};

const PROVIDER_MODELS: Record<string, string[]> = {
  ollama: ["llama3.2", "llama3.1", "mistral", "codellama", "gemma2"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  nvidia: ["moonshotai/kimi-k2.5"],
};

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  nvidia: "NVIDIA Kimi K2.5",
};

export default function SettingsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SettingsData>({
    llm_provider: "ollama",
    llm_model: "llama3.2",
    openai_api_key: "",
    nvidia_api_key: "",
    openai_configured: false,
    nvidia_configured: false,
  });
  const [form, setForm] = useState({
    llm_provider: "ollama",
    llm_model: "llama3.2",
    openai_api_key: "",
    nvidia_api_key: "",
  });

  useEffect(() => {
    if (!token) return;
    api<SettingsData>("/api/settings", { token })
      .then((r) => {
        setData(r);
        setForm({
          llm_provider: r.llm_provider,
          llm_model: r.llm_model,
          openai_api_key: "",
          nvidia_api_key: "",
        });
      })
      .catch(() => setError("Einstellungen konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleProviderChange = (p: string) => {
    const models = PROVIDER_MODELS[p] ?? ["llama3.2"];
    setForm((prev) => ({
      ...prev,
      llm_provider: p,
      llm_model: models[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const body: Record<string, string> = {
        llm_provider: form.llm_provider,
        llm_model: form.llm_model,
      };
      if (form.openai_api_key.trim()) body.openai_api_key = form.openai_api_key.trim();
      if (form.nvidia_api_key.trim()) body.nvidia_api_key = form.nvidia_api_key.trim();

      const updated = await api<SettingsData>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
        token: token!,
      });
      setData(updated);
      setForm((prev) => ({ ...prev, openai_api_key: "", nvidia_api_key: "" }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-800">
        <Settings className="h-7 w-7" />
        Einstellungen
      </h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            LLM (KI-Modell)
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Standard-Provider und Modell für SOAP-Strukturierung, Transkription und weitere KI-Funktionen.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Provider</label>
              <select
                value={form.llm_provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Modell</label>
              <select
                value={form.llm_model}
                onChange={(e) => setForm((p) => ({ ...p, llm_model: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {(PROVIDER_MODELS[form.llm_provider] ?? []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            API-Keys
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Keys werden verschlüsselt gespeichert. Nur eingeben, wenn Sie den Key ändern möchten.
            {data.openai_configured && (
              <span className="mt-1 block text-green-600">OpenAI-Key ist hinterlegt.</span>
            )}
            {data.nvidia_configured && (
              <span className="mt-1 block text-green-600">NVIDIA-Key ist hinterlegt.</span>
            )}
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                OpenAI API-Key (sk-…)
              </label>
              <input
                type="password"
                value={form.openai_api_key}
                onChange={(e) => setForm((p) => ({ ...p, openai_api_key: e.target.value }))}
                placeholder={data.openai_configured ? "•••••••• (leer lassen = behalten)" : "sk-…"}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                NVIDIA API-Key (nvapi-…)
              </label>
              <input
                type="password"
                value={form.nvidia_api_key}
                onChange={(e) => setForm((p) => ({ ...p, nvidia_api_key: e.target.value }))}
                placeholder={data.nvidia_configured ? "•••••••• (leer lassen = behalten)" : "nvapi-…"}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-4 text-sm text-green-700">
            <Check className="h-5 w-5" />
            Einstellungen gespeichert.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Speichern
        </button>
      </form>
    </div>
  );
}
