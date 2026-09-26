"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import dynamic from "next/dynamic";
import { fetcher, POLL_MS } from "@/lib/client";
import { compact, dateTimeIST, inr } from "@/lib/format";
import { Card, ChangePill, DataBadge, ErrorBox, SectionTitle, Spinner } from "@/components/ui";
import OrderPanel from "@/components/OrderPanel";
import type { Order, OrderSide, Quote } from "@/lib/types";

const StockChart = dynamic(() => import("@/components/StockChart"), {
  ssr: false,
  loading: () => <Spinner label="Loading chart…" />,
});

interface QuoteResp {
  quotes: Record<string, Quote>;
}
interface AccountResp {
  cash: number;
}
interface PortfolioResp {
  holdings: { symbol: string; qty: number; avgPrice: number }[];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="tnum mt-0.5 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function SymbolOrders({ symbol }: { symbol: string }) {
  const { data } = useSWR<{ orders: Order[] }>(`/api/orders?symbol=${encodeURIComponent(symbol)}`, fetcher, {
    refreshInterval: POLL_MS,
  });
  const orders = useMemo(() => (data?.orders ?? []).slice(0, 8), [data]);
  if (!orders.length) return null;
  return (
    <Card className="p-4">
      <SectionTitle>Your recent orders</SectionTitle>
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="tnum flex items-center justify-between text-xs">
            <span className={`font-bold ${o.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
              {o.side} {o.qty} <span className="font-normal text-slate-500">· {o.type}</span>
            </span>
            <span className="text-slate-400">{dateTimeIST(o.placedAt)}</span>
            <span
              className={`rounded px-1.5 py-0.5 font-bold ${
                o.status === "FILLED"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : o.status === "OPEN"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {o.status}
            </span>
          </div>
        ))}
      </div>
      <Link href="/orders" className="mt-3 inline-block text-xs text-emerald-400 hover:underline">
        View all orders →
      </Link>
    </Card>
  );
}

export default function StockPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  const searchParams = useSearchParams();
  const defaultSide = (searchParams.get("side")?.toUpperCase() === "SELL" ? "SELL" : "BUY") as OrderSide;
  const { mutate } = useSWRConfig();
  const [wlBusy, setWlBusy] = useState(false);
  const [wlMsg, setWlMsg] = useState("");

  const { data, error } = useSWR<QuoteResp>(
    `/api/stocks/quote?symbols=${encodeURIComponent(symbol)}`,
    fetcher,
    { refreshInterval: POLL_MS }
  );
  const { data: account } = useSWR<AccountResp>("/api/account", fetcher);
  const { data: portfolio } = useSWR<PortfolioResp>("/api/portfolio", fetcher);

  const quote = data?.quotes?.[symbol] ?? null;
  const holdingQty = portfolio?.holdings?.find((h) => h.symbol === symbol)?.qty ?? 0;

  const addWatch = async () => {
    setWlBusy(true);
    setWlMsg("");
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    setWlBusy(false);
    if (res.ok) {
      setWlMsg("Added to watchlist ✓");
      mutate("/api/watchlist");
    } else {
      const b = await res.json().catch(() => ({}));
      setWlMsg(b.error || "Failed to add");
    }
  };

  if (error) return <ErrorBox message="Failed to load this stock. It may be an unknown symbol." />;
  if (!quote) return <Spinner label={`Loading ${symbol}…`} />;

  const base = symbol.replace(/\.N[SB]$/, "").replace(/^\^/, "");
  const dayRangePct =
    quote.high > quote.low ? ((quote.price - quote.low) / (quote.high - quote.low)) * 100 : 50;

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{base}</h1>
            <DataBadge live={quote.live} stale={quote.stale} />
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
              {quote.exchange}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className={`tnum text-3xl font-bold ${quote.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {inr(quote.price)}
            </span>
            <ChangePill value={quote.changePct} />
            <span className={`tnum text-sm ${quote.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {quote.change >= 0 ? "+" : ""}{inr(Math.abs(quote.change)).replace("₹", "₹")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addWatch}
            disabled={wlBusy}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 disabled:opacity-50"
          >
            {wlBusy ? "Adding…" : "+ Watchlist"}
          </button>
        </div>
      </div>
      {wlMsg && <p className="text-sm text-emerald-400">{wlMsg}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <StockChart symbol={symbol} />

          {/* Day range */}
          <Card className="p-4">
            <SectionTitle>Day range</SectionTitle>
            <div className="flex items-center gap-3">
              <span className="tnum text-xs text-slate-400">L {inr(quote.low)}</span>
              <div className="relative h-1.5 flex-1 rounded-full bg-slate-800">
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-slate-200"
                  style={{ left: `${Math.min(100, Math.max(0, dayRangePct))}%` }}
                />
              </div>
              <span className="tnum text-xs text-slate-400">H {inr(quote.high)}</span>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <SectionTitle>Key statistics</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Open" value={inr(quote.open)} />
              <Stat label="Prev. close" value={inr(quote.prevClose)} />
              <Stat label="Volume" value={compact(quote.volume)} />
              <Stat label="Currency" value={quote.currency} />
              <Stat label="52W High" value={quote.week52High ? inr(quote.week52High) : "—"} />
              <Stat label="52W Low" value={quote.week52Low ? inr(quote.week52Low) : "—"} />
              <Stat label="Day High" value={inr(quote.high)} />
              <Stat label="Day Low" value={inr(quote.low)} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {!quote.symbol.startsWith("^") ? (
            <OrderPanel
              symbol={symbol}
              quote={quote}
              defaultSide={defaultSide}
              cash={account?.cash ?? 0}
              holdingQty={holdingQty}
            />
          ) : (
            <Card className="p-4 text-sm text-slate-400">
              Indices are not tradable in this simulator. Pick an equity stock to paper-trade.
            </Card>
          )}
          <SymbolOrders symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
