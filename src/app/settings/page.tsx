"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/client";
import { inr } from "@/lib/format";
import { HOLIDAYS } from "@/lib/market-hours";
import { Card, SectionTitle } from "@/components/ui";

interface AccountResp {
  cash: number;
  startingCapital: number;
  brokeragePerOrder: number;
  holdingsCount: number;
  openOrdersCount: number;
  realizedPl: number;
}

export default function SettingsPage() {
  const { data: account, mutate: mutateAccount } = useSWR<AccountResp>("/api/account", fetcher);
  const { mutate } = useSWRConfig();
  const [capital, setCapital] = useState("1000000");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reset = async () => {
    if (confirm !== "RESET") {
      setMsg("Type RESET in the box to confirm.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", startingCapital: Number(capital) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Reset failed");
      setMsg(`Account reset — fresh ${inr(body.cash)} paper capital.`);
      setConfirm("");
      mutateAccount();
      mutate("/api/portfolio");
      mutate("/api/orders");
      mutate("/api/watchlist");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400">Paper account controls, data source info and session details.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Paper account</SectionTitle>
          <div className="tnum space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Cash</span><span className="font-semibold">{account ? inr(account.cash) : "…"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Starting capital</span><span>{account ? inr(account.startingCapital) : "…"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Open positions</span><span>{account?.holdingsCount ?? "…"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Open orders</span><span>{account?.openOrdersCount ?? "…"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Brokerage / order</span><span>{account ? inr(account.brokeragePerOrder) : "…"}</span></div>
          </div>
        </Card>

        <Card className="border-rose-900/50 p-5">
          <SectionTitle>Reset account</SectionTitle>
          <p className="text-sm text-slate-400">Wipes holdings, orders, watchlist and restores fresh virtual cash.</p>
          <label className="mt-3 block text-xs font-medium text-slate-400">Fresh starting capital (₹)</label>
          <input
            value={capital}
            onChange={(e) => setCapital(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="tnum mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
          />
          <label className="mt-3 block text-xs font-medium text-slate-400">Type RESET to confirm</label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RESET"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
          />
          <button
            onClick={reset}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {busy ? "Resetting…" : "Reset paper account"}
          </button>
          {msg && <p className="mt-3 text-sm text-slate-300">{msg}</p>}
        </Card>

        <Card className="p-5">
          <SectionTitle>Market data</SectionTitle>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            <li>Primary feed: <b>Yahoo Finance</b> (free, no API key) — NSE as <code className="rounded bg-slate-800 px-1">XXX.NS</code>, BSE as <code className="rounded bg-slate-800 px-1">XXX.BO</code>.</li>
            <li>Quotes may be delayed ~15 minutes during live sessions.</li>
            <li>If Yahoo is unreachable, the app falls back to a <b>simulated feed</b> (amber <b>SIM</b> badge) so trading practice never breaks.</li>
            <li>When the market is closed you see last traded prices (<b>EOD</b> badge).</li>
          </ul>
        </Card>

        <Card className="p-5">
          <SectionTitle>Session & holidays</SectionTitle>
          <p className="text-sm text-slate-300">NSE/BSE equity: <b>Mon–Fri, 9:15 AM – 3:30 PM IST</b> (pre-open 9:00–9:15).</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Configured holidays</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-300">
            {HOLIDAYS.map((h) => (
              <li key={h.date} className="tnum flex justify-between">
                <span>{h.name}</span>
                <span className="text-slate-500">{h.date}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Edit <code className="rounded bg-slate-800 px-1">src/lib/market-hours.ts</code> to keep this in sync with the official NSE calendar.</p>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Going live later? (Zerodha-ready architecture)</SectionTitle>
          <p className="text-sm leading-relaxed text-slate-300">
            The order engine is broker-agnostic — see <code className="rounded bg-slate-800 px-1">src/lib/broker.ts</code>.
            To connect a real broker one day (e.g. Zerodha Kite Connect): install <code className="rounded bg-slate-800 px-1">kiteconnect</code>,
            implement the <code className="rounded bg-slate-800 px-1">BrokerAdapter</code> interface with your API key/secret from
            <code className="rounded bg-slate-800 px-1">.env</code>, and flip the switch in <code className="rounded bg-slate-800 px-1">getBroker()</code>.
            No UI or API-route changes needed.
          </p>
        </Card>
      </div>
    </div>
  );
}
