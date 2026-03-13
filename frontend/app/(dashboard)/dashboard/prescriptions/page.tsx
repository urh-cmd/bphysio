"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Prescription, Patient } from "@/lib/api";
import { Plus } from "lucide-react";

export default function PrescriptionsPage() {
  const { token } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPatientId, setFilterPatientId] = useState("");

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filterPatientId) params.set("patient_id", filterPatientId);
    api<Prescription[]>(`/api/prescriptions?${params}`, { token })
      .then(setPrescriptions)
      .catch(() => setPrescriptions([]))
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
        <h1 className="text-2xl font-semibold text-slate-800">Verordnungen</h1>
        <div className="flex gap-2">
          <select
            value={filterPatientId}
            onChange={(e) => setFilterPatientId(e.target.value)}
            className="rounded-md border border-slate-300 py-2 px-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Alle Patienten</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/prescriptions/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Neue Verordnung
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            Keine Verordnungen. Neue Verordnung anlegen.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {prescriptions.map((p) => {
              const patient = patients.find((x) => x.id === p.patient_id);
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/prescriptions/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {patient
                        ? `${patient.last_name}, ${patient.first_name}`
                        : "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(p.prescription_date).toLocaleDateString("de-DE")}
                      {p.prescription_number && ` · ${p.prescription_number}`}
                      {p.zuweiser_name && ` · ${p.zuweiser_name}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.items.map((i) => `${i.service_code} × ${i.quantity}`).join(", ")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.status === "active"
                        ? "bg-green-100 text-green-800"
                        : p.status === "used"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
