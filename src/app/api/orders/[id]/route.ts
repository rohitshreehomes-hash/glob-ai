import { NextResponse } from "next/server";
import { cancelOrder, OrderError } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const order = await cancelOrder(Number(params.id));
    return NextResponse.json({ order });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
