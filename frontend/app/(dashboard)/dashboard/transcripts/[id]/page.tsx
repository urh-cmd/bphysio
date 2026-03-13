"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Transcript, Patient } from "@/lib/api";
import { ArrowLeft, Mic, Loader2, FileText, Plus, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function TranscriptDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [soapProvider, setSoapProvider] = useState("nvidia");
  const [soapModel, setSoapModel] = useState("llama3.2");
  const [llmProviders, setLlmProviders] = useState<{ id: string; label: string; models: string[]; available: boolean }[]>([
    { id: "ollama", label: "Ollama", models: ["llama3.2", "llama3.1", "mistral"], available: true },
    { id: "openai", label: "OpenAI", models: ["gpt-4o-mini", "gpt-4o"], available: false },
    { id: "nvidia", label: "NVIDIA Kimi K2.5", models: ["moonshotai/kimi-k2.5"], available: false },
  ]);

  useEffect(() => {
    if (!token || !id) return;
    api<Transcript>(`/api/transcripts/${id}`, { token })
      .then((t) => {
        setTranscript(t);
        if (t.patient_id) {
          api<Patient>(`/api/patients/${t.patient_id}`, { token })
            .then(setPatient)
            .catch(() => setPatient(null));
        }
      })
      .catch(() => setTranscript(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    api<{
      providers: { id: string; label: string; models: string[]; available: boolean }[];
      default_provider?: string;
      default_model?: string;
    }>("/api/llm/providers", { token })
      .then((r) => {
        setLlmProviders(r.providers);
        setSoapProvider(r.default_provider ?? "nvidia");
        setSoapModel(r.default_model ?? "llama3.2");
      })
      .catch(() => {});
  }, [token]);

  const handleStructureSoap = async () => {
    if (!token || !transcript) return;
    setStructuring(true);
    setStructureError(null);
    try {
      const updated = await api<Transcript>(`/api/transcripts/${id}/structure-soap`, {
        method: "POST",
        body: JSON.stringify({ provider: soapProvider, model: soapModel }),
        token,
      });
      setTranscript(updated);
    } catch (e) {
      setStructureError(e instanceof Error ? e.message : "SOAP-Strukturierung fehlgeschlagen.");
      const t = await api<Transcript>(`/api/transcripts/${id}`, { token }).catch(() => null);
      if (t) setTranscript(t);
    } finally {
      setStructuring(false);
    }
  };

  const currentProviderModels = llmProviders.find((p) => p.id === soapProvider)?.models ?? [];
  const onProviderChange = (p: string) => {
    setSoapProvider(p);
    const prov = llmProviders.find((x) => x.id === p);
    setSoapModel(prov?.models[0] ?? "llama3.2");
  };

  const handleCreateRecord = async () => {
    if (!token || !transcript) return;
    setCreatingRecord(true);
    try {
      const res = await api<{ id: string }>(`/api/transcripts/${id}/create-record`, {
        method: "POST",
        body: JSON.stringify({}),
        token,
      });
      window.location.href = `/dashboard/records/${res.id}`;
    } catch {
      setCreatingRecord(false);
    }
  };

  const handleProcess = async () => {
    if (!token || !transcript) return;
    setProcessing(true);
    try {
      const updated = await api<Transcript>(`/api/transcripts/${id}/process`, {
        method: "POST",
        token,
      });
      setTranscript(updated);
    } catch {
      // Reload
      const t = await api<Transcript>(`/api/transcripts/${id}`, { token });
      setTranscript(t);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Transkript wirklich unwiderruflich löschen?")) return;
    setDeleting(true);
    try {
      await api(`/api/transcripts/${id}`, { method: "DELETE", token: token! });
      router.push("/dashboard/transcripts");
    } catch {
      setStructureError("Löschen fehlgeschlagen");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!transcript) {
    return (
      <div>
        <p className="text-slate-600">Transkript nicht gefunden.</p>
        <Link href="/dashboard/transcripts" className="mt-4 text-primary-600 hover:underline">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/transcripts"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Transkript</h1>
        {canDelete(user?.roles) && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Löscht…" : "Löschen"}
          </button>
        )}
      </div>

      {patient && (
        <p className="mb-4 text-sm text-slate-600">
          Patient:{" "}
          <Link
            href={`/dashboard/patients/${patient.id}`}
            className="text-primary-600 hover:underline"
          >
            {patient.last_name}, {patient.first_name}
          </Link>
        </p>
      )}

      <div className="mb-4 flex items-center gap-4">
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            transcript.status === "completed"
              ? "bg-green-100 text-green-800"
              : transcript.status === "failed"
                ? "bg-red-100 text-red-800"
                : transcript.status === "transcribing"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700"
          }`}
        >
          {transcript.status}
        </span>
        {transcript.status === "pending" && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            Transkribieren (Whisper)
          </button>
        )}
      </div>

      {transcript.error_message && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {transcript.error_message}
        </div>
      )}

      {transcript.raw_text ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-600">Transkribierter Text</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={soapProvider}
                onChange={(e) => onProviderChange(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
              >
                {llmProviders.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.available}>
                    {p.label}{!p.available ? " (Key fehlt)" : ""}
                  </option>
                ))}
              </select>
              <select
                value={soapModel}
                onChange={(e) => setSoapModel(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
              >
                {currentProviderModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStructureSoap}
                disabled={structuring}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {structuring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                In SOAP strukturieren (LLM)
              </button>
            </div>
          </div>
          {structureError && (
            <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{structureError}</div>
          )}
          <pre className="whitespace-pre-wrap font-sans text-slate-800">
            {transcript.raw_text}
          </pre>
        </div>
      ) : transcript.status === "pending" ? (
        <p className="text-slate-500">Noch nicht transkribiert. Klicke auf „Transkribieren“.</p>
      ) : transcript.status === "transcribing" ? (
        <p className="text-slate-500">Transkription läuft…</p>
      ) : null}

      {transcript.soap_json && Object.keys(transcript.soap_json).length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-600">SOAP (strukturiert)</h2>
            {transcript.patient_id && (
              <button
                onClick={handleCreateRecord}
                disabled={creatingRecord}
                className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {creatingRecord ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Als Akte speichern
              </button>
            )}
          </div>
          <div className="space-y-4 text-sm">
            {(
              [
                { key: "subjective", label: "Subjektiv" },
                { key: "objective", label: "Objektiv" },
                { key: "assessment", label: "Assessment" },
                { key: "plan", label: "Plan" },
              ] as const
            ).map(({ key, label }) => {
              const raw = transcript.soap_json as Record<string, unknown>;
              const val = typeof raw?.[key] === "string" ? raw[key] : "";
              const display = (val as string).trim() || null;
              return (
                <div key={key} className="rounded-md border border-slate-100 bg-slate-50/50 p-3">
                  <p className="mb-1 font-medium text-slate-600">{label}</p>
                  <p className={display ? "text-slate-800 whitespace-pre-wrap" : "text-slate-400 italic"}>
                    {display ?? "— keine Angabe —"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Erstellt: {new Date(transcript.created_at).toLocaleString("de-DE")}
      </p>
    </div>
  );
}
