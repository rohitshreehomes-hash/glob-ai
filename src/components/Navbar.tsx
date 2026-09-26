"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { APP_NAME, fetcher } from "@/lib/client";
import { inrShort } from "@/lib/format";
import type { MarketStatus } from "@/lib/market-hours";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/orders", label: "Orders" },
  { href: "/settings", label: "Settings" },
];

function StatusPill() {
  const { data } = useSWR<MarketStatus>("/api/market/status", fetcher, { refreshInterval: 30000 });
  if (!data) return <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">…</span>;
  const styles =
    data.state === "open"
      ? "bg-emerald-500/15 text-emerald-400"
      : data.state === "pre-open"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-slate-800 text-slate-400";
  const dot = data.state === "open" ? "bg-emerald-400" : data.state === "pre-open" ? "bg-amber-400" : "bg-slate-500";
  return (
    <span title={data.reason} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${data.state === "open" ? "animate-pulse" : ""}`} />
      {data.state === "open" ? "Market Open" : data.state === "pre-open" ? "Pre-Open" : "Market Closed"}
    </span>
  );
}

function CashPill() {
  const { data } = useSWR<{ cash: number }>("/api/account", fetcher, { refreshInterval: 30000 });
  return (
    <Link
      href="/portfolio"
      title="Available paper cash"
      className="tnum rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-600"
    >
      {data ? inrShort(data.cash) : "…"}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 via-white to-green-600 text-sm font-black text-slate-900">
            B
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-100">
            {APP_NAME}
            <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-slate-400">
              PAPER
            </span>
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname === l.href ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <StatusPill />
          <CashPill />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-800/60 px-4 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              pathname === l.href ? "bg-slate-800 text-white" : "text-slate-400"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
