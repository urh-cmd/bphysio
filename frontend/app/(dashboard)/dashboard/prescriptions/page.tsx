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
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Verordnungsdatum
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Verordnungsnr.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Zuweiser
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Leistungen
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {prescriptions.map((p) => {
                const patient = patients.find((x) => x.id === p.patient_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/prescriptions/${p.id}`}
                        className="font-medium text-slate-800 hover:text-primary-600"
                      >
                        {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(p.prescription_date).toLocaleDateString("de-DE")}
                      {p.valid_until && (
                        <div className="text-xs text-slate-500">gültig bis {new Date(p.valid_until).toLocaleDateString("de-DE")}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {p.prescription_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {p.zuweiser_name || "—"}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-sm text-slate-600">
                      {p.items.map((i) => `${i.service_code} × ${i.quantity}`).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "active"
                            ? "bg-green-100 text-green-800"
                            : p.status === "used"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status === "active" ? "Aktiv" : p.status === "used" ? "Verbraucht" : p.status}
                      </span>
                    </td>
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
