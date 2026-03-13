"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ClinicalRecord, Patient } from "@/lib/api";
import { Plus, FileText, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function RecordsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient_id") ?? undefined;

  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<string | "">(patientId ?? "");

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Akte wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/records/${id}`, { method: "DELETE", token: token! });
      setRecords((r) => r.filter((x) => x.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterPatientId) params.set("patient_id", filterPatientId);
    api<ClinicalRecord[]>(`/api/records?${params}`, { token })
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [token, filterPatientId]);

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Akten</h1>
        <Link
          href={filterPatientId ? `/dashboard/records/new?patient_id=${filterPatientId}` : "/dashboard/records/new"}
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Neue Akte
        </Link>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="w-full sm:w-64">
          <label className="mb-1 block text-sm text-slate-600">Patient filtern</label>
          <select
            value={filterPatientId}
            onChange={(e) => setFilterPatientId(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 px-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Alle Patienten</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {filterPatientId ? "Keine Akten für diesen Patienten." : "Noch keine Akten angelegt."}
            {!filterPatientId && (
              <Link
                href="/dashboard/records/new"
                className="ml-1 text-primary-600 hover:underline"
              >
                Erste anlegen
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {records.map((r) => {
              const patient = patients.find((p) => p.id === r.patient_id);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <Link href={`/dashboard/records/${r.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">
                        {r.title || "Ohne Titel"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {patient ? `${patient.last_name}, ${patient.first_name}` : r.patient_id} ·{" "}
                        {new Date(r.updated_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </Link>
                  {canDelete(user?.roles) && (
                    <button
                      onClick={(e) => handleDelete(r.id, e)}
                      disabled={deleteId === r.id}
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
