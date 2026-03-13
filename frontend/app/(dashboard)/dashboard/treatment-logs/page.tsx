"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, TreatmentLog, Patient } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function TreatmentLogsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient_id") ?? undefined;

  const [logs, setLogs] = useState<TreatmentLog[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<string>(patientIdParam ?? "");

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterPatientId) params.set("patient_id", filterPatientId);
    api<TreatmentLog[]>(`/api/treatment-logs?${params}`, { token })
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [token, filterPatientId]);

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!confirm("Behandlungseintrag wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/treatment-logs/${id}`, { method: "DELETE", token: token! });
      setLogs((list) => list.filter((x) => x.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  const getPatientName = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.last_name}, ${p.first_name}` : id;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Behandlungsprotokoll</h1>
        <Link
          href={
            filterPatientId
              ? `/dashboard/treatment-logs/new?patient_id=${filterPatientId}`
              : "/dashboard/treatment-logs/new"
          }
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Neuer Eintrag
        </Link>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm text-slate-600">Patient filtern</label>
        <select
          value={filterPatientId}
          onChange={(e) => setFilterPatientId(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2 px-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-64"
        >
          <option value="">Alle Patienten</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.last_name}, {p.first_name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {filterPatientId
              ? "Keine Behandlungen für diesen Patienten."
              : "Noch keine Behandlungen protokolliert."}
            {!filterPatientId && (
              <Link
                href="/dashboard/treatment-logs/new"
                className="ml-1 text-primary-600 hover:underline"
              >
                Ersten anlegen
              </Link>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Leistung
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Dauer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Verordnung
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Notiz
                </th>
                {canDelete(user?.roles) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {logs.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/treatment-logs/${t.id}`}
                      className="font-medium text-slate-800 hover:text-primary-600"
                    >
                      {getPatientName(t.patient_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(t.treatment_date).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {t.service_code || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {t.duration_minutes != null ? `${t.duration_minutes} Min` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {t.prescription_id ? (
                      <Link
                        href={`/dashboard/prescriptions/${t.prescription_id}`}
                        className="text-primary-600 hover:underline"
                      >
                        Verordnung #{t.prescription_id.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600">
                    {t.note || "—"}
                  </td>
                  {canDelete(user?.roles) && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleteId === t.id}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
