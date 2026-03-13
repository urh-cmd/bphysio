"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Patient } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function NewRecallPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient_id") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient_id: patientIdParam,
    recall_date: new Date().toISOString().slice(0, 10),
    reason: "",
    notes: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = {
        patient_id: form.patient_id,
        recall_date: form.recall_date,
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const r = await api<{ id: string }>("/api/recalls", {
        method: "POST",
        body: JSON.stringify(body),
        token: token!,
      });
      router.push(`/dashboard/recalls?patient_id=${form.patient_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link
        href="/dashboard/recalls"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Neue Wiedervorstellung</h1>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Datum *</label>
            <input
              type="date"
              required
              value={form.recall_date}
              onChange={(e) => setForm((f) => ({ ...f, recall_date: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Grund</label>
            <input
              type="text"
              placeholder="z.B. Kontrolle"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
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
            disabled={loading}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? "Wird gespeichert…" : "Speichern"}
          </button>
          <Link
            href="/dashboard/recalls"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
