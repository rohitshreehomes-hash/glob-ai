import { NextResponse } from "next/server";
import {
  countOpenOrders,
  getCash,
  getHoldings,
  getStartingCapital,
  resetAccount,
  totalRealizedPl,
} from "@/lib/db";
import { BROKERAGE_PER_ORDER } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    cash: getCash(),
    startingCapital: getStartingCapital(),
    brokeragePerOrder: BROKERAGE_PER_ORDER,
    holdingsCount: getHoldings().length,
    openOrdersCount: countOpenOrders(),
    realizedPl: totalRealizedPl(),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.action !== "reset") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const start = resetAccount(body.startingCapital);
  return NextResponse.json({ ok: true, cash: start, startingCapital: start });
}
