"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, ClinicalRecord, Patient } from "@/lib/api";
import { ArrowLeft, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function RecordDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  useEffect(() => {
    if (!token || !id) return;
    api<ClinicalRecord>(`/api/records/${id}`, { token })
      .then((r) => {
        setRecord(r);
        setForm({
          title: r.title || "",
          subjective: r.subjective || "",
          objective: r.objective || "",
          assessment: r.assessment || "",
          plan: r.plan || "",
        });
        if (r.patient_id) {
          api<Patient>(`/api/patients/${r.patient_id}`, { token }).then(setPatient).catch(() => setPatient(null));
        }
      })
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !record) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api<ClinicalRecord>(`/api/records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title || undefined,
          subjective: form.subjective || undefined,
          objective: form.objective || undefined,
          assessment: form.assessment || undefined,
          plan: form.plan || undefined,
        }),
        token,
      });
      setRecord(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Akte wirklich unwiderruflich löschen?")) return;
    setDeleting(true);
    try {
      await api(`/api/records/${id}`, { method: "DELETE", token: token! });
      router.push("/dashboard/records");
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

  if (!record) {
    return (
      <div>
        <p className="text-slate-600">Akte nicht gefunden.</p>
        <Link href="/dashboard/records" className="mt-4 text-primary-600 hover:underline">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/records"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        {record.title || "Akte bearbeiten"}
      </h1>

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

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titel</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">S – Subjektiv</label>
          <textarea
            rows={4}
            value={form.subjective}
            onChange={(e) => setForm((f) => ({ ...f, subjective: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">O – Objektiv</label>
          <textarea
            rows={4}
            value={form.objective}
            onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">A – Assessment</label>
          <textarea
            rows={3}
            value={form.assessment}
            onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">P – Plan</label>
          <textarea
            rows={3}
            value={form.plan}
            onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4">
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
