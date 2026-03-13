"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Activity,
  Users,
  LayoutDashboard,
  LogOut,
  FileText,
  Mic,
  ClipboardList,
  Stethoscope,
  Calendar,
  CalendarCheck,
  Clipboard,
  Settings,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/patients", label: "Patienten", icon: Users },
  { href: "/dashboard/movement", label: "Ganganalyse", icon: Activity },
  { href: "/dashboard/records", label: "Akten", icon: FileText },
  { href: "/dashboard/transcripts", label: "Transkription", icon: Mic },
  { href: "/dashboard/training-plans", label: "Trainingspläne", icon: ClipboardList },
  { href: "/dashboard/zuweiser", label: "Zuweiser", icon: Stethoscope },
  { href: "/dashboard/appointments", label: "Termine", icon: Calendar },
  { href: "/dashboard/recalls", label: "Wiedervorstellung", icon: CalendarCheck },
  { href: "/dashboard/treatment-logs", label: "Behandlungsprotokoll", icon: Clipboard },
  { href: "/dashboard/prescriptions", label: "Verordnungen", icon: Receipt },
  { href: "/dashboard/billing", label: "Abrechnungs-Export", icon: FileSpreadsheet },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-primary-500"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <span className="text-xl font-bold text-slate-800">BroPhysio</span>
      </div>

      <nav className="flex-1 gap-1 p-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-2 truncate px-3 text-sm text-slate-500">
          {user?.display_name || user?.email}
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-5 w-5" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
