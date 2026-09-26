"use client";

import useSWR from "swr";
import { fetcher, POLL_MS } from "@/lib/client";
import { num } from "@/lib/format";
import { Card, ChangePill, DataBadge } from "./ui";
import type { Quote } from "@/lib/types";

interface IndexRow {
  yahoo: string;
  name: string;
  short: string;
  quote: Quote | null;
}

export default function IndicesRow() {
  const { data } = useSWR<{ indices: IndexRow[] }>("/api/market/indices", fetcher, {
    refreshInterval: POLL_MS,
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {(data?.indices ?? []).map((idx) => (
        <Card key={idx.yahoo} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-slate-400">{idx.short}</p>
            {idx.quote && <DataBadge live={idx.quote.live} stale={idx.quote.stale} />}
          </div>
          {idx.quote ? (
            <>
              <p className="tnum mt-1 text-lg font-bold text-slate-100">{num(idx.quote.price)}</p>
              <div className="mt-1 flex items-center gap-2">
                <ChangePill value={idx.quote.changePct} />
                <span className={`tnum text-xs ${idx.quote.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {idx.quote.change >= 0 ? "+" : ""}{num(idx.quote.change)}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">…</p>
          )}
        </Card>
      ))}
      {!data && (
        <Card className="col-span-full p-4 text-sm text-slate-500">Loading indices…</Card>
      )}
    </div>
  );
}
