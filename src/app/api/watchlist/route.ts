import { NextResponse } from "next/server";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/lib/db";
import { getQuotes } from "@/lib/yahoo";
import { displayName, isTradable } from "@/lib/symbols";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const symbols = getWatchlist();
  const quotes = symbols.length ? await getQuotes(symbols) : [];
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));
  return NextResponse.json({
    watchlist: symbols.map((s) => ({ symbol: s, name: displayName(s), quote: qmap.get(s) ?? null })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  if (!isTradable(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  addToWatchlist(symbol);
  return NextResponse.json({ ok: true, symbol }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  removeFromWatchlist(symbol);
  return NextResponse.json({ ok: true });
}
