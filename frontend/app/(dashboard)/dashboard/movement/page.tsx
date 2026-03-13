"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, MovementSession, Patient } from "@/lib/api";
import { Upload, Play, CheckCircle, XCircle, Loader2, Trash2, Video } from "lucide-react";
import Link from "next/link";

export default function MovementPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patient_id") ?? undefined;

  const [sessions, setSessions] = useState<MovementSession[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(preselectedPatientId ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [selectedFile]);

  useEffect(() => {
    setSelectedPatientId((prev) => preselectedPatientId ?? (prev || ""));
  }, [preselectedPatientId]);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const url = preselectedPatientId
        ? `/api/movement/sessions?patient_id=${preselectedPatientId}`
        : "/api/movement/sessions";
      const data = await api<MovementSession[]>(url, { token });
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [token, preselectedPatientId]);

  const loadPatients = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<Patient[]>("/api/patients", { token });
      setPatients(data);
    } catch {
      setPatients([]);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      if (selectedPatientId?.trim()) {
        form.append("patient_id", selectedPatientId.trim());
      }
      const session = await api<MovementSession>("/api/movement/upload", {
        method: "POST",
        body: form,
        token,
      });
      setSessions((s) => [session, ...s]);
      setSelectedFile(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bewegungssession wirklich löschen? (inkl. Video)")) return;
    setDeleteId(id);
    try {
      await api(`/api/movement/sessions/${id}`, { method: "DELETE", token: token! });
      setSessions((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  const handleProcess = (id: string) => {
    if (!token) return;
    setProcessingId(id);
    let done = false;

    const poll = async () => {
      for (let i = 0; i < 90; i++) {
        if (done) return;
        try {
          const s = await api<MovementSession>(`/api/movement/sessions/${id}`, {
            token,
          });
          setSessions((prev) => prev.map((x) => (x.id === id ? s : x)));
          if (s.status === "completed" || s.status === "failed") {
            done = true;
            setProcessingId(null);
            return;
          }
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      done = true;
      setProcessingId(null);
      loadSessions();
    };

    poll();

    api<MovementSession>(`/api/movement/process/${id}`, {
      method: "POST",
      token,
      timeoutMs: 300000,
    })
      .then((s) => {
        done = true;
        setSessions((prev) => prev.map((x) => (x.id === id ? s : x)));
        setProcessingId(null);
      })
      .catch((err) => {
        done = true;
        setProcessingId(null);
        loadSessions();
        alert(err instanceof Error ? err.message : "Verarbeitung fehlgeschlagen");
      });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Ganganalyse</h1>
        {preselectedPatientId && (
          <Link
            href={`/dashboard/patients/${preselectedPatientId}`}
            className="text-sm text-slate-600 hover:text-slate-800"
          >
            ← Zurück zum Patient
          </Link>
        )}
      </div>

      {/* Upload */}
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Video hochladen</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            MP4, AVI, MOV oder MKV · Seitliche oder frontale Ansicht · 10–30 Sekunden Gehzeit
          </p>
        </div>
        <div className="flex flex-col gap-5 bg-white p-5 sm:flex-row sm:items-start">
          {/* Videovorschau */}
          <div className="shrink-0">
            <div className="flex h-36 w-64 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  className="h-full w-full object-contain"
                  muted
                  playsInline
                  preload="metadata"
                  controls={false}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Video className="h-10 w-10" strokeWidth={1.5} />
                  <span className="text-xs">Vorschau</span>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {selectedFile ? selectedFile.name : "Kein Video ausgewählt"}
            </p>
          </div>

          {/* Steuerung */}
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Patient (optional)
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition-colors hover:border-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:max-w-xs"
              >
                <option value="">— Kein Patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                Datei wählen
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Wird hochgeladen…" : "Hochladen"}
              </button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    fileInputRef.current && (fileInputRef.current.value = "");
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
        <h2 className="border-b border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-800">
          Ganganalyse-Sessions
        </h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            Noch keine Sessions. Lade ein Video hoch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-primary-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Patient / Datum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Frames
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Schritte
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Cadence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Symmetrie
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">
                          {s.patient_name ?? (s.patient_id ? "Unbekannter Patient" : "—")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(s.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "processing" && (
                        <span className="inline-flex items-center gap-2 text-sm text-amber-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verarbeitung{s.progress_percent != null ? ` ${s.progress_percent}%` : ""}
                        </span>
                      )}
                      {s.status === "pending" && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          Ausstehend
                        </span>
                      )}
                      {s.status === "completed" && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          Abgeschlossen
                        </span>
                      )}
                      {s.status === "failed" && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          Fehlgeschlagen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.frame_count ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {(s.metrics_json as { step_count?: number })?.step_count ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {typeof (s.metrics_json as { cadence?: number })?.cadence === "number"
                        ? `${(s.metrics_json as { cadence: number }).cadence.toFixed(1)}/min`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {typeof (s.metrics_json as { symmetry_index?: number })?.symmetry_index === "number"
                        ? `${(s.metrics_json as { symmetry_index: number }).symmetry_index.toFixed(1)}%`
                        : (s.metrics_json as { has_asymmetry?: boolean })?.has_asymmetry
                          ? "Asymmetrie"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {s.status === "pending" && (
                          <button
                            onClick={() => handleProcess(s.id)}
                            disabled={processingId === s.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                          >
                            {processingId === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            {processingId === s.id ? "Verarbeitung…" : "Verarbeiten"}
                          </button>
                        )}
                        {(s.status === "completed" || s.status === "failed") && (
                          <Link
                            href={`/dashboard/movement/${s.id}`}
                            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                              s.status === "completed"
                                ? "text-green-600 hover:text-green-700"
                                : "text-red-600 hover:text-red-700"
                            }`}
                          >
                            {s.status === "completed" ? (
                              <><CheckCircle className="h-4 w-4" /> Ergebnis</>
                            ) : (
                              <><XCircle className="h-4 w-4" /> Details</>
                            )}
                          </Link>
                        )}
                        {token && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deleteId === s.id || processingId === s.id}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
