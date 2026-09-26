"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher, POLL_MS, stockUrl } from "@/lib/client";
import { compact, inr } from "@/lib/format";
import { Card, ChangePill, DataBadge, SectionTitle, Spinner } from "./ui";
import type { Quote } from "@/lib/types";

interface Row {
  quote: Quote;
  name: string;
  sector: string;
}

interface MoversResp {
  rows: Row[];
  liveCount: number;
  total: number;
}

type SortKey = "symbol" | "price" | "changePct" | "volume";

export default function MarketTable() {
  const { data, error, mutate } = useSWR<MoversResp>("/api/market/movers", fetcher, {
    refreshInterval: POLL_MS,
  });
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("changePct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sectors = useMemo(() => {
    const s = new Set((data?.rows ?? []).map((r) => r.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [data]);

  const rows = useMemo(() => {
    let list = data?.rows ?? [];
    if (sector !== "ALL") list = list.filter((r) => r.sector === sector);
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((r) => r.quote.base.includes(q) || r.name.toUpperCase().includes(q));
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case "symbol":
          return a.quote.base.localeCompare(b.quote.base) * sortDir;
        case "price":
          return (a.quote.price - b.quote.price) * sortDir;
        case "volume":
          return (a.quote.volume - b.quote.volume) * sortDir;
        case "changePct":
        default:
          return (a.quote.changePct - b.quote.changePct) * sortDir;
      }
    });
    return sorted;
  }, [data, query, sector, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(k === "symbol" ? 1 : -1);
    }
  };

  const Th = ({ label, k, className = "" }: { label: string; k?: SortKey; className?: string }) => (
    <th
      onClick={k ? () => toggleSort(k) : undefined}
      className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${k ? "cursor-pointer select-none hover:text-slate-300" : ""} ${className}`}
    >
      {label}
      {k === sortKey && <span className="ml-1 text-emerald-400">{sortDir === 1 ? "▲" : "▼"}</span>}
    </th>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 px-4 pt-4 md:flex-row md:items-center">
        <SectionTitle
          right={
            data ? (
              <span className="tnum text-xs normal-case text-slate-500">
                {data.liveCount}/{data.total} live
              </span>
            ) : undefined
          }
        >
          All Stocks (NSE)
        </SectionTitle>
        <div className="flex flex-1 flex-col gap-2 pb-1 sm:flex-row md:justify-end">
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All sectors" : s}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter stocks…"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {!data && !error && <Spinner label="Fetching live prices…" />}
      {error && (
        <p className="px-4 pb-4 text-sm text-rose-300">
          Failed to load market data. <button className="underline" onClick={() => mutate()}>Retry</button>
        </p>
      )}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-y border-slate-800 bg-slate-900/80">
                <Th label="Symbol" k="symbol" />
                <Th label="LTP" k="price" className="text-right" />
                <Th label="Change %" k="changePct" className="text-right" />
                <Th label="Day Range" />
                <Th label="Volume" k="volume" className="text-right" />
                <Th label="Prev Close" className="text-right" />
                <Th label="Feed" className="text-right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const q = r.quote;
                const up = q.change >= 0;
                return (
                  <tr key={q.symbol} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                    <td className="px-4 py-2.5">
                      <Link href={stockUrl(q.symbol)} className="block">
                        <span className="text-sm font-semibold text-slate-100 hover:text-emerald-400">{q.base}</span>
                        <span className="block max-w-[220px] truncate text-xs text-slate-500">{r.name}</span>
                      </Link>
                    </td>
                    <td className={`tnum px-4 py-2.5 text-right text-sm font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                      {inr(q.price)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChangePill value={q.changePct} />
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">
                      {inr(q.low)} – {inr(q.high)}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-sm text-slate-300">{compact(q.volume)}</td>
                    <td className="tnum px-4 py-2.5 text-right text-sm text-slate-400">{inr(q.prevClose)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <DataBadge live={q.live} stale={q.stale} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
