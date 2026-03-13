"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, Zuweiser } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function ZuweiserDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const id = params.id as string;
  const [zuweiser, setZuweiser] = useState<Zuweiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (!token || !id) return;
    api<Zuweiser>(`/api/zuweiser/${id}`, { token })
      .then((z) => {
        setZuweiser(z);
        setForm({
          title: z.title || "",
          first_name: z.first_name || "",
          last_name: z.last_name || "",
          specialization: z.specialization || "",
          practice_name: z.practice_name || "",
          address: z.address || "",
          phone: z.phone || "",
          email: z.email || "",
          fax: z.fax || "",
          notes: z.notes || "",
          is_active: z.is_active ?? true,
        });
      })
      .catch(() => setZuweiser(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zuweiser) return;
    setError("");
    setSaving(true);
    try {
      const body = {
        title: (form.title as string).trim() || undefined,
        first_name: (form.first_name as string).trim(),
        last_name: (form.last_name as string).trim(),
        specialization: (form.specialization as string).trim() || undefined,
        practice_name: (form.practice_name as string).trim() || undefined,
        address: (form.address as string).trim() || undefined,
        phone: (form.phone as string).trim() || undefined,
        email: (form.email as string).trim() || undefined,
        fax: (form.fax as string).trim() || undefined,
        notes: (form.notes as string).trim() || undefined,
        is_active: form.is_active,
      };
      const updated = await api<Zuweiser>(`/api/zuweiser/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        token: token!,
      });
      setZuweiser(updated);
      setForm({
        ...form,
        title: updated.title || "",
        first_name: updated.first_name || "",
        last_name: updated.last_name || "",
        specialization: updated.specialization || "",
        practice_name: updated.practice_name || "",
        address: updated.address || "",
        phone: updated.phone || "",
        email: updated.email || "",
        fax: updated.fax || "",
        notes: updated.notes || "",
        is_active: updated.is_active ?? true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!zuweiser) {
    return (
      <div>
        <p className="text-slate-600">Zuweiser nicht gefunden.</p>
        <Link href="/dashboard/zuweiser" className="mt-4 text-primary-600 hover:underline">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const displayName = [zuweiser.title, zuweiser.first_name, zuweiser.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <Link
        href="/dashboard/zuweiser"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-800">{displayName}</h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titel</label>
            <input
              type="text"
              placeholder="z.B. Dr. med."
              value={(form.title as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vorname *</label>
            <input
              type="text"
              required
              value={(form.first_name as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nachname *</label>
            <input
              type="text"
              required
              value={(form.last_name as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fachrichtung</label>
            <input
              type="text"
              placeholder="z.B. Orthopädie"
              value={(form.specialization as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Praxisname</label>
            <input
              type="text"
              value={(form.practice_name as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, practice_name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Adresse</label>
          <input
            type="text"
            value={(form.address as string) ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefon</label>
            <input
              type="tel"
              value={(form.phone as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-Mail</label>
            <input
              type="email"
              value={(form.email as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fax</label>
            <input
              type="tel"
              value={(form.fax as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, fax: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={!!form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
            Aktiv (in Auswahl sichtbar)
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notizen</label>
          <textarea
            rows={3}
            value={(form.notes as string) ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? "Wird gespeichert…" : "Speichern"}
          </button>
          <Link
            href="/dashboard/zuweiser"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
