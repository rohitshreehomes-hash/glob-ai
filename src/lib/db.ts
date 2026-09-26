// SQLite persistence via Node's built-in node:sqlite (Node 22.5+, zero deps).
// Tables: meta, holdings, orders, watchlist.

import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import type { Holding, Order, OrderStatus } from "./types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const globalForDb = globalThis as unknown as { __btdb?: DatabaseSync };

function openDb(): DatabaseSync {
  if (globalForDb.__btdb) return globalForDb.__btdb;
  const db = new DatabaseSync(path.join(DATA_DIR, "trading.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS holdings (
      symbol TEXT PRIMARY KEY,
      qty REAL NOT NULL DEFAULT 0,
      avg_price REAL NOT NULL DEFAULT 0,
      realized_pl REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      qty REAL NOT NULL,
      limit_price REAL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      fill_price REAL,
      brokerage REAL NOT NULL DEFAULT 0,
      placed_at INTEGER NOT NULL,
      filled_at INTEGER,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
    CREATE TABLE IF NOT EXISTS watchlist (
      symbol TEXT PRIMARY KEY,
      added_at INTEGER NOT NULL
    );
  `);
  globalForDb.__btdb = db;
  return db;
}

export const db = openDb();

// ---------- meta / cash ----------

export function startingCapital(): number {
  return Number(process.env.STARTING_CAPITAL ?? 1_000_000);
}

export function getMeta(key: string, fallback = ""): string {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setMeta(key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function getCash(): number {
  const v = getMeta("cash", "");
  if (v === "") {
    const start = startingCapital();
    setMeta("cash", String(start));
    setMeta("starting_capital", String(start));
    return start;
  }
  return Number(v);
}

export function setCash(v: number): void {
  setMeta("cash", String(v));
}

export function getStartingCapital(): number {
  const v = getMeta("starting_capital", "");
  if (v === "") {
    const start = startingCapital();
    setMeta("starting_capital", String(start));
    return start;
  }
  return Number(v);
}

// ---------- holdings ----------

export function getHoldings(): Holding[] {
  return db
    .prepare(
      "SELECT symbol, qty, avg_price as avgPrice, realized_pl as realizedPl FROM holdings WHERE qty > 0 ORDER BY symbol"
    )
    .all() as unknown as Holding[];
}

export function getHolding(symbol: string): Holding | undefined {
  return db
    .prepare(
      "SELECT symbol, qty, avg_price as avgPrice, realized_pl as realizedPl FROM holdings WHERE symbol = ?"
    )
    .get(symbol) as Holding | undefined;
}

export function upsertHolding(h: Holding): void {
  if (h.qty <= 0) {
    db.prepare("DELETE FROM holdings WHERE symbol = ?").run(h.symbol);
    return;
  }
  db.prepare(
    "INSERT INTO holdings (symbol, qty, avg_price, realized_pl) VALUES (?, ?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET qty = excluded.qty, avg_price = excluded.avg_price, realized_pl = excluded.realized_pl"
  ).run(h.symbol, h.qty, h.avgPrice, h.realizedPl);
}

export function totalRealizedPl(): number {
  const row = db.prepare("SELECT COALESCE(SUM(realized_pl), 0) as s FROM holdings").get() as {
    s: number;
  };
  return row.s;
}

// ---------- orders ----------

type OrderRow = {
  id: number;
  symbol: string;
  side: string;
  type: string;
  qty: number;
  limit_price: number | null;
  status: string;
  fill_price: number | null;
  brokerage: number;
  placed_at: number;
  filled_at: number | null;
  note: string | null;
};

function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    symbol: r.symbol,
    side: r.side as Order["side"],
    type: r.type as Order["type"],
    qty: r.qty,
    limitPrice: r.limit_price,
    status: r.status as Order["status"],
    fillPrice: r.fill_price,
    brokerage: r.brokerage,
    placedAt: r.placed_at,
    filledAt: r.filled_at,
    note: r.note,
  };
}

export function insertOrder(o: Omit<Order, "id">): Order {
  const info = db
    .prepare(
      "INSERT INTO orders (symbol, side, type, qty, limit_price, status, fill_price, brokerage, placed_at, filled_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      o.symbol,
      o.side,
      o.type,
      o.qty,
      o.limitPrice,
      o.status,
      o.fillPrice,
      o.brokerage,
      o.placedAt,
      o.filledAt,
      o.note
    );
  return { ...o, id: Number(info.lastInsertRowid) };
}

export function updateOrderStatus(
  id: number,
  status: OrderStatus,
  fillPrice?: number,
  filledAt?: number,
  note?: string | null
): void {
  db.prepare(
    "UPDATE orders SET status = ?, fill_price = COALESCE(?, fill_price), filled_at = COALESCE(?, filled_at), note = COALESCE(?, note) WHERE id = ?"
  ).run(status, fillPrice ?? null, filledAt ?? null, note ?? null, id);
}

export function getOrder(id: number): Order | undefined {
  const r = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  return r ? toOrder(r) : undefined;
}

export function listOrders(limit = 200): Order[] {
  return (db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT ?").all(limit) as unknown as OrderRow[]).map(
    toOrder
  );
}

export function listOpenOrders(): Order[] {
  return (db.prepare("SELECT * FROM orders WHERE status = 'OPEN' ORDER BY id ASC").all() as unknown as OrderRow[]).map(
    toOrder
  );
}

export function countOpenOrders(): number {
  const row = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'OPEN'").get() as {
    c: number;
  };
  return row.c;
}

// ---------- watchlist ----------

export function getWatchlist(): string[] {
  return (
    db.prepare("SELECT symbol FROM watchlist ORDER BY added_at ASC").all() as unknown as { symbol: string }[]
  ).map((r) => r.symbol);
}

export function addToWatchlist(symbol: string): void {
  db.prepare("INSERT OR IGNORE INTO watchlist (symbol, added_at) VALUES (?, ?)").run(symbol, Date.now());
}

export function removeFromWatchlist(symbol: string): void {
  db.prepare("DELETE FROM watchlist WHERE symbol = ?").run(symbol);
}

// ---------- reset ----------

export function resetAccount(newStartingCapital?: number): number {
  const start =
    newStartingCapital && newStartingCapital > 0 ? Math.floor(newStartingCapital) : startingCapital();
  db.exec("DELETE FROM holdings; DELETE FROM orders; DELETE FROM watchlist; DELETE FROM meta;");
  setMeta("cash", String(start));
  setMeta("starting_capital", String(start));
  return start;
}
