"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Patient, MovementSession } from "@/lib/api";
import { ArrowLeft, Activity, Play, CheckCircle, XCircle, Loader2, FileText, Mic, ClipboardList, CalendarCheck, Clipboard } from "lucide-react";

export default function PatientDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const id = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<MovementSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !id) return;
    api<Patient>(`/api/patients/${id}`, { token })
      .then((p) => {
        setPatient(p);
        setForm({
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          date_of_birth: p.date_of_birth || "",
          gender: p.gender || "",
          email: p.email || "",
          phone: p.phone || "",
          insurance_type: p.insurance_type || "",
          insurance_name: p.insurance_name || "",
          insurance_number: p.insurance_number || "",
          notes: p.notes || "",
        });
      })
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  const loadSessions = useCallback(async () => {
    if (!token || !id) return;
    try {
      const data = await api<MovementSession[]>(`/api/movement/sessions?patient_id=${id}`, { token });
      setSessions(data);
    } catch {
      setSessions([]);
    }
  }, [token, id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleProcess = async (sessionId: string) => {
    if (!token) return;
    setProcessingId(sessionId);
    try {
      const updated = await api<MovementSession>(`/api/movement/process/${sessionId}`, {
        method: "POST",
        token,
      });
      setSessions((s) => s.map((x) => (x.id === sessionId ? updated : x)));
    } catch {
      // ignore
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setError("");
    setSaving(true);
    try {
      const body = {
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        insurance_type: form.insurance_type?.trim() || undefined,
        insurance_name: form.insurance_name?.trim() || undefined,
        insurance_number: form.insurance_number?.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const updated = await api<Patient>(`/api/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        token: token!,
      });
      setPatient(updated);
      setForm({
        first_name: updated.first_name || "",
        last_name: updated.last_name || "",
        date_of_birth: updated.date_of_birth || "",
        gender: updated.gender || "",
        email: updated.email || "",
        phone: updated.phone || "",
        insurance_type: updated.insurance_type || "",
        insurance_name: updated.insurance_name || "",
        insurance_number: updated.insurance_number || "",
        notes: updated.notes || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
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

  if (!patient) {
    return (
      <div>
        <p className="text-slate-600">Patient nicht gefunden.</p>
        <Link href="/dashboard/patients" className="mt-4 text-primary-600 hover:underline">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/patients"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        {patient.last_name}, {patient.first_name}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vorname *</label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nachname *</label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Geburtsdatum
            </label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Geschlecht</label>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">—</option>
              <option value="m">Männlich</option>
              <option value="w">Weiblich</option>
              <option value="d">Divers</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-Mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-700">Versicherung (abrechnungsrelevant)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Kassenart</label>
              <select
                value={form.insurance_type}
                onChange={(e) => setForm((f) => ({ ...f, insurance_type: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">—</option>
                <option value="gkv">GKV</option>
                <option value="pkv">PKV</option>
                <option value="self">Selbstzahler</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Krankenkasse / Versicherung</label>
              <input
                type="text"
                value={form.insurance_name}
                onChange={(e) => setForm((f) => ({ ...f, insurance_name: e.target.value }))}
                placeholder="z.B. AOK Nordost"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-slate-600">Versicherungsnummer</label>
              <input
                type="text"
                value={form.insurance_number}
                onChange={(e) => setForm((f) => ({ ...f, insurance_number: e.target.value }))}
                placeholder="z.B. A123456789"
                className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notizen</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "Wird gespeichert…" : "Speichern"}
          </button>
          <Link
            href="/dashboard/patients"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>

      {/* Schnellzugriff */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/records/new?patient_id=${id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileText className="h-4 w-4" />
          Neue Akte
        </Link>
        <Link
          href={`/dashboard/transcripts?patient_id=${id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Mic className="h-4 w-4" />
          Transkription
        </Link>
        <Link
          href={`/dashboard/training-plans/new?patient_id=${id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ClipboardList className="h-4 w-4" />
          Trainingsplan
        </Link>
        <Link
          href={`/dashboard/recalls/new?patient_id=${id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <CalendarCheck className="h-4 w-4" />
          Wiedervorstellung
        </Link>
        <Link
          href={`/dashboard/prescriptions/new?patient_id=${id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Clipboard className="h-4 w-4" />
          Neue Verordnung
        </Link>
        <Link
          href={`/dashboard/treatment-logs/new?patient_id=${id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Clipboard className="h-4 w-4" />
          Behandlungsprotokoll
        </Link>
      </div>

      {/* Ganganalyse-Sessions */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-700">Ganganalyse</h2>
          <Link
            href={`/dashboard/movement?patient_id=${id}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Activity className="h-4 w-4" />
            Neue Ganganalyse
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-slate-500">Noch keine Ganganalyse-Sessions für diesen Patienten.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">
                    {s.frame_count ? `${s.frame_count} Frames` : "—"} ·{" "}
                    {new Date(s.created_at).toLocaleString("de-DE")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === "pending" && (
                    <button
                      onClick={() => handleProcess(s.id)}
                      disabled={processingId === s.id}
                      className="inline-flex items-center gap-1 rounded bg-primary-500 px-2 py-1 text-xs text-white hover:bg-primary-600 disabled:opacity-50"
                    >
                      {processingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Verarbeiten
                    </button>
                  )}
                  {s.status === "completed" && (
                    <Link
                      href={`/dashboard/movement/${s.id}`}
                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Ergebnis
                    </Link>
                  )}
                  {s.status === "failed" && (
                    <Link
                      href={`/dashboard/movement/${s.id}`}
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                      title={s.error_message ?? ""}
                    >
                      <XCircle className="h-4 w-4" />
                      Fehlgeschlagen
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
