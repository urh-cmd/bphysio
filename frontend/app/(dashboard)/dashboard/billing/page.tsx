"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Download, FileSpreadsheet } from "lucide-react";

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

export default function BillingExportPage() {
  const { token } = useAuth();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(lastOfMonth.toISOString().slice(0, 10));
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, format });
      const res = await fetch(
        `${API_BASE}/api/billing/export?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(await res.text() || "Export fehlgeschlagen");
      if (format === "csv") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `abrechnung_${from}_${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `abrechnung_${from}_${to}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        Abrechnungs-Export
      </h1>

      <p className="mb-6 text-slate-600">
        Behandlungsdaten für externe Abrechnungssoftware exportieren. CSV
        (Excel-kompatibel, Semikolon-getrennt) oder JSON für API-Anbindung.
      </p>

      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Von
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Bis
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "csv" | "json")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="csv">CSV (Excel, Semikolon)</option>
              <option value="json">JSON (API-Anbindung)</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Export wird erstellt…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export herunterladen
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <h3 className="mb-2 font-medium text-slate-700">
          Externe Schnittstellen
        </h3>
        <p>
          Der Export enthält Patientendaten, Versicherungsinfo, Leistungscodes,
          Dauer und Verordnungs-ID. Für die Anbindung an Abrechnungssoftware
          (z.B. Rehadat, MDP) kann die JSON-API genutzt werden.
        </p>
      </div>
    </div>
  );
}
