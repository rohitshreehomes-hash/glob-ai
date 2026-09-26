import { NextResponse } from "next/server";
import { listOrders } from "@/lib/db";
import { matchOpenOrders, OrderError, placeOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await matchOpenOrders().catch(() => null);
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const status = searchParams.get("status")?.toUpperCase();
  let orders = listOrders();
  if (symbol) orders = orders.filter((o) => o.symbol === symbol);
  if (status) orders = orders.filter((o) => o.status === status);
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const order = await placeOrder({
      symbol: String(body.symbol ?? ""),
      side: body.side,
      qty: Number(body.qty),
      type: body.type ?? "MARKET",
      limitPrice: body.limitPrice !== undefined ? Number(body.limitPrice) : undefined,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("place order failed", e);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
