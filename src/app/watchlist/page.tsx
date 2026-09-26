"use client";

import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, POLL_MS, stockUrl } from "@/lib/client";
import { inr } from "@/lib/format";
import { Card, ChangePill, DataBadge, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import SearchBar from "@/components/SearchBar";
import type { Quote } from "@/lib/types";

interface WatchItem {
  symbol: string;
  name: string;
  quote: Quote | null;
}

export default function WatchlistPage() {
  const { data, error, mutate } = useSWR<{ watchlist: WatchItem[] }>("/api/watchlist", fetcher, {
    refreshInterval: POLL_MS,
  });
  const { mutate: globalMutate } = useSWRConfig();

  const remove = async (symbol: string) => {
    await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    mutate();
    globalMutate("/api/watchlist");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-sm text-slate-400">Track your favourite NSE / BSE stocks with live prices.</p>
      </div>
      <SearchBar />

      {!data && !error && <Spinner label="Loading watchlist…" />}
      {error && <EmptyState title="Failed to load watchlist" hint="Please refresh the page." />}
      {data && data.watchlist.length === 0 && (
        <EmptyState
          title="Your watchlist is empty"
          hint="Search any stock above, open it, and press “+ Watchlist”."
        />
      )}
      {data && data.watchlist.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 pt-4">
            <SectionTitle right={<span className="tnum text-xs normal-case text-slate-500">{data.watchlist.length} stocks</span>}>
              Tracked stocks
            </SectionTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-y border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Symbol</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">LTP</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Change %</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Day Range</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Feed</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.watchlist.map((w) => {
                  const q = w.quote;
                  return (
                    <tr key={w.symbol} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <Link href={stockUrl(w.symbol)} className="block">
                          <span className="text-sm font-semibold text-slate-100 hover:text-emerald-400">
                            {w.symbol.replace(/\.N[SB]$/, "")}
                          </span>
                          <span className="block text-xs text-slate-500">{w.name}</span>
                        </Link>
                      </td>
                      <td className="tnum px-4 py-3 text-right text-sm font-semibold text-slate-100">
                        {q ? inr(q.price) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{q ? <ChangePill value={q.changePct} /> : "—"}</td>
                      <td className="tnum whitespace-nowrap px-4 py-3 text-right text-xs text-slate-400">
                        {q ? `${inr(q.low)} – ${inr(q.high)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{q ? <DataBadge live={q.live} stale={q.stale} /> : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => remove(w.symbol)} className="text-xs text-slate-500 hover:text-rose-400">
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
