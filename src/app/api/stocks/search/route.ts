import { NextResponse } from "next/server";
import { STOCKS, toYahoo } from "@/lib/symbols";
import { getQuotes } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toUpperCase();
  if (!q) return NextResponse.json({ results: [] });

  const matches = STOCKS.filter(
    (s) => s.base.includes(q) || s.name.toUpperCase().includes(q)
  ).slice(0, 8);

  const quotes = await getQuotes(matches.map((m) => toYahoo(m.base)));
  const qmap = new Map(quotes.map((x) => [x.symbol, x]));

  return NextResponse.json({
    results: matches.map((m) => {
      const symbol = toYahoo(m.base);
      return { symbol, base: m.base, name: m.name, sector: m.sector, quote: qmap.get(symbol) ?? null };
    }),
  });
}
