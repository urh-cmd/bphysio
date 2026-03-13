"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Patient, Zuweiser, ServiceCatalogItem } from "@/lib/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type ItemRow = { service_code: string; quantity: number; note: string };

export default function NewPrescriptionPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient_id") ?? "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [zuweiser, setZuweiser] = useState<Zuweiser[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient_id: patientIdParam,
    zuweiser_id: "",
    prescription_date: new Date().toISOString().slice(0, 10),
    valid_until: "",
    diagnosis_code: "",
    prescription_number: "",
    notes: "",
  });
  const [items, setItems] = useState<ItemRow[]>([{ service_code: "", quantity: 1, note: "" }]);

  useEffect(() => {
    if (patientIdParam) setForm((f) => ({ ...f, patient_id: patientIdParam }));
  }, [patientIdParam]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<Patient[]>(`/api/patients?limit=500`, { token }),
      api<Zuweiser[]>(`/api/zuweiser`, { token }),
      api<ServiceCatalogItem[]>(`/api/billing/services`, { token }),
    ])
      .then(([p, z, s]) => {
        setPatients(p);
        setZuweiser(z);
        setServices(s);
      })
      .catch(() => {});
  }, [token]);

  const addItem = () =>
    setItems((prev) => [...prev, { service_code: "", quantity: 1, note: "" }]);
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof ItemRow, val: string | number) =>
    setItems((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const validItems = items.filter((r) => r.service_code.trim());
      if (validItems.length === 0) {
        setError("Mindestens eine Leistung angeben.");
        setLoading(false);
        return;
      }
      await api("/api/prescriptions", {
        method: "POST",
        body: JSON.stringify({
          patient_id: form.patient_id,
          zuweiser_id: form.zuweiser_id || undefined,
          prescription_date: form.prescription_date,
          valid_until: form.valid_until || undefined,
          diagnosis_code: form.diagnosis_code || undefined,
          prescription_number: form.prescription_number || undefined,
          notes: form.notes || undefined,
          items: validItems.map((r) => ({
            service_code: r.service_code,
            quantity: r.quantity,
            note: r.note || undefined,
          })),
        }),
        token: token!,
      });
      router.push("/dashboard/prescriptions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link
        href="/dashboard/prescriptions"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        Neue Verordnung
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Patient *
          </label>
          <select
            required
            value={form.patient_id}
            onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">— Bitte wählen —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Zuweiser
          </label>
          <select
            value={form.zuweiser_id}
            onChange={(e) => setForm((f) => ({ ...f, zuweiser_id: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">— Bitte wählen —</option>
            {zuweiser.map((z) => (
              <option key={z.id} value={z.id}>
                {z.title || ""} {z.first_name} {z.last_name}
                {z.practice_name ? ` (${z.practice_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Verordnungsdatum *
            </label>
            <input
              type="date"
              required
              value={form.prescription_date}
              onChange={(e) => setForm((f) => ({ ...f, prescription_date: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Gültig bis
            </label>
            <input
              type="date"
              value={form.valid_until}
              onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Diagnose (ICD-10)
            </label>
            <input
              type="text"
              placeholder="z.B. M54.5"
              value={form.diagnosis_code}
              onChange={(e) => setForm((f) => ({ ...f, diagnosis_code: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Rezeptnummer
            </label>
            <input
              type="text"
              placeholder="z.B. REZ-2025-1234"
              value={form.prescription_number}
              onChange={(e) => setForm((f) => ({ ...f, prescription_number: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">
              Leistungen *
            </label>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="inline h-4 w-4" /> Leistung hinzufügen
            </button>
          </div>
          <div className="space-y-2">
            {items.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={row.service_code}
                  onChange={(e) => updateItem(i, "service_code", e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">— Leistung —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.code} – {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) =>
                    updateItem(i, "quantity", parseInt(e.target.value, 10) || 1)
                  }
                  className="w-16 rounded-md border border-slate-300 px-2 py-2 text-sm"
                />
                <span className="text-sm text-slate-500">×</span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notizen
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? "Wird gespeichert…" : "Speichern"}
          </button>
          <Link
            href="/dashboard/prescriptions"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
