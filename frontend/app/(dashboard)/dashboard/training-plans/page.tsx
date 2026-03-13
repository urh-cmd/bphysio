"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, TrainingPlan, Patient } from "@/lib/api";
import { Plus, ClipboardList, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function TrainingPlansPage() {
  const { token, user } = useAuth();

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<string>("");
  const [templatesOnly, setTemplatesOnly] = useState(false);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterPatientId) params.set("patient_id", filterPatientId);
    if (templatesOnly) params.set("templates_only", "true");
    api<TrainingPlan[]>(`/api/training-plans?${params}`, { token })
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [token, filterPatientId, templatesOnly]);

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Trainingsplan wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/training-plans/${id}`, { method: "DELETE", token: token! });
      setPlans((p) => p.filter((x) => x.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Trainingspläne</h1>
        <Link
          href="/dashboard/training-plans/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Neuer Plan
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-sm text-slate-600">Patient</label>
          <select
            value={filterPatientId}
            onChange={(e) => setFilterPatientId(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 px-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Alle</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={templatesOnly}
              onChange={(e) => setTemplatesOnly(e.target.checked)}
              className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-600">Nur Vorlagen</span>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : plans.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            Noch keine Trainingspläne angelegt.
            <Link
              href="/dashboard/training-plans/new"
              className="ml-1 text-primary-600 hover:underline"
            >
              Ersten anlegen
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {plans.map((p) => {
              const patient = patients.find((x) => x.id === p.patient_id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <Link href={`/dashboard/training-plans/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <ClipboardList className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">
                        {p.title}
                        {p.is_template && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                            Vorlage
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">
                        {patient ? `${patient.last_name}, ${patient.first_name}` : "—"} ·{" "}
                        {new Date(p.updated_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </Link>
                  {canDelete(user?.roles) && (
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      disabled={deleteId === p.id}
                      className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
