"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Prescription, Patient } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function PrescriptionDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const id = params.id as string;
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    api<Prescription>(`/api/prescriptions/${id}`, { token })
      .then((p) => {
        setPrescription(p);
        return p.patient_id
          ? api<Patient>(`/api/patients/${p.patient_id}`, { token })
          : Promise.resolve(null);
      })
      .then(setPatient)
      .catch(() => setPrescription(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div>
        <p className="text-slate-600">Verordnung nicht gefunden.</p>
        <Link
          href="/dashboard/prescriptions"
          className="mt-4 text-primary-600 hover:underline"
        >
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const patientName = patient
    ? `${patient.last_name}, ${patient.first_name}`
    : "—";

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
        Verordnung: {patientName}
      </h1>

      <div className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-500">
            Patient
          </label>
          <Link
            href={`/dashboard/patients/${prescription.patient_id}`}
            className="text-primary-600 hover:underline"
          >
            {patientName}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-500">
              Verordnungsdatum
            </label>
            <p>
              {new Date(prescription.prescription_date).toLocaleDateString(
                "de-DE"
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">
              Gültig bis
            </label>
            <p>
              {prescription.valid_until
                ? new Date(prescription.valid_until).toLocaleDateString("de-DE")
                : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-500">
              Zuweiser
            </label>
            <p>{prescription.zuweiser_name || "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500">
              Rezeptnummer
            </label>
            <p>{prescription.prescription_number || "—"}</p>
          </div>
        </div>

        {prescription.diagnosis_code && (
          <div>
            <label className="block text-sm font-medium text-slate-500">
              Diagnose (ICD-10)
            </label>
            <p>{prescription.diagnosis_code}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-500">
            Leistungen
          </label>
          <ul className="mt-1 list-inside list-disc text-slate-700">
            {prescription.items.map((i) => (
              <li key={i.id}>
                {i.service_code} × {i.quantity}
                {i.note ? ` (${i.note})` : ""}
              </li>
            ))}
          </ul>
        </div>

        {prescription.notes && (
          <div>
            <label className="block text-sm font-medium text-slate-500">
              Notizen
            </label>
            <p className="whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}

        <div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              prescription.status === "active"
                ? "bg-green-100 text-green-800"
                : prescription.status === "used"
                  ? "bg-slate-100 text-slate-700"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {prescription.status}
          </span>
        </div>
      </div>
    </div>
  );
}
