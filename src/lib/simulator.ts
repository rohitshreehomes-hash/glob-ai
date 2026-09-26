// Deterministic simulated market-data engine.
// Used ONLY as a fallback when Yahoo Finance is unreachable, so the app
// (charts, paper trading, portfolio) keeps working offline / rate-limited.

import type { Candle, Quote } from "./types";
import { splitYahoo } from "./symbols";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable base price per symbol so simulated data looks plausible & consistent. */
export function simBasePrice(symbol: string): number {
  const rand = mulberry32(hashString(symbol));
  if (symbol.startsWith("^")) {
    // Index-like levels
    if (symbol.includes("VIX")) return 12 + rand() * 8;
    if (symbol.includes("BANK")) return 48000 + rand() * 8000;
    if (symbol.includes("BSESN")) return 78000 + rand() * 8000;
    return 23000 + rand() * 3000;
  }
  const tier = rand();
  const base = tier < 0.5 ? 80 + rand() * 900 : tier < 0.85 ? 900 + rand() * 2500 : 2500 + rand() * 4500;
  return Math.round(base * 100) / 100;
}

// Running price per symbol — mean-reverts to base so long sessions stay sane.
const running = new Map<string, number>();
const dayOpen = new Map<string, number>();

function dayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
let currentDay = dayKey();

export function simQuote(yahooSymbol: string, stale = false): Quote {
  if (dayKey() !== currentDay) {
    currentDay = dayKey();
    running.clear();
    dayOpen.clear();
  }
  const { base, exchange } = splitYahoo(yahooSymbol);
  const anchor = simBasePrice(yahooSymbol);
  const prev = running.get(yahooSymbol) ?? anchor;
  const noise = (Math.random() - 0.5) * 0.006;
  const price = Math.max(1, prev + (anchor - prev) * 0.03 + prev * noise);
  running.set(yahooSymbol, price);

  if (!dayOpen.has(yahooSymbol)) {
    dayOpen.set(yahooSymbol, anchor * (1 + (Math.random() - 0.5) * 0.01));
  }
  const open = dayOpen.get(yahooSymbol)!;
  const high = Math.max(open, price) * (1 + Math.random() * 0.002);
  const low = Math.min(open, price) * (1 - Math.random() * 0.002);
  const prevClose = anchor;
  const change = price - prevClose;

  return {
    symbol: yahooSymbol,
    base,
    exchange,
    price: round2(price),
    prevClose: round2(prevClose),
    change: round2(change),
    changePct: round2((change / prevClose) * 100),
    open: round2(open),
    high: round2(high),
    low: round2(low),
    volume: Math.floor(50000 + Math.random() * 4000000),
    week52High: round2(anchor * 1.45),
    week52Low: round2(anchor * 0.62),
    currency: "INR",
    live: false,
    stale,
    asOf: Date.now(),
  };
}

/** Generate a plausible walk of `points` candles ending near the anchor. */
export function simHistory(yahooSymbol: string, points: number, stepSec: number): Candle[] {
  const anchor = simBasePrice(yahooSymbol);
  const rand = mulberry32(hashString(yahooSymbol + points));
  const closes: number[] = [];
  let p = anchor * (1 - 0.08 + rand() * 0.04);
  for (let i = 0; i < points; i++) {
    p = Math.max(1, p + (anchor - p) * 0.02 + p * (rand() - 0.495) * 0.02);
    closes.push(p);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const start = nowSec - points * stepSec;
  return closes.map((c, i) => {
    const o = i === 0 ? c * (1 + (rand() - 0.5) * 0.004) : closes[i - 1];
    const h = Math.max(o, c) * (1 + rand() * 0.004);
    const l = Math.min(o, c) * (1 - rand() * 0.004);
    return {
      t: start + i * stepSec,
      o: round2(o),
      h: round2(h),
      l: round2(l),
      c: round2(c),
      v: Math.floor(20000 + rand() * 1500000),
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
