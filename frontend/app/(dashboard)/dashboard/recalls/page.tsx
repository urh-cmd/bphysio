"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, Recall, Patient } from "@/lib/api";
import { Plus, CalendarCheck, CheckCircle, Circle, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function RecallsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient_id") ?? undefined;

  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<string>(patientIdParam ?? "");

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterPatientId) params.set("patient_id", filterPatientId);
    api<Recall[]>(`/api/recalls?${params}`, { token })
      .then(setRecalls)
      .catch(() => setRecalls([]))
      .finally(() => setLoading(false));
  }, [token, filterPatientId]);

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!confirm("Wiedervorstellung wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/recalls/${id}`, { method: "DELETE", token: token! });
      setRecalls((list) => list.filter((x) => x.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleCompleted = async (r: Recall) => {
    if (!token) return;
    try {
      const updated = await api<Recall>(`/api/recalls/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !r.completed }),
        token,
      });
      setRecalls((list) => list.map((x) => (x.id === r.id ? updated : x)));
    } catch {
      // ignore
    }
  };

  const getPatientName = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.last_name}, ${p.first_name}` : id;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Wiedervorstellungen</h1>
        <Link
          href={
            filterPatientId
              ? `/dashboard/recalls/new?patient_id=${filterPatientId}`
              : "/dashboard/recalls/new"
          }
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Neue Wiedervorstellung
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
        ) : recalls.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {filterPatientId
              ? "Keine Wiedervorstellungen für diesen Patienten."
              : "Noch keine Wiedervorstellungen angelegt."}
            {!filterPatientId && (
              <Link
                href="/dashboard/recalls/new"
                className="ml-1 text-primary-600 hover:underline"
              >
                Erste anlegen
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recalls.map((r) => {
              const isPast = new Date(r.recall_date) < new Date();
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <button
                    onClick={() => handleToggleCompleted(r)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    title={r.completed ? "Als offen markieren" : "Als erledigt markieren"}
                  >
                    {r.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <CalendarCheck className="h-5 w-5 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/recalls/${r.id}`}
                      className="font-medium text-slate-800 hover:text-primary-600"
                    >
                      {getPatientName(r.patient_id)}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {new Date(r.recall_date).toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {r.reason && ` · ${r.reason}`}
                    </p>
                  </div>
                  {isPast && !r.completed && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Überfällig
                    </span>
                  )}
                  {canDelete(user?.roles) && (
                    <button
                      onClick={() => handleDelete(r.id)}
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
