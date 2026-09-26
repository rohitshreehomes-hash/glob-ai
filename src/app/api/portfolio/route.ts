import { NextResponse } from "next/server";
import { getCash, getHoldings, getStartingCapital, totalRealizedPl } from "@/lib/db";
import { getQuotes } from "@/lib/yahoo";
import { displayName } from "@/lib/symbols";
import { matchOpenOrders } from "@/lib/orders";
import type { EnrichedHolding } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  await matchOpenOrders().catch(() => null);
  const holdings = getHoldings();
  const quotes = holdings.length ? await getQuotes(holdings.map((h) => h.symbol)) : [];
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));

  const enriched: (EnrichedHolding & { name: string })[] = holdings.map((h) => {
    const q = qmap.get(h.symbol) ?? null;
    const price = q?.price ?? h.avgPrice;
    const invested = h.qty * h.avgPrice;
    const current = h.qty * price;
    const pnl = current - invested;
    const dayPnl = q ? (q.price - q.prevClose) * h.qty : 0;
    return {
      ...h,
      name: displayName(h.symbol),
      quote: q,
      invested,
      current,
      pnl,
      pnlPct: invested ? (pnl / invested) * 100 : 0,
      dayPnl,
    };
  });

  const invested = enriched.reduce((s, h) => s + h.invested, 0);
  const current = enriched.reduce((s, h) => s + h.current, 0);
  const dayPnl = enriched.reduce((s, h) => s + h.dayPnl, 0);
  const cash = getCash();
  const startingCapital = getStartingCapital();
  const totalValue = cash + current;
  const totalPnl = totalValue - startingCapital;

  return NextResponse.json({
    holdings: enriched,
    summary: {
      cash,
      startingCapital,
      invested,
      current,
      dayPnl,
      unrealizedPnl: current - invested,
      realizedPl: totalRealizedPl(),
      totalValue,
      totalPnl,
      totalPnlPct: startingCapital ? (totalPnl / startingCapital) * 100 : 0,
    },
  });
}
