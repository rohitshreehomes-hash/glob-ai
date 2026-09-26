"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher, stockUrl } from "@/lib/client";
import { num, pct } from "@/lib/format";
import type { Quote } from "@/lib/types";

interface MoversResp {
  gainers: { quote: Quote; name: string }[];
  losers: { quote: Quote; name: string }[];
}

function TapeItem({ q }: { q: Quote }) {
  const up = q.change >= 0;
  return (
    <Link href={stockUrl(q.symbol)} className="mx-4 inline-flex items-center gap-2 whitespace-nowrap text-xs hover:opacity-80">
      <span className="font-bold text-slate-200">{q.base}</span>
      <span className="tnum text-slate-300">{num(q.price)}</span>
      <span className={`tnum font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>{pct(q.changePct)}</span>
    </Link>
  );
}

export default function TickerTape() {
  const { data } = useSWR<MoversResp>("/api/market/movers", fetcher, { refreshInterval: 30000 });
  if (!data) return null;
  const items = [...data.gainers.slice(0, 6), ...data.losers.slice(0, 6)];
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-b border-slate-800 bg-slate-900/50 py-1.5">
      <div className="tape-scroll inline-flex">
        {doubled.map((r, i) => (
          <TapeItem key={`${r.quote.symbol}-${i}`} q={r.quote} />
        ))}
      </div>
    </div>
  );
}
