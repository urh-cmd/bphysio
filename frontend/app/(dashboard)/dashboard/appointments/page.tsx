"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, AdminAppointment, AdminSlot, Therapist } from "@/lib/api";
import { Calendar, CalendarPlus, Loader2, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";

function canDelete(roles?: string[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => r === "admin" || r === "therapeut");
}

export default function AppointmentsPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"appointments" | "slots">("appointments");
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creatingTherapist, setCreatingTherapist] = useState(false);
  const [newTherapistName, setNewTherapistName] = useState("");
  const [newTherapistEmail, setNewTherapistEmail] = useState("");
  const [fromDate, setFromDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadAppointments = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (fromDate) params.set("from_date", `${fromDate}T00:00:00`);
    if (toDate) params.set("to_date", `${toDate}T23:59:59`);
    api<AdminAppointment[]>(`/api/appointments/admin/appointments?${params}`, { token })
      .then(setAppointments)
      .catch(() => setAppointments([]));
  };

  const loadSlots = async () => {
    if (!token) return;
    const params = new URLSearchParams({
      from_date: `${fromDate}T00:00:00`,
      to_date: `${toDate}T23:59:59`,
    });
    api<AdminSlot[]>(`/api/appointments/admin/slots?${params}`, { token })
      .then(setSlots)
      .catch(() => setSlots([]));
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    if (tab === "appointments") {
      loadAppointments().finally(() => setLoading(false));
    } else {
      loadSlots().finally(() => setLoading(false));
    }
  }, [token, tab, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    api<Therapist[]>(`/api/appointments/therapists`, { token })
      .then(setTherapists)
      .catch(() => setTherapists([]));
  }, [token]);

  const handleGenerateSlots = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const res = await api<{ message: string }>(`/api/appointments/admin/slots/generate`, {
        method: "POST",
        body: JSON.stringify({
          from_date: `${fromDate}T00:00:00`,
          to_date: `${toDate}T23:59:59`,
        }),
        token,
      });
      alert(res.message);
      loadSlots();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fehler beim Generieren");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Terminbuchung wirklich löschen? Der Slot wird wieder freigegeben.")) return;
    setDeleteId(id);
    try {
      await api(`/api/appointments/admin/appointments/${id}`, { method: "DELETE", token: token! });
      loadAppointments();
    } catch {
      alert("Löschen fehlgeschlagen");
    } finally {
      setDeleteId(null);
    }
  };

  const handleCreateTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTherapistName.trim() || !newTherapistEmail.trim()) return;
    setCreatingTherapist(true);
    try {
      await api<{ id: string }>(`/api/appointments/admin/therapists`, {
        method: "POST",
        body: JSON.stringify({ name: newTherapistName.trim(), email: newTherapistEmail.trim() }),
        token,
      });
      setNewTherapistName("");
      setNewTherapistEmail("");
      api<Therapist[]>(`/api/appointments/therapists`, { token }).then(setTherapists);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler");
    } finally {
      setCreatingTherapist(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-800">
        <Calendar className="h-7 w-7" />
        Termin-Verwaltung
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setTab("appointments")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            tab === "appointments"
              ? "bg-primary-500 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Buchungen
        </button>
        <button
          onClick={() => setTab("slots")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            tab === "slots"
              ? "bg-primary-500 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Slots
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <span className="text-slate-500">bis</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        {tab === "slots" && (
          <button
            onClick={handleGenerateSlots}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            Slots generieren
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : tab === "appointments" ? (
          appointments.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              Keine Buchungen im gewählten Zeitraum.
              <p className="mt-2 text-sm">
                Öffentliche Buchung: <a href="/buchen" className="text-primary-600 hover:underline">/buchen</a>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Datum/Zeit</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Patient</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Therapeut</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    {canDelete(user?.roles) && (
                      <th className="px-4 py-3 text-right font-medium text-slate-700">Aktionen</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {format(new Date(a.start_time), "dd.MM.yyyy HH:mm", { locale: de })}
                        <span className="text-slate-400"> – </span>
                        {format(new Date(a.end_time), "HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        {a.patient_name}
                        <span className="block text-xs text-slate-500">{a.patient_email}</span>
                      </td>
                      <td className="px-4 py-3">{a.therapist_name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            a.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : a.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      {canDelete(user?.roles) && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteAppointment(a.id)}
                            disabled={deleteId === a.id}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          slots.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              Keine Slots im gewählten Zeitraum.
              {therapists.length === 0 ? (
                <div className="mx-auto max-w-sm">
                  <p className="mb-4 text-sm">Zuerst mindestens einen Therapeuten anlegen.</p>
                  <form onSubmit={handleCreateTherapist} className="flex flex-col gap-2 text-left">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newTherapistName}
                      onChange={(e) => setNewTherapistName(e.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2"
                      required
                    />
                    <input
                      type="email"
                      placeholder="E-Mail"
                      value={newTherapistEmail}
                      onChange={(e) => setNewTherapistEmail(e.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2"
                      required
                    />
                    <button
                      type="submit"
                      disabled={creatingTherapist}
                      className="rounded-md bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
                    >
                      {creatingTherapist ? "..." : "Therapeut anlegen"}
                    </button>
                  </form>
                </div>
              ) : (
                <p className="mt-2 text-sm">Klicke auf „Slots generieren“ um Terminslots zu erstellen.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Datum/Zeit</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Therapeut</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Patient</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {format(new Date(s.start_time), "dd.MM.yyyy HH:mm", { locale: de })}
                        <span className="text-slate-400"> – </span>
                        {format(new Date(s.end_time), "HH:mm")}
                      </td>
                      <td className="px-4 py-3">{s.therapist_name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            s.is_booked ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                          }`}
                        >
                          {s.is_booked ? "gebucht" : "frei"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.patient_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
