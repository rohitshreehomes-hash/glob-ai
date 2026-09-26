# 🇮🇳 BharatTrade — Paper Trading Web App for Indian Stock Exchanges

A full-stack **Next.js** paper-trading simulator + live market dashboard for **NSE & BSE** stocks.

- 📊 **Live dashboard** — Nifty 50, Sensex, Bank Nifty, Nifty IT, India VIX + 80 tracked stocks
- 📈 **Candlestick charts** — 1D → 5Y with volume, crosshair OHLC legend
- 💼 **Paper trading** — ₹10,00,000 virtual cash, market + limit orders, auto-matching, holdings & P&L
- ⭐ **Watchlist**, gainers/losers, market breadth, ticker tape
- 🕘 **NSE session aware** — open / pre-open / closed status in IST, holiday calendar
- 🔌 **Free real data** — Yahoo Finance (no API key), with **simulated fallback** so the app never breaks offline
- 🧾 **INR everywhere** — lakh/crore formatting, flat ₹20 brokerage per order
- 🔜 **Broker-ready** — `src/lib/broker.ts` adapter interface for future Zerodha Kite integration

## Quick start

```bash
# 1. Install (Node 18+)
npm install

# 2. Configure (optional — defaults work out of the box)
cp .env.example .env

# 3. Run
npm run dev
# → http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker compose up --build
# → http://localhost:3000 (SQLite persisted in ./data)
```

## How it works

| Layer | Implementation |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + Tailwind |
| Market data | Yahoo Finance chart API (`XXX.NS` / `XXX.BO`), 15s cache when open, graceful simulated fallback |
| Charts | lightweight-charts (candles + volume) |
| Paper account | SQLite (Node built-in `node:sqlite`) — cash, holdings, orders, watchlist |
| Orders | Market fills instantly at LTP ±0.05% slippage; limits rest OPEN and match on price touch |
| Polling | SWR, 15s refresh (`NEXT_PUBLIC_POLL_MS`) |

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Dashboard (indices, movers, market table)
│   ├── stock/[symbol]/page.tsx  # Quote + chart + order panel
│   ├── watchlist/page.tsx
│   ├── portfolio/page.tsx       # Holdings, day/total/realised P&L
│   ├── orders/page.tsx          # Open orders + history
│   ├── settings/page.tsx        # Reset account, data info, holidays
│   └── api/
│       ├── market/status|indices|movers
│       ├── stocks/search|quote|history
│       ├── account|portfolio|orders|watchlist
├── components/                  # Navbar, TickerTape, StockChart, OrderPanel…
└── lib/
    ├── yahoo.ts                 # Yahoo client + cache + fallback
    ├── simulator.ts             # Offline simulated feed
    ├── orders.ts                # Paper order engine
    ├── db.ts                    # SQLite layer
    ├── broker.ts                # BrokerAdapter (Zerodha-ready)
    ├── market-hours.ts          # NSE session logic + holidays
    └── symbols.ts               # 80-stock universe + indices
```

## API reference

| Endpoint | Description |
|---|---|
| `GET /api/market/status` | NSE session state, IST clock, next event |
| `GET /api/market/indices` | Index quotes (^NSEI, ^BSESN, …) |
| `GET /api/market/movers` | All quotes + gainers/losers + breadth |
| `GET /api/stocks/search?q=` | Symbol autocomplete with live prices |
| `GET /api/stocks/quote?symbols=A,B` or `*` | Batch quotes (`*` = all tracked) |
| `GET /api/stocks/history?symbol=&range=1D…5Y` | OHLCV candles |
| `GET/POST /api/account` | Cash summary / `{action:"reset"}` |
| `GET /api/portfolio` | Holdings marked to market + P&L summary |
| `GET/POST /api/orders` | List / place `{symbol, side, qty, type, limitPrice}` |
| `DELETE /api/orders/[id]` | Cancel an open order |
| `GET/POST/DELETE /api/watchlist` | Watchlist CRUD |

## Configuration (.env)

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `./data` | SQLite location |
| `STARTING_CAPITAL` | `1000000` | Fresh paper capital (₹) |
| `BROKERAGE_PER_ORDER` | `20` | Flat brokerage per fill (₹) |
| `NEXT_PUBLIC_POLL_MS` | `15000` | UI refresh interval |
| `NEXT_PUBLIC_APP_NAME` | `BharatTrade` | Brand name |

## Going live (later)

The paper engine already speaks the `BrokerAdapter` interface. To wire Zerodha Kite Connect: `npm i kiteconnect`, implement the adapter in `src/lib/broker.ts` with `ZERODHA_API_KEY` / `ZERODHA_API_SECRET` / `ZERODHA_ACCESS_TOKEN`, and return it from `getBroker()`.

## Disclaimer

Educational simulator only — **no real money**, no real orders. Yahoo data may be delayed ~15 minutes. Not investment advice.
