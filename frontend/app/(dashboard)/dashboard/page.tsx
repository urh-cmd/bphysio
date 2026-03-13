"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Users, Activity } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">
        Willkommen, {user?.display_name || user?.email}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/patients"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="rounded-lg bg-primary-50 p-3">
            <Users className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Patienten</h2>
            <p className="text-sm text-slate-500">Patienten verwalten</p>
          </div>
        </Link>
        <Link
          href="/dashboard/movement"
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="rounded-lg bg-primary-50 p-3">
            <Activity className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Ganganalyse</h2>
            <p className="text-sm text-slate-500">Video-Upload und Analyse</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
