"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Patient, ServiceCatalogItem, Prescription } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function NewTreatmentLogPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient_id") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient_id: patientIdParam,
    treatment_date: new Date().toISOString().slice(0, 10),
    service_code: "",
    prescription_id: "",
    duration_minutes: "",
    note: "",
  });

  useEffect(() => {
    if (!token) return;
    api<Patient[]>(`/api/patients?limit=500`, { token })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api<ServiceCatalogItem[]>(`/api/billing/services`, { token })
      .then(setServices)
      .catch(() => setServices([]));
  }, [token]);

  useEffect(() => {
    if (!token || !form.patient_id) return;
    api<Prescription[]>(`/api/prescriptions?patient_id=${form.patient_id}&status=active`, { token })
      .then(setPrescriptions)
      .catch(() => setPrescriptions([]));
  }, [token, form.patient_id]);

  useEffect(() => {
    if (patientIdParam) setForm((f) => ({ ...f, patient_id: patientIdParam }));
  }, [patientIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = {
        patient_id: form.patient_id,
        treatment_date: form.treatment_date,
        service_code: form.service_code.trim() || undefined,
        prescription_id: form.prescription_id.trim() || undefined,
        duration_minutes: form.duration_minutes
          ? parseInt(form.duration_minutes, 10)
          : undefined,
        note: form.note.trim() || undefined,
      };
      const t = await api<{ id: string }>("/api/treatment-logs", {
        method: "POST",
        body: JSON.stringify(body),
        token: token!,
      });
      router.push(`/dashboard/treatment-logs?patient_id=${form.patient_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link
        href="/dashboard/treatment-logs"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        Neuer Behandlungsprotokoll-Eintrag
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Patient *</label>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Datum *</label>
            <input
              type="date"
              required
              value={form.treatment_date}
              onChange={(e) => setForm((f) => ({ ...f, treatment_date: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Leistung</label>
            <select
              value={form.service_code}
              onChange={(e) => {
                const svc = services.find((s) => s.code === e.target.value);
                setForm((f) => ({
                  ...f,
                  service_code: e.target.value,
                  duration_minutes: svc?.default_duration_min?.toString() ?? f.duration_minutes,
                }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">— Bitte wählen oder frei eintragen —</option>
              {services.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.code} – {s.name}
                  {s.amount_eur ? ` (${s.amount_eur} €)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.patient_id && prescriptions.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Verordnung (optional)
            </label>
            <select
              value={form.prescription_id}
              onChange={(e) => setForm((f) => ({ ...f, prescription_id: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">— Keine Verordnung —</option>
              {prescriptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {new Date(p.prescription_date).toLocaleDateString("de-DE")}
                  {p.prescription_number ? ` · ${p.prescription_number}` : ""}
                  {p.zuweiser_name ? ` · ${p.zuweiser_name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Dauer (Minuten)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            placeholder="z.B. 30"
            value={form.duration_minutes}
            onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-32"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notiz</label>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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
            href="/dashboard/treatment-logs"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
