"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/client";
import type { MarketStatus } from "@/lib/market-hours";
import IndicesRow from "@/components/IndicesRow";
import Movers from "@/components/Movers";
import MarketTable from "@/components/MarketTable";
import SearchBar from "@/components/SearchBar";

function StatusBanner() {
  const { data } = useSWR<MarketStatus>("/api/market/status", fetcher, { refreshInterval: 30000 });
  if (!data || data.state === "open") return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-300">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-500" />
      {data.reason} <span className="text-slate-500">· Showing last traded prices. Paper orders still execute at LTP.</span>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Indian Markets</h1>
          <p className="text-sm text-slate-400">NSE & BSE live dashboard · Nifty 50, Sensex, Bank Nifty and top stocks</p>
        </div>
        <SearchBar />
      </div>

      <StatusBanner />
      <IndicesRow />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <MarketTable />
        <div className="space-y-6">
          <Movers />
        </div>
      </div>
    </div>
  );
}
