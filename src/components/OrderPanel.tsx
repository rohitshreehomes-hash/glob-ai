"use client";

import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { inr } from "@/lib/format";
import type { OrderSide, OrderType, Quote } from "@/lib/types";
import { Card } from "./ui";

interface Props {
  symbol: string;
  quote: Quote | null;
  defaultSide?: OrderSide;
  cash: number;
  holdingQty: number;
}

export default function OrderPanel({ symbol, quote, defaultSide = "BUY", cash, holdingQty }: Props) {
  const [side, setSide] = useState<OrderSide>(defaultSide);
  const [type, setType] = useState<OrderType>("MARKET");
  const [qty, setQty] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { mutate } = useSWRConfig();

  useEffect(() => setSide(defaultSide), [defaultSide]);
  useEffect(() => {
    if (quote && !limitPrice) setLimitPrice(quote.price.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.symbol]);

  const qtyNum = Math.floor(Number(qty));
  const px = type === "MARKET" ? (quote?.price ?? 0) : Number(limitPrice);
  const estValue = useMemo(
    () => (Number.isFinite(qtyNum) && Number.isFinite(px) ? qtyNum * px : 0),
    [qtyNum, px]
  );
  const maxBuy = quote && quote.price > 0 ? Math.floor(cash / quote.price) : 0;

  const place = async () => {
    setMsg(null);
    if (!qtyNum || qtyNum <= 0) return setMsg({ ok: false, text: "Enter a valid quantity." });
    if (type === "LIMIT" && (!Number(limitPrice) || Number(limitPrice) <= 0))
      return setMsg({ ok: false, text: "Enter a valid limit price." });
    if (side === "SELL" && qtyNum > holdingQty)
      return setMsg({ ok: false, text: `You hold only ${holdingQty} shares.` });
    if (side === "BUY" && estValue > cash)
      return setMsg({ ok: false, text: "Insufficient cash for this order." });

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          qty: qtyNum,
          type,
          limitPrice: type === "LIMIT" ? Number(limitPrice) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Order failed");
      const o = body.order;
      setMsg({
        ok: o.status !== "REJECTED",
        text:
          o.status === "FILLED"
            ? `${side} ${qtyNum} @ ${inr(o.fillPrice)} — FILLED`
            : o.status === "OPEN"
              ? `Limit order placed — OPEN (id #${o.id})`
              : `Order ${o.status}: ${o.note ?? ""}`,
      });
      mutate("/api/account");
      mutate("/api/portfolio");
      mutate("/api/orders");
      mutate((k: unknown) => typeof k === "string" && k.startsWith("/api/orders"));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Order failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-2">
        {(["BUY", "SELL"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`rounded-lg py-2 text-sm font-bold ${
              side === s
                ? s === "BUY"
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["MARKET", "LIMIT"] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-lg border py-1.5 text-xs font-semibold ${
              type === t ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs font-medium text-slate-400">Quantity</label>
      <div className="mt-1 flex items-center gap-2">
        <button onClick={() => setQty(String(Math.max(1, (qtyNum || 1) - 1)))} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700">−</button>
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          className="tnum w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
        <button onClick={() => setQty(String((qtyNum || 0) + 1))} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700">+</button>
      </div>

      {type === "LIMIT" && (
        <>
          <label className="mt-3 block text-xs font-medium text-slate-400">Limit price (₹)</label>
          <input
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="tnum mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </>
      )}

      <div className="tnum mt-4 space-y-1.5 rounded-lg bg-slate-800/50 p-3 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Est. value</span>
          <span className="font-semibold text-slate-100">{inr(estValue)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Available cash</span>
          <span className="text-slate-200">{inr(cash)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Your holding</span>
          <span className="text-slate-200">{holdingQty} shares</span>
        </div>
        {side === "BUY" && (
          <button onClick={() => setQty(String(Math.max(0, maxBuy)))} className="text-emerald-400 hover:underline">
            Max: {maxBuy} shares
          </button>
        )}
        {side === "SELL" && holdingQty > 0 && (
          <button onClick={() => setQty(String(holdingQty))} className="text-emerald-400 hover:underline">
            Sell all ({holdingQty})
          </button>
        )}
      </div>

      <button
        onClick={place}
        disabled={busy || !quote}
        className={`mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
          side === "BUY" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
        }`}
      >
        {busy ? "Placing…" : `${side} ${symbol.replace(/\.N[SB]$/, "")}`}
      </button>

      {msg && (
        <p className={`mt-3 rounded-lg p-2.5 text-xs font-medium ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
          {msg.text}
        </p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Paper trading — no real money. Flat ₹20 brokerage per executed order. Limit orders rest as OPEN and fill when the market price touches them.
      </p>
    </Card>
  );
}
