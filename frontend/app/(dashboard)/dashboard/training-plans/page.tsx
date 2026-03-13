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
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Titel
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Beschreibung
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Art
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Aktualisiert
                </th>
                {canDelete(user?.roles) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {plans.map((p) => {
                const patient = patients.find((x) => x.id === p.patient_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/training-plans/${p.id}`}
                        className="flex items-center gap-2 font-medium text-slate-800 hover:text-primary-600"
                      >
                        <ClipboardList className="h-4 w-4 shrink-0 text-slate-400" />
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-600">
                      {p.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_template ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Vorlage
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          Patient
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(p.updated_at).toLocaleDateString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    {canDelete(user?.roles) && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          disabled={deleteId === p.id}
                          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
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
