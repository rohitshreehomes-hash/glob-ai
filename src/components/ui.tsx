"use client";

import type { ReactNode } from "react";
import { pct } from "@/lib/format";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{children}</h2>
      {right}
    </div>
  );
}

export function ChangePill({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  if (value === null || value === undefined || Number.isNaN(value))
    return <span className={`tnum text-slate-400 ${className}`}>—</span>;
  const up = value > 0;
  const flat = value === 0;
  const cls = flat
    ? "bg-slate-800 text-slate-300"
    : up
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-rose-500/15 text-rose-400";
  return (
    <span className={`tnum inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${cls} ${className}`}>
      {pct(value)}
    </span>
  );
}

export function PriceText({ value, compareTo }: { value: number | null | undefined; compareTo?: number }) {
  if (value === null || value === undefined || Number.isNaN(value))
    return <span className="text-slate-500">—</span>;
  const up = compareTo !== undefined ? value >= compareTo : true;
  return (
    <span className={`tnum font-semibold ${compareTo === undefined ? "text-slate-100" : up ? "text-emerald-400" : "text-rose-400"}`}>
      ₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

/** LIVE (market open) / EOD (closed) / SIM (simulated fallback) indicator */
export function DataBadge({ live, stale }: { live: boolean; stale?: boolean }) {
  if (!live)
    return (
      <span title="Simulated data — Yahoo Finance unreachable" className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> SIM
      </span>
    );
  if (stale)
    return (
      <span title="Last traded price — market closed" className="inline-flex items-center gap-1 rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> EOD
      </span>
    );
  return (
    <span title="Live market data" className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      LIVE
    </span>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">
      {message}
      {onRetry && (
        <button onClick={onRetry} className="ml-3 underline hover:text-rose-200">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
      <p className="font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
