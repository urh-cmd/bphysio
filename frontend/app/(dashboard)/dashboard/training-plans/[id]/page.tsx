"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, TrainingPlan, Patient } from "@/lib/api";
import { ArrowLeft, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function TrainingPlanDetailPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    patient_id: "",
    is_template: false,
  });

  useEffect(() => {
    if (!token || !id) return;
    api<TrainingPlan>(`/api/training-plans/${id}`, { token })
      .then((p) => {
        setPlan(p);
        setForm({
          title: p.title,
          description: p.description || "",
          content: p.content || "",
          patient_id: p.patient_id || "",
          is_template: p.is_template,
        });
        if (p.patient_id) {
          api<Patient>(`/api/patients/${p.patient_id}`, { token })
            .then(setPatient)
            .catch(() => setPatient(null));
        }
      })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !plan) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api<TrainingPlan>(`/api/training-plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          content: form.content || undefined,
          patient_id: form.patient_id || undefined,
          is_template: form.is_template,
        }),
        token,
      });
      setPlan(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Trainingsplan wirklich unwiderruflich löschen?")) return;
    setDeleting(true);
    try {
      await api(`/api/training-plans/${id}`, { method: "DELETE", token: token! });
      router.push("/dashboard/training-plans");
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

  if (!plan) {
    return (
      <div>
        <p className="text-slate-600">Trainingsplan nicht gefunden.</p>
        <Link href="/dashboard/training-plans" className="mt-4 text-primary-600 hover:underline">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/training-plans"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">{plan.title}</h1>

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

      {plan.is_template && (
        <span className="mb-4 inline-block rounded bg-amber-100 px-2 py-1 text-sm text-amber-800">
          Vorlage
        </span>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titel *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Beschreibung</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Inhalt (Markdown)</label>
          <textarea
            rows={12}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_template}
              onChange={(e) => setForm((f) => ({ ...f, is_template: e.target.checked }))}
              className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Als Vorlage</span>
          </label>
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
            href="/dashboard/training-plans"
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
