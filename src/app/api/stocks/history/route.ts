import { NextResponse } from "next/server";
import { getHistory, isRangeKey } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
  const range = (searchParams.get("range") ?? "1M").toUpperCase();
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  if (!isRangeKey(range)) return NextResponse.json({ error: "invalid range" }, { status: 400 });

  const { candles, live } = await getHistory(symbol, range);
  return NextResponse.json({ symbol, range, candles, live });
}
