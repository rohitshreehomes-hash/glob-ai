import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/yahoo";
import { STOCKS, STOCK_MAP, toYahoo } from "@/lib/symbols";
import { matchOpenOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  // Match resting limit orders opportunistically (throttled internally)
  const matchP = matchOpenOrders().catch(() => ({ checked: 0, filled: 0 }));

  const symbols = STOCKS.map((s) => toYahoo(s.base));
  const quotes = await getQuotes(symbols);
  await matchP;

  const rows = quotes.map((q) => {
    const info = STOCK_MAP.get(q.base);
    return { quote: q, name: info?.name ?? q.base, sector: info?.sector ?? "—" };
  });

  const sorted = [...rows].sort((a, b) => b.quote.changePct - a.quote.changePct);
  const gainers = sorted.slice(0, 10);
  const losers = sorted.slice(-10).reverse();
  const advances = rows.filter((r) => r.quote.change > 0).length;
  const declines = rows.filter((r) => r.quote.change < 0).length;
  const liveCount = rows.filter((r) => r.quote.live).length;

  return NextResponse.json({
    rows,
    gainers,
    losers,
    breadth: { advances, declines, unchanged: rows.length - advances - declines },
    liveCount,
    total: rows.length,
  });
}
