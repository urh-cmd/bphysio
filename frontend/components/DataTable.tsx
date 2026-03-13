"use client";

import { ReactNode } from "react";

export function DataTable({
  headers,
  children,
  empty,
  loading,
  emptyContent,
}: {
  headers: { label: string; className?: string }[];
  children: ReactNode;
  empty?: boolean;
  loading?: boolean;
  emptyContent?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : empty ? (
        <div className="py-16 text-center text-slate-500">{emptyContent ?? "Keine Einträge."}</div>
      ) : (
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((h) => (
                <th
                  key={h.label}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${h.className ?? ""}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>
        </table>
      )}
    </div>
  );
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={`hover:bg-slate-50 transition-colors ${className}`}>{children}</tr>;
}

export function TableCell({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 text-sm text-slate-700 ${className}`}>
      {children}
    </td>
  );
}
