"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, Transcript, Patient } from "@/lib/api";
import { AudioRecorder } from "@/components/AudioRecorder";
import { Plus, Mic, Play, Loader2, FileAudio, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function TranscriptsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<string>(
    searchParams.get("patient_id") ?? ""
  );

  const loadTranscripts = async (showLoading = true) => {
    if (!token) return;
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPatientId) params.set("patient_id", filterPatientId);
      const data = await api<Transcript[]>(`/api/transcripts?${params}`, { token });
      setTranscripts(data);
    } catch {
      setTranscripts([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadTranscripts();
  }, [token, filterPatientId]);

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (filterPatientId) fd.append("patient_id", filterPatientId);

      const t = await api<Transcript>("/api/transcripts", {
        method: "POST",
        body: fd,
        token,
      });
      setTranscripts((prev) => [t, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    if (!token) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      const ext = blob.type.includes("webm")
        ? ".webm"
        : blob.type.includes("mp4")
          ? ".m4a"
          : blob.type.includes("ogg")
            ? ".ogg"
            : ".wav";
      fd.append("file", blob, `aufnahme_${Date.now()}${ext}`);
      if (filterPatientId) fd.append("patient_id", filterPatientId);

      const t = await api<Transcript>("/api/transcripts", {
        method: "POST",
        body: fd,
        token,
      });
      setTranscripts((prev) => [t, ...prev]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload fehlgeschlagen";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Transkript wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/transcripts/${id}`, { method: "DELETE", token: token! });
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  const handleProcess = (id: string) => {
    if (!token) return;
    setProcessingId(id);
    setTranscripts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "transcribing", progress_percent: 0 } : t))
    );
    api<Transcript>(`/api/transcripts/${id}/process`, { method: "POST", token })
      .then((updated) => {
        setTranscripts((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch(() => loadTranscripts(false))
      .finally(() => setProcessingId(null));
  };

  useEffect(() => {
    if (!processingId || !token) return;
    const interval = setInterval(async () => {
      try {
        const t = await api<Transcript>(`/api/transcripts/${processingId}`, { token });
        setTranscripts((prev) => prev.map((x) => (x.id === processingId ? t : x)));
        if (t.status === "completed" || t.status === "failed") {
          setProcessingId(null);
        }
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [processingId, token]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Transkription</h1>
        <div className="flex gap-2">
          <select
            value={filterPatientId}
            onChange={(e) => setFilterPatientId(e.target.value)}
            className="rounded-md border border-slate-300 py-2 px-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Alle Patienten</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Audio hochladen
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        Audio hochladen oder direkt aufnehmen. Transkription via faster-whisper (lokal) oder
        OpenAI API.
      </p>

      {uploadError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      <div className="mb-6">
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          recordingLabel="Patientengespräch wird aufgenommen…"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : transcripts.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            Noch keine Transkripte. Audio hochladen, um zu starten.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Patient / Erstellt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fortschritt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fehlermeldung
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {transcripts.map((t) => {
                const patient = patients.find((p) => p.id === t.patient_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/transcripts/${t.id}`}
                        className="flex items-center gap-2 font-medium text-slate-800 hover:text-primary-600"
                      >
                        <FileAudio className="h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div>{patient ? `${patient.last_name}, ${patient.first_name}` : "Transkript"}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(t.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : t.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : t.status === "transcribing"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status === "completed" ? "Abgeschlossen" : t.status === "failed" ? "Fehlgeschlagen" : t.status === "transcribing" ? "Transkribiert…" : "Ausstehend"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "transcribing" && (
                        <div className="flex min-w-[100px] items-center gap-2">
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-600" />
                          <div className="flex-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full bg-primary-500 transition-all"
                                style={{ width: `${Math.min(100, t.progress_percent ?? 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{t.progress_percent ?? 0}%</span>
                          </div>
                        </div>
                      )}
                      {t.status !== "transcribing" && "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-red-600" title={t.error_message}>
                      {t.status === "failed" && t.error_message ? t.error_message : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {t.status === "pending" && (
                          <button
                            onClick={() => handleProcess(t.id)}
                            disabled={processingId === t.id}
                            className="inline-flex items-center gap-1 rounded bg-primary-500 px-2 py-1 text-xs text-white hover:bg-primary-600 disabled:opacity-50"
                          >
                            {processingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
                            Transkribieren
                          </button>
                        )}
                        {(t.status === "completed" || t.status === "failed") && (
                          <Link
                            href={`/dashboard/transcripts/${t.id}`}
                            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            <Play className="h-4 w-4" />
                            Anzeigen
                          </Link>
                        )}
                        {canDelete(user?.roles) && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deleteId === t.id}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
