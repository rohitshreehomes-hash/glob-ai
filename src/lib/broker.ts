// Broker-adapter interface for FUTURE live trading (e.g. Zerodha Kite Connect).
// The paper engine (orders.ts) implements this shape, so swapping in a real
// broker later means writing one adapter — no UI/API changes.
//
// To go live one day:
//   1. npm i kiteconnect
//   2. Implement KiteBroker below using ZERODHA_API_KEY / ZERODHA_ACCESS_TOKEN
//   3. Route POST /api/orders through the adapter behind an env flag.

import type { Order, OrderSide, OrderType } from "./types";

export interface BrokerQuote {
  symbol: string;
  lastPrice: number;
  volume: number;
}

export interface BrokerAdapter {
  name: string;
  getQuote(symbol: string): Promise<BrokerQuote>;
  placeOrder(input: {
    symbol: string;
    side: OrderSide;
    qty: number;
    type: OrderType;
    limitPrice?: number;
  }): Promise<Pick<Order, "id" | "status" | "fillPrice">>;
  cancelOrder(brokerOrderId: string): Promise<void>;
}

/** Paper broker — wraps the built-in simulator. Always available. */
export class PaperBroker implements BrokerAdapter {
  name = "paper";
  async getQuote(symbol: string): Promise<BrokerQuote> {
    const { getQuoteSingle } = await import("./yahoo");
    const q = await getQuoteSingle(symbol);
    return { symbol, lastPrice: q.price, volume: q.volume };
  }
  async placeOrder(input: {
    symbol: string;
    side: OrderSide;
    qty: number;
    type: OrderType;
    limitPrice?: number;
  }): Promise<Pick<Order, "id" | "status" | "fillPrice">> {
    const { placeOrder } = await import("./orders");
    const o = await placeOrder(input);
    return { id: o.id, status: o.status, fillPrice: o.fillPrice };
  }
  async cancelOrder(brokerOrderId: string): Promise<void> {
    const { cancelOrder } = await import("./orders");
    await cancelOrder(Number(brokerOrderId));
  }
}

export function getBroker(): BrokerAdapter {
  // Single switch-over point for live trading later.
  // if (process.env.BROKER === "kite") return new KiteBroker(...);
  return new PaperBroker();
}
