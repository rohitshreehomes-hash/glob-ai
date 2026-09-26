"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher, POLL_MS, stockUrl } from "@/lib/client";
import { inr, pct } from "@/lib/format";
import { Card, ChangePill, SectionTitle, Spinner } from "./ui";
import type { Quote } from "@/lib/types";

interface Row {
  quote: Quote;
  name: string;
  sector: string;
}

interface MoversResp {
  gainers: Row[];
  losers: Row[];
  breadth: { advances: number; declines: number; unchanged: number };
  liveCount: number;
  total: number;
}

function MoverRow({ row }: { row: Row }) {
  const q = row.quote;
  return (
    <Link
      href={stockUrl(q.symbol)}
      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-800/60 px-4 py-2.5 last:border-0 hover:bg-slate-800/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-100">{q.base}</p>
        <p className="truncate text-xs text-slate-500">{row.name}</p>
      </div>
      <span className="tnum text-sm text-slate-200">{inr(q.price)}</span>
      <ChangePill value={q.changePct} className="w-20 text-center" />
    </Link>
  );
}

export default function Movers() {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const { data, error, mutate } = useSWR<MoversResp>("/api/market/movers", fetcher, {
    refreshInterval: POLL_MS,
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <SectionTitle>Top Movers</SectionTitle>
        {data && (
          <span className="tnum text-xs text-slate-500" title="Market breadth">
            <span className="text-emerald-400">▲ {data.breadth.advances}</span>
            {" / "}
            <span className="text-rose-400">▼ {data.breadth.declines}</span>
          </span>
        )}
      </div>
      <div className="flex gap-2 px-4 pb-2">
        {(["gainers", "losers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize ${
              tab === t ? "bg-slate-700 text-white" : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {!data && !error && <Spinner label="Loading movers…" />}
      {error && (
        <p className="px-4 pb-4 text-sm text-rose-300">
          Failed to load. <button className="underline" onClick={() => mutate()}>Retry</button>
        </p>
      )}
      {data && (tab === "gainers" ? data.gainers : data.losers).map((r) => <MoverRow key={r.quote.symbol} row={r} />)}
      <p className="hidden">{pct(0)}</p>
    </Card>
  );
}
