"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Patient } from "@/lib/api";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function PatientsPage() {
  const { token, user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    api<Patient[]>(`/api/patients${q}`, { token })
      .then(setPatients)
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, [token, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Patient wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/patients/${id}`, { method: "DELETE", token: token! });
      setPatients((p) => p.filter((x) => x.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Patienten</h1>
        <Link
          href="/dashboard/patients/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Neuer Patient
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-80"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : patients.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {search ? "Keine Patienten gefunden." : "Noch keine Patienten angelegt."}
            {!search && (
              <Link
                href="/dashboard/patients/new"
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
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Geburtsdatum
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Geschlecht
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Kontakt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Versicherung
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/patients/${p.id}`}
                      className="font-medium text-slate-800 hover:text-primary-600"
                    >
                      {p.last_name}, {p.first_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString("de-DE") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.gender === "m" ? "Männlich" : p.gender === "f" ? "Weiblich" : p.gender === "d" ? "Divers" : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="space-y-0.5">
                      {p.email && <div>{p.email}</div>}
                      {p.phone && <div className="text-slate-500">{p.phone}</div>}
                      {!p.email && !p.phone && "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="space-y-0.5">
                      {p.insurance_type && <div>{p.insurance_type}</div>}
                      {p.insurance_name && <div className="text-slate-500">{p.insurance_name}</div>}
                      {!p.insurance_type && !p.insurance_name && "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/patients/${p.id}`}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {canDelete(user?.roles) && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleteId === p.id}
                          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
