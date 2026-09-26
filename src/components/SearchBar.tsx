"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher, stockUrl } from "@/lib/client";
import { num, pct } from "@/lib/format";
import type { Quote } from "@/lib/types";

interface SearchResult {
  symbol: string;
  base: string;
  name: string;
  sector: string;
  quote: Quote | null;
}

export default function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isLoading } = useSWR<{ results: SearchResult[] }>(
    debounced.length >= 1 ? `/api/stocks/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher
  );

  const go = (symbol: string) => {
    setOpen(false);
    setQ("");
    router.push(stockUrl(symbol));
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && data?.results?.length) go(data.results[0].symbol);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search NSE / BSE stocks — e.g. RELIANCE, HDFCBANK, TCS…"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
      />
      {open && debounced.length >= 1 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {isLoading && <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>}
          {!isLoading && data?.results?.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">No matches found.</p>
          )}
          {data?.results?.map((r) => (
            <button
              key={r.symbol}
              onClick={() => go(r.symbol)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{r.base}</p>
                <p className="truncate text-xs text-slate-500">{r.name} · {r.sector}</p>
              </div>
              {r.quote && (
                <div className="text-right">
                  <p className="tnum text-sm text-slate-200">{num(r.quote.price)}</p>
                  <p className={`tnum text-xs ${r.quote.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {pct(r.quote.changePct)}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
