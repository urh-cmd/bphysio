"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Patient, Transcript } from "@/lib/api";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ArrowLeft, Loader2, Check } from "lucide-react";

export default function NewRecordPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient_id");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "idle" | "uploading" | "processing" | "completed" | "failed"
  >("idle");
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: patientIdParam ?? "",
    title: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  useEffect(() => {
    if (patientIdParam) setForm((f) => ({ ...f, patient_id: patientIdParam }));
  }, [patientIdParam]);

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      if (!token || !form.patient_id) {
        setError("Bitte zuerst Patient auswählen.");
        return;
      }
      setTranscriptionStatus("uploading");
      setTranscriptionError(null);
      setTranscriptionText(null);
      try {
        const fd = new FormData();
        const ext = blob.type.includes("webm")
          ? ".webm"
          : blob.type.includes("mp4")
            ? ".m4a"
            : blob.type.includes("ogg")
              ? ".ogg"
              : ".wav";
        fd.append("file", blob, `patientengespraech_${Date.now()}${ext}`);
        fd.append("patient_id", form.patient_id);

        const t = await api<Transcript>("/api/transcripts", {
          method: "POST",
          body: fd,
          token,
        });
        setTranscriptionStatus("processing");

        const result = await api<Transcript>(`/api/transcripts/${t.id}/process`, {
          method: "POST",
          token,
        });
        if (result.status === "completed" && result.raw_text) {
          setTranscriptionText(result.raw_text);
          setTranscriptionStatus("completed");
        } else if (result.status === "failed") {
          setTranscriptionError(result.error_message || "Transkription fehlgeschlagen");
          setTranscriptionStatus("failed");
        }
      } catch (err) {
        setTranscriptionError(err instanceof Error ? err.message : "Fehler");
        setTranscriptionStatus("failed");
      }
    },
    [token, form.patient_id]
  );

  const applyToSubjective = useCallback(() => {
    if (transcriptionText) {
      setForm((f) => ({
        ...f,
        subjective: f.subjective ? `${f.subjective}\n\n${transcriptionText}` : transcriptionText,
      }));
      setTranscriptionStatus("idle");
      setTranscriptionText(null);
    }
  }, [transcriptionText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.patient_id) {
      setError("Bitte Patient auswählen.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const record = await api<{ id: string }>("/api/records", {
        method: "POST",
        body: JSON.stringify({
          patient_id: form.patient_id,
          title: form.title || undefined,
          record_type: "soap",
          subjective: form.subjective || undefined,
          objective: form.objective || undefined,
          assessment: form.assessment || undefined,
          plan: form.plan || undefined,
        }),
        token,
      });
      router.push(`/dashboard/records/${record.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link
        href="/dashboard/records"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Neue Akte (SOAP)</h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Patient *</label>
          <select
            required
            value={form.patient_id}
            onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">— Bitte wählen —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Patientengespräch aufnehmen
          </label>
          <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {!form.patient_id ? (
              <p className="text-sm text-slate-500">Bitte zuerst Patient auswählen.</p>
            ) : (
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                recordingLabel="Aufnahme läuft…"
                compact
              />
            )}
            {transcriptionStatus === "uploading" && (
              <p className="mt-2 text-sm text-slate-600">Wird hochgeladen…</p>
            )}
            {transcriptionStatus === "processing" && (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transkription läuft (Whisper)…
              </p>
            )}
            {transcriptionStatus === "completed" && transcriptionText && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium text-slate-700">Transkribierter Text:</p>
                <div className="max-h-32 overflow-y-auto rounded border border-slate-200 bg-white p-3 text-sm text-slate-800">
                  {transcriptionText}
                </div>
                <button
                  type="button"
                  onClick={applyToSubjective}
                  className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary-500 px-3 py-1.5 text-sm text-white hover:bg-primary-600"
                >
                  <Check className="h-4 w-4" />
                  In Subjektiv übernehmen
                </button>
              </div>
            )}
            {transcriptionStatus === "failed" && transcriptionError && (
              <p className="mt-2 text-sm text-red-600">{transcriptionError}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titel</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="z.B. Befund 01.03.2026"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">S – Subjektiv</label>
          <textarea
            rows={3}
            value={form.subjective}
            onChange={(e) => setForm((f) => ({ ...f, subjective: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">O – Objektiv</label>
          <textarea
            rows={3}
            value={form.objective}
            onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">A – Assessment</label>
          <textarea
            rows={2}
            value={form.assessment}
            onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">P – Plan</label>
          <textarea
            rows={2}
            value={form.plan}
            onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "Speichert…" : "Speichern"}
          </button>
          <Link
            href="/dashboard/records"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
