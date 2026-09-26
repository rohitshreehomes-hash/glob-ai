"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher, POLL_MS, stockUrl } from "@/lib/client";
import { inr, pct } from "@/lib/format";
import { Card, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import type { EnrichedHolding } from "@/lib/types";

interface PortfolioResp {
  holdings: (EnrichedHolding & { name: string })[];
  summary: {
    cash: number;
    startingCapital: number;
    invested: number;
    current: number;
    dayPnl: number;
    unrealizedPnl: number;
    realizedPl: number;
    totalValue: number;
    totalPnl: number;
    totalPnlPct: number;
  };
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-slate-100";
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`tnum mt-1 text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="tnum mt-0.5 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

const tone = (v: number) => (v > 0 ? "up" : v < 0 ? "down" : undefined);

export default function PortfolioPage() {
  const { data, error } = useSWR<PortfolioResp>("/api/portfolio", fetcher, { refreshInterval: POLL_MS });

  if (!data && !error) return <Spinner label="Loading portfolio…" />;
  if (error || !data) return <EmptyState title="Failed to load portfolio" hint="Please refresh the page." />;

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-sm text-slate-400">Holdings, P&L and cash — marked to live market prices.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total value" value={inr(s.totalValue)} sub={`Started ${inr(s.startingCapital)}`} />
        <SummaryCard label="Total P&L" value={`${s.totalPnl >= 0 ? "+" : ""}${inr(s.totalPnl)}`} sub={pct(s.totalPnlPct)} tone={tone(s.totalPnl)} />
        <SummaryCard label="Day P&L" value={`${s.dayPnl >= 0 ? "+" : ""}${inr(s.dayPnl)}`} tone={tone(s.dayPnl)} />
        <SummaryCard label="Cash available" value={inr(s.cash)} />
        <SummaryCard label="Invested" value={inr(s.invested)} />
        <SummaryCard label="Current value" value={inr(s.current)} />
        <SummaryCard label="Unrealised P&L" value={`${s.unrealizedPnl >= 0 ? "+" : ""}${inr(s.unrealizedPnl)}`} tone={tone(s.unrealizedPnl)} />
        <SummaryCard label="Realised P&L" value={`${s.realizedPl >= 0 ? "+" : ""}${inr(s.realizedPl)}`} tone={tone(s.realizedPl)} />
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4">
          <SectionTitle right={<span className="tnum text-xs normal-case text-slate-500">{data.holdings.length} positions</span>}>
            Holdings
          </SectionTitle>
        </div>
        {data.holdings.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState title="No holdings yet" hint="Buy your first stock from the dashboard to start paper trading." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-y border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Stock</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Price</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">LTP</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Invested</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Current</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">P&L</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Trade</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <tr key={h.symbol} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link href={stockUrl(h.symbol)} className="block">
                        <span className="text-sm font-semibold text-slate-100 hover:text-emerald-400">
                          {h.symbol.replace(/\.N[SB]$/, "")}
                        </span>
                        <span className="block text-xs text-slate-500">{h.name}</span>
                      </Link>
                    </td>
                    <td className="tnum px-4 py-3 text-right text-sm text-slate-200">{h.qty}</td>
                    <td className="tnum px-4 py-3 text-right text-sm text-slate-300">{inr(h.avgPrice)}</td>
                    <td className="tnum px-4 py-3 text-right text-sm font-semibold text-slate-100">
                      {h.quote ? inr(h.quote.price) : inr(h.avgPrice)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-sm text-slate-300">{inr(h.invested)}</td>
                    <td className="tnum px-4 py-3 text-right text-sm text-slate-300">{inr(h.current)}</td>
                    <td className={`tnum px-4 py-3 text-right text-sm font-semibold ${h.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {h.pnl >= 0 ? "+" : ""}{inr(h.pnl)}
                      <span className="block text-xs font-normal opacity-80">{pct(h.pnlPct)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs font-bold">
                        <Link href={`${stockUrl(h.symbol)}?side=BUY`} className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-400 hover:bg-emerald-500/25">BUY</Link>
                        <Link href={`${stockUrl(h.symbol)}?side=SELL`} className="rounded bg-rose-500/15 px-2 py-1 text-rose-400 hover:bg-rose-500/25">SELL</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
