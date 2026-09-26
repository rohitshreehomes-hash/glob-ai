import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/yahoo";
import { STOCKS, toYahoo } from "@/lib/symbols";
import { matchOpenOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("symbols") ?? "").trim();
  if (!raw) return NextResponse.json({ quotes: {} });

  const symbols =
    raw === "*"
      ? STOCKS.map((s) => toYahoo(s.base))
      : raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 100);

  const matchP = matchOpenOrders().catch(() => ({ checked: 0, filled: 0 }));
  const quotes = await getQuotes(symbols);
  await matchP;

  const map: Record<string, (typeof quotes)[number]> = {};
  for (const q of quotes) map[q.symbol] = q;
  return NextResponse.json({ quotes: map });
}
