"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Zuweiser } from "@/lib/api";
import { Plus, Search, Pencil, Trash2, Stethoscope } from "lucide-react";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function ZuweiserPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Zuweiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const q = search ? `?q=${encodeURIComponent(search)}` : "";
    api<Zuweiser[]>(`/api/zuweiser${q}`, { token })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Zuweiser wirklich löschen?")) return;
    setDeleteId(id);
    try {
      await api(`/api/zuweiser/${id}`, { method: "DELETE", token: token! });
      setItems((list) => list.filter((x) => x.id !== id));
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  const displayName = (z: Zuweiser) => {
    const parts = [z.title, z.first_name, z.last_name].filter(Boolean);
    return parts.join(" ");
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Zuweiser (Ärzte)</h1>
        <Link
          href="/dashboard/zuweiser/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Neuer Zuweiser
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Suchen (Name, Praxis, Fachrichtung)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-96"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {search ? "Keine Zuweiser gefunden." : "Noch keine Zuweiser angelegt."}
            {!search && (
              <Link
                href="/dashboard/zuweiser/new"
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
                  Arzt / Praxis
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fachrichtung
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Kontakt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Adresse
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((z) => (
                <tr key={z.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/zuweiser/${z.id}`}
                      className="flex items-center gap-2 font-medium text-slate-800 hover:text-primary-600"
                    >
                      <Stethoscope className="h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <div>{displayName(z)}</div>
                        {z.practice_name && (
                          <div className="text-xs font-normal text-slate-500">{z.practice_name}</div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {z.specialization || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="space-y-0.5">
                      {z.phone && <div>{z.phone}</div>}
                      {z.email && <div className="text-slate-500">{z.email}</div>}
                      {z.fax && <div className="text-xs text-slate-400">Fax: {z.fax}</div>}
                      {!z.phone && !z.email && !z.fax && "—"}
                    </div>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-600">
                    {z.address || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        z.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {z.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/zuweiser/${z.id}`}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {canDelete(user?.roles) && (
                        <button
                          onClick={() => handleDelete(z.id)}
                          disabled={deleteId === z.id}
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
