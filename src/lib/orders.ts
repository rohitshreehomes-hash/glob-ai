// Paper-trading order engine: market + limit orders, instant fills,
// limit-order matching, holdings/cash accounting, flat brokerage.

import {
  countOpenOrders,
  getCash,
  getHolding,
  getMeta,
  insertOrder,
  listOpenOrders,
  setCash,
  setMeta,
  updateOrderStatus,
  upsertHolding,
} from "./db";
import { getQuoteSingle, getQuotes } from "./yahoo";
import { isTradable } from "./symbols";
import type { Order, OrderSide, OrderType } from "./types";

export const BROKERAGE_PER_ORDER = Number(process.env.BROKERAGE_PER_ORDER ?? 20);
// Simulated bid/ask slippage on market fills (0.05%)
const SLIPPAGE = 0.0005;
const MATCH_THROTTLE_MS = 10_000;

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  qty: number;
  type: OrderType;
  limitPrice?: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function validate(input: PlaceOrderInput): void {
  if (!isTradable(input.symbol)) throw new OrderError("Only NSE (.NS) / BSE (.BO) equity symbols can be traded.");
  if (!["BUY", "SELL"].includes(input.side)) throw new OrderError("Invalid side.");
  if (!["MARKET", "LIMIT"].includes(input.type)) throw new OrderError("Invalid order type.");
  if (!Number.isFinite(input.qty) || input.qty <= 0 || !Number.isInteger(input.qty))
    throw new OrderError("Quantity must be a positive whole number.");
  if (input.qty > 1_000_000) throw new OrderError("Quantity too large.");
  if (input.type === "LIMIT" && (!Number.isFinite(input.limitPrice) || (input.limitPrice as number) <= 0))
    throw new OrderError("Limit price must be positive.");
}

/** Fill a validated order at `fillPrice`. Mutates cash + holdings. */
function fill(order: Omit<Order, "id">, fillPrice: number): Order {
  const price = round2(fillPrice);
  const brokerage = BROKERAGE_PER_ORDER;
  const cash = getCash();

  if (order.side === "BUY") {
    const cost = round2(order.qty * price + brokerage);
    if (cost > cash) {
      return insertOrder({ ...order, status: "REJECTED", fillPrice: null, brokerage: 0, filledAt: null, note: "Insufficient funds" });
    }
    setCash(round2(cash - cost));
    const h = getHolding(order.symbol);
    const prevQty = h?.qty ?? 0;
    const prevAvg = h?.avgPrice ?? 0;
    const newQty = prevQty + order.qty;
    const newAvg = (prevQty * prevAvg + order.qty * price) / newQty;
    upsertHolding({ symbol: order.symbol, qty: newQty, avgPrice: round2(newAvg), realizedPl: h?.realizedPl ?? 0 });
  } else {
    const h = getHolding(order.symbol);
    if (!h || h.qty < order.qty) {
      return insertOrder({ ...order, status: "REJECTED", fillPrice: null, brokerage: 0, filledAt: null, note: "Insufficient holdings (short selling not allowed)" });
    }
    const proceeds = round2(order.qty * price - brokerage);
    setCash(round2(cash + proceeds));
    const realized = (price - h.avgPrice) * order.qty;
    upsertHolding({ symbol: order.symbol, qty: h.qty - order.qty, avgPrice: h.avgPrice, realizedPl: round2(h.realizedPl + realized) });
  }

  return insertOrder({ ...order, status: "FILLED", fillPrice: price, brokerage, filledAt: Date.now() });
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const symbol = input.symbol.trim().toUpperCase();
  validate({ ...input, symbol });
  const quote = await getQuoteSingle(symbol);
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
    throw new OrderError("Could not fetch a live price for this symbol. Try again.");
  }

  const base = {
    symbol,
    side: input.side,
    type: input.type,
    qty: input.qty,
    limitPrice: input.type === "LIMIT" ? round2(input.limitPrice as number) : null,
    status: "OPEN" as const,
    fillPrice: null as number | null,
    brokerage: 0,
    placedAt: Date.now(),
    filledAt: null as number | null,
    note: null as string | null,
  };

  if (input.type === "MARKET") {
    const fillPrice = input.side === "BUY" ? quote.price * (1 + SLIPPAGE) : quote.price * (1 - SLIPPAGE);
    return fill(base, fillPrice);
  }

  // LIMIT: fill immediately if marketable, else rest as OPEN
  const limit = input.limitPrice as number;
  const mktBuy = quote.price * (1 + SLIPPAGE);
  const mktSell = quote.price * (1 - SLIPPAGE);
  if (input.side === "BUY" && limit >= quote.price) return fill(base, Math.min(limit, mktBuy));
  if (input.side === "SELL" && limit <= quote.price) return fill(base, Math.max(limit, mktSell));
  return insertOrder(base);
}

/** Try to fill resting OPEN limit orders against current prices. Throttled. */
export async function matchOpenOrders(): Promise<{ checked: number; filled: number }> {
  const last = Number(getMeta("last_match_ts", "0"));
  const now = Date.now();
  if (now - last < MATCH_THROTTLE_MS) return { checked: 0, filled: 0 };
  setMeta("last_match_ts", String(now));

  const open = listOpenOrders();
  if (open.length === 0) return { checked: 0, filled: 0 };

  const quotes = await getQuotes(open.map((o) => o.symbol));
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));
  let filled = 0;

  for (const o of open) {
    const q = qmap.get(o.symbol);
    if (!q || !o.limitPrice) continue;
    const touched = o.side === "BUY" ? q.price <= o.limitPrice : q.price >= o.limitPrice;
    if (!touched) continue;

    // Re-validate funds/holdings at fill time
    if (o.side === "BUY") {
      const cost = o.qty * o.limitPrice + BROKERAGE_PER_ORDER;
      if (cost > getCash()) {
        updateOrderStatus(o.id, "REJECTED", undefined, undefined, "Insufficient funds at fill time");
        continue;
      }
      setCash(round2(getCash() - cost));
      const h = getHolding(o.symbol);
      const prevQty = h?.qty ?? 0;
      const newQty = prevQty + o.qty;
      const newAvg = (prevQty * (h?.avgPrice ?? 0) + o.qty * o.limitPrice) / newQty;
      upsertHolding({ symbol: o.symbol, qty: newQty, avgPrice: round2(newAvg), realizedPl: h?.realizedPl ?? 0 });
    } else {
      const h = getHolding(o.symbol);
      if (!h || h.qty < o.qty) {
        updateOrderStatus(o.id, "REJECTED", undefined, undefined, "Insufficient holdings at fill time");
        continue;
      }
      setCash(round2(getCash() + (o.qty * o.limitPrice - BROKERAGE_PER_ORDER)));
      const realized = (o.limitPrice - h.avgPrice) * o.qty;
      upsertHolding({ symbol: o.symbol, qty: h.qty - o.qty, avgPrice: h.avgPrice, realizedPl: round2(h.realizedPl + realized) });
    }
    // Backfill brokerage on the resting order then mark filled
    const { db } = await import("./db");
    db.prepare("UPDATE orders SET brokerage = ? WHERE id = ?").run(BROKERAGE_PER_ORDER, o.id);
    updateOrderStatus(o.id, "FILLED", o.limitPrice, Date.now());
    filled++;
  }
  return { checked: open.length, filled };
}

export async function cancelOrder(id: number): Promise<Order> {
  const { getOrder } = await import("./db");
  const o = getOrder(id);
  if (!o) throw new OrderError("Order not found.", 404);
  if (o.status !== "OPEN") throw new OrderError(`Only OPEN orders can be cancelled (status: ${o.status}).`);
  updateOrderStatus(id, "CANCELLED", undefined, undefined, "Cancelled by user");
  return { ...o, status: "CANCELLED" };
}

export function openOrderCount(): number {
  return countOpenOrders();
}
