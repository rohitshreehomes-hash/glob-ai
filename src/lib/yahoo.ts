// Yahoo Finance market-data client (free, no API key).
// NSE symbols -> XXX.NS, BSE symbols -> XXX.BO, indices -> ^NSEI etc.
// Every call degrades gracefully to the local simulator on failure.

import type { Candle, Quote } from "./types";
import { splitYahoo } from "./symbols";
import { getMarketStatus } from "./market-hours";
import { simHistory, simQuote } from "./simulator";

const UA = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

const QUOTE_TTL_OPEN_MS = 15_000;
const QUOTE_TTL_CLOSED_MS = 300_000;
const FETCH_CONCURRENCY = 8;

const quoteCache = new Map<string, { q: Quote; ts: number }>();

interface ChartResult {
  meta: Record<string, number | string | undefined>;
  timestamp?: number[];
  indicators?: { quote?: Array<Record<string, (number | null)[] | undefined>> };
}

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
  timeoutMs = 9000
): Promise<ChartResult | null> {
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  for (const host of hosts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=${range}&interval=${interval}`;
      const res = await fetch(url, { headers: UA, signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0] as ChartResult | undefined;
      if (result?.meta) return result;
    } catch {
      // try next host / fall through to simulator
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const n = (v: unknown, fb = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fb;

function buildQuote(symbol: string, r: ChartResult, stale: boolean): Quote | null {
  const meta = r.meta ?? {};
  const ts = r.timestamp ?? [];
  const q = r.indicators?.quote?.[0] ?? {};
  const closes = (q.close as (number | null)[] | undefined) ?? [];
  const opens = (q.open as (number | null)[] | undefined) ?? [];
  const highs = (q.high as (number | null)[] | undefined) ?? [];
  const lows = (q.low as (number | null)[] | undefined) ?? [];
  const vols = (q.volume as (number | null)[] | undefined) ?? [];

  // Last bar with a valid close
  let li = closes.length - 1;
  while (li >= 0 && (closes[li] === null || closes[li] === undefined)) li--;
  if (li < 0) return null;

  let pi = li - 1;
  while (pi >= 0 && (closes[pi] === null || closes[pi] === undefined)) pi--;

  const price = n(meta.regularMarketPrice, closes[li]!);
  const prevClose = n(
    meta.chartPreviousClose ?? meta.previousClose,
    pi >= 0 ? closes[pi]! : price
  );
  const { base, exchange } = splitYahoo(symbol);
  const change = price - prevClose;

  return {
    symbol,
    base,
    exchange,
    price,
    prevClose,
    change,
    changePct: prevClose ? (change / prevClose) * 100 : 0,
    open: n(opens[li], n(meta.regularMarketDayOpen, price)),
    high: n(highs[li], n(meta.regularMarketDayHigh, price)),
    low: n(lows[li], n(meta.regularMarketDayLow, price)),
    volume: Math.round(n(vols[li], n(meta.regularMarketVolume, 0))),
    week52High: (meta.fiftyTwoWeekHigh as number) || undefined,
    week52Low: (meta.fiftyTwoWeekLow as number) || undefined,
    currency: (meta.currency as string) || "INR",
    live: true,
    stale,
    asOf: Date.now(),
  };
}

async function fetchLiveQuote(symbol: string, stale: boolean): Promise<Quote | null> {
  const r = await fetchChart(symbol, "5d", "1d");
  if (!r) return null;
  try {
    return buildQuote(symbol, r, stale);
  } catch {
    return null;
  }
}

export async function getQuoteSingle(symbol: string): Promise<Quote> {
  const quotes = await getQuotes([symbol]);
  return quotes[0];
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const uniq = Array.from(new Set(symbols.filter(Boolean)));
  const status = getMarketStatus();
  const stale = status.state !== "open";
  const ttl = status.state === "open" ? QUOTE_TTL_OPEN_MS : QUOTE_TTL_CLOSED_MS;
  const now = Date.now();

  const out = new Map<string, Quote>();
  const missing: string[] = [];
  for (const s of uniq) {
    const hit = quoteCache.get(s);
    if (hit && now - hit.ts < ttl) {
      out.set(s, { ...hit.q, stale });
    } else {
      missing.push(s);
    }
  }

  // Bounded-concurrency fetch pool
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, missing.length) },
    async () => {
      while (cursor < missing.length) {
        const s = missing[cursor++];
        try {
          const live = await fetchLiveQuote(s, stale);
          const q = live ?? simQuote(s, stale);
          quoteCache.set(s, { q, ts: Date.now() });
          out.set(s, q);
        } catch {
          const q = simQuote(s, stale);
          out.set(s, q);
        }
      }
    }
  );
  await Promise.all(workers);

  return uniq.map((s) => out.get(s) ?? simQuote(s, stale));
}

// ---------------- History / candles ----------------

export type RangeKey = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";

const RANGE_MAP: Record<RangeKey, { range: string; interval: string; stepSec: number }> = {
  "1D": { range: "1d", interval: "5m", stepSec: 300 },
  "1W": { range: "5d", interval: "15m", stepSec: 900 },
  "1M": { range: "1mo", interval: "1d", stepSec: 86400 },
  "3M": { range: "3mo", interval: "1d", stepSec: 86400 },
  "1Y": { range: "1y", interval: "1d", stepSec: 86400 },
  "5Y": { range: "5y", interval: "1wk", stepSec: 604800 },
};

export function isRangeKey(v: string): v is RangeKey {
  return (Object.keys(RANGE_MAP) as string[]).includes(v);
}

export async function getHistory(
  symbol: string,
  rangeKey: RangeKey
): Promise<{ candles: Candle[]; live: boolean }> {
  const { range, interval, stepSec } = RANGE_MAP[rangeKey];
  const r = await fetchChart(symbol, range, interval);
  if (r?.timestamp?.length) {
    const q = r.indicators?.quote?.[0] ?? {};
    const closes = (q.close as (number | null)[] | undefined) ?? [];
    const opens = (q.open as (number | null)[] | undefined) ?? [];
    const highs = (q.high as (number | null)[] | undefined) ?? [];
    const lows = (q.low as (number | null)[] | undefined) ?? [];
    const vols = (q.volume as (number | null)[] | undefined) ?? [];
    const candles: Candle[] = [];
    for (let i = 0; i < r.timestamp.length; i++) {
      const c = closes[i];
      if (c === null || c === undefined) continue;
      candles.push({
        t: r.timestamp[i],
        o: opens[i] ?? c,
        h: highs[i] ?? c,
        l: lows[i] ?? c,
        c,
        v: vols[i] ?? 0,
      });
    }
    if (candles.length > 1) return { candles, live: true };
  }
  // Fallback: simulated series
  const points = rangeKey === "1D" ? 75 : rangeKey === "1W" ? 130 : rangeKey === "5Y" ? 260 : 250;
  return { candles: simHistory(symbol, points, stepSec), live: false };
}
