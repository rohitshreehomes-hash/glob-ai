import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/yahoo";
import { INDICES } from "@/lib/symbols";

export const dynamic = "force-dynamic";

export async function GET() {
  const quotes = await getQuotes(INDICES.map((i) => i.yahoo));
  const data = INDICES.map((idx) => ({
    ...idx,
    quote: quotes.find((q) => q.symbol === idx.yahoo) ?? null,
  }));
  return NextResponse.json({ indices: data });
}
