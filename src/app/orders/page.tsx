"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher, POLL_MS, stockUrl } from "@/lib/client";
import { dateTimeIST, inr } from "@/lib/format";
import { Card, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import type { Order } from "@/lib/types";

function StatusBadge({ status }: { status: Order["status"] }) {
  const cls =
    status === "FILLED"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "OPEN"
        ? "bg-amber-500/15 text-amber-400"
        : status === "CANCELLED"
          ? "bg-slate-700/60 text-slate-300"
          : "bg-rose-500/15 text-rose-400";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${cls}`}>{status}</span>;
}

export default function OrdersPage() {
  const { data, error, mutate } = useSWR<{ orders: Order[] }>("/api/orders", fetcher, {
    refreshInterval: POLL_MS,
  });

  const cancel = async (id: number) => {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    mutate();
  };

  if (!data && !error) return <Spinner label="Loading orders…" />;
  if (error || !data) return <EmptyState title="Failed to load orders" />;

  const open = data.orders.filter((o) => o.status === "OPEN");
  const history = data.orders.filter((o) => o.status !== "OPEN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-slate-400">Open limit orders auto-fill when the market price touches them.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4">
          <SectionTitle right={<span className="tnum text-xs normal-case text-slate-500">{open.length} open</span>}>
            Open orders
          </SectionTitle>
        </div>
        {open.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500">No open orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-y border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Symbol</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Side</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Limit</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Placed</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {open.map((o) => (
                  <tr key={o.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                    <td className="px-4 py-2.5">
                      <Link href={stockUrl(o.symbol)} className="text-sm font-semibold text-slate-100 hover:text-emerald-400">
                        {o.symbol.replace(/\.N[SB]$/, "")}
                      </Link>
                    </td>
                    <td className={`px-4 py-2.5 text-sm font-bold ${o.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>{o.side}</td>
                    <td className="tnum px-4 py-2.5 text-right text-sm">{o.qty}</td>
                    <td className="tnum px-4 py-2.5 text-right text-sm">{o.limitPrice ? inr(o.limitPrice) : "—"}</td>
                    <td className="tnum whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">{dateTimeIST(o.placedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => cancel(o.id)} className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-rose-500/20 hover:text-rose-300">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 pt-4">
          <SectionTitle right={<span className="tnum text-xs normal-case text-slate-500">{history.length} total</span>}>
            Order history
          </SectionTitle>
        </div>
        {history.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState title="No orders yet" hint="Place your first paper order from any stock page." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-y border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Symbol</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Side</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Fill Price</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                    <td className="tnum px-4 py-2.5 text-xs text-slate-500">#{o.id}</td>
                    <td className="px-4 py-2.5">
                      <Link href={stockUrl(o.symbol)} className="text-sm font-semibold text-slate-100 hover:text-emerald-400">
                        {o.symbol.replace(/\.N[SB]$/, "")}
                      </Link>
                    </td>
                    <td className={`px-4 py-2.5 text-sm font-bold ${o.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>{o.side}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{o.type}</td>
                    <td className="tnum px-4 py-2.5 text-right text-sm">{o.qty}</td>
                    <td className="tnum px-4 py-2.5 text-right text-sm">{o.fillPrice ? inr(o.fillPrice) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.status} />
                      {o.note && <span className="block text-[11px] text-slate-500">{o.note}</span>}
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">{dateTimeIST(o.placedAt)}</td>
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
