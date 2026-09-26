// Shared domain types for BharatTrade.

export type Exchange = "NSE" | "BSE";

export interface Quote {
  symbol: string; // Yahoo symbol, e.g. RELIANCE.NS or ^NSEI
  base: string; // NSE/BSE base symbol, e.g. RELIANCE
  exchange: string; // NSE | BSE | INDEX
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  week52High?: number;
  week52Low?: number;
  currency: string;
  /** true = real Yahoo Finance data, false = local simulated fallback */
  live: boolean;
  /** true when market is closed (price is last traded / EOD) */
  stale: boolean;
  asOf: number; // epoch ms
}

export interface Candle {
  t: number; // epoch seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "OPEN" | "FILLED" | "CANCELLED" | "REJECTED";

export interface Order {
  id: number;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limitPrice: number | null;
  status: OrderStatus;
  fillPrice: number | null;
  brokerage: number;
  placedAt: number;
  filledAt: number | null;
  note: string | null;
}

export interface Holding {
  symbol: string;
  qty: number;
  avgPrice: number;
  realizedPl: number;
}

export interface EnrichedHolding extends Holding {
  quote: Quote | null;
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  dayPnl: number;
}
