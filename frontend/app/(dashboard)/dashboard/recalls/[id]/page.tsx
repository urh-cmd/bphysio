"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Recall, Patient } from "@/lib/api";
import { ArrowLeft, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function RecallDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [recall, setRecall] = useState<Recall | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (!token || !id) return;
    api<Recall>(`/api/recalls/${id}`, { token })
      .then((r) => {
        setRecall(r);
        setForm({
          recall_date: r.recall_date,
          reason: r.reason || "",
          notes: r.notes || "",
          notified: r.notified,
          completed: r.completed,
        });
        return api<Patient>(`/api/patients/${r.patient_id}`, { token });
      })
      .then(setPatient)
      .catch(() => setRecall(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recall) return;
    setError("");
    setSaving(true);
    try {
      const updated = await api<Recall>(`/api/recalls/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          recall_date: form.recall_date,
          reason: (form.reason as string).trim() || undefined,
          notes: (form.notes as string).trim() || undefined,
          notified: form.notified,
          completed: form.completed,
        }),
        token: token!,
      });
      setRecall(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Wiedervorstellung wirklich unwiderruflich löschen?")) return;
    setDeleting(true);
    try {
      await api(`/api/recalls/${id}`, { method: "DELETE", token: token! });
      router.push("/dashboard/recalls");
    } catch {
      setError("Löschen fehlgeschlagen");
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

  if (!recall) {
    return (
      <div>
        <p className="text-slate-600">Wiedervorstellung nicht gefunden.</p>
        <Link href="/dashboard/recalls" className="mt-4 text-primary-600 hover:underline">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const patientName = patient
    ? `${patient.last_name}, ${patient.first_name}`
    : recall.patient_id;

  return (
    <div>
      <Link
        href="/dashboard/recalls"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        Wiedervorstellung: {patientName}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
          <Link
            href={`/dashboard/patients/${recall.patient_id}`}
            className="text-primary-600 hover:underline"
          >
            {patientName}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Datum *</label>
            <input
              type="date"
              required
              value={(form.recall_date as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, recall_date: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Grund</label>
            <input
              type="text"
              value={(form.reason as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.completed}
              onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
              className="rounded border-slate-300 text-primary-500"
            />
            <span className="text-sm">Erledigt</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.notified}
              onChange={(e) => setForm((f) => ({ ...f, notified: e.target.checked }))}
              className="rounded border-slate-300 text-primary-500"
            />
            <span className="text-sm">Benachrichtigt</span>
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notizen</label>
          <textarea
            rows={3}
            value={(form.notes as string) ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "Wird gespeichert…" : "Speichern"}
          </button>
          <Link
            href="/dashboard/recalls"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
          {canDelete(user?.roles) && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Löscht…" : "Löschen"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
