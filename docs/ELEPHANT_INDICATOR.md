# 🐘 Elephant Indicator — Pine v6 replica (Upsurge.club course: *Intraday Trading Strategy Using Elephant Indicator*)

Two files, one engine:

| File | Pane | What it does |
| :--- | :--- | :--- |
| [`indicators/Elephant_Indicator.pine`](../indicators/Elephant_Indicator.pine) | separate oscillator pane | The full elephant: fast pair, slow pair, long pair, trunk, EYE / TUSK / TRUNK pattern engine, confluence score, HUD, gauge table, 8 alerts |
| [`indicators/Elephant_Signals_Overlay.pine`](../indicators/Elephant_Signals_Overlay.pine) | price chart | Same engine drawn on price with 🐘 BUY/SELL labels, entry / stop / T1 / T2 trade plan and plan lines |
| [`indicators/Elephant_Zones.pine`](../indicators/Elephant_Zones.pine) | price chart | **The look from the course video**: grey top/bottom zones (supply above, demand below) extended to the right, dotted reaction edge, tap / break alerts |

Live demo terminal (runs the same maths in JavaScript on synthetic candles, with a copy-to-clipboard for both Pine files):
`npm start` → <http://localhost:8080/elephant>

---

## ⚠️ What this is — and what it is not

The **Elephant Indicator sold with the Upsurge.club course is proprietary**; its source is not published and it is not distributed in this repository. What is here is an **independent, from-scratch Pine v6 implementation of the publicly documented Elephant concept** — the same idea that the EP Elephant family of tools describes:

* several **moving-average pairs** whose spread, drawn in ATR units, forms a figure that looks like an elephant seen from the side;
* the **eye** (a trough after a decline — a bottom *forming*),
* the **tusk** (the fastest pair turning up — the actual entry),
* the **trunk** (the longest averages turning — the trend change),
* and the course rule that **the indicator is a scanner, not a system: it must be confirmed with price action.**

No performance numbers are claimed for this file. It has **not** been back-tested on exchange data here, and any strategy result depends on your timeframe, instrument, stop placement and costs. The demo candles in the preview are synthetic.

---

## 🟫 The grey zone overlay (`Elephant_Zones.pine`) — the screenshot look

The course video shows ETH 15m with long **light-grey horizontal bands** sitting on tops and bottoms, and a dotted line at the edge price reacts to. That is exactly what this file draws, automatically:

| Piece | Rule |
| :--- | :--- |
| **Top → resistance zone** | from a **confirmed pivot high** (`pivotLen` bars each side): `top = pivot high`, `bottom = pivot high − 0.35 × ATR14` |
| **Bottom → support zone** | from a **confirmed pivot low**: `bottom = pivot low`, `top = pivot low + 0.35 × ATR14` |
| Extend | every live zone grows to `bar_index + 10` bars ahead, exactly like the video |
| Dotted edge | resistance: dotted at its **lower** edge, support: dotted at its **upper** edge — the level price actually reacts to |
| Mitigation | a close beyond the zone by `0.15 ATR` freezes the box and fades it (or deletes it, your choice) |
| Recycling | max 16 zones; the oldest is removed so the chart never becomes a grey wall |
| Optional | body anchoring, minimum gap from the opposite side, TOP/BOTTOM tags, tap ● markers |

Settings that matter: `Pivot strength` 5 (lower = more zones), `Zone depth` 0.35 ATR (higher = fatter bands), `Maximum zones` 16, theme `Grey (video style)` / `Red-Green` / `Blue-Orange` / `Mono dark`.

> **About the little grey price tags on the right axis in the screenshot:** those are TradingView *drawing* labels — the presenter drew the rectangles by hand, and drawings (unlike Pine objects) print their top/bottom on the price scale. Pine cannot write to the price scale, so this indicator prints the range as a right-edge label instead (`Show zone labels`).

---

## 🧠 The maths (all spreads in ATR units, like the original pane)

```
fast pair  = (EMA 5  − EMA 8 ) / ATR14     → the TUSK      (red falling · yellow/green rising)
slow pair  = (EMA13  − EMA21 ) / ATR14     → the HEAD      (red falling · cyan rising)
long pair  = (EMA34  − EMA89 ) / ATR14     → long trunk
trunk      = EMA( (EMA144 − EMA233)/ATR14 , 5 )            → the TRUNK
bias       = (close − EMA200) / ATR14
```

### Pattern state machine (non-repainting — pivots are read one bar back)

| Stage | Bullish version | Bearish mirror |
| :--- | :--- | :--- |
| **EYE** | fast pair prints a 3-bar pivot **trough below 0** while price / EMA21 / long pair are still in a decline; a cooldown (default 8 bars) stops it re-printing every bar | pivot **peak above 0** in a rally |
| **TUSK** (entry) | inside 10 bars after the eye: `EMA5` crosses above `EMA8`, **and** close reclaims `EMA21`, **and** close breaks the previous bar high, **and** score ≥ 55 | `EMA5` crosses below `EMA8`, close loses EMA21, breaks previous bar low |
| **TRUNK** (confirmation) | inside 15 bars after the tusk: slow pair crosses above 0 while the 144/233 trunk is rising → "FULL ELEPHANT — TRUNK UP" | slow pair crosses below 0 while trunk falls |
| **Exhaustion** (optional fade) | stretched ≥ 0.6 ATR below EMA21, RSI turns back **up** through 35, plus a climax volume / rejection wick / bullish engulf | mirror |

### Confluence score (0–100, gate = 55)

| Component | Points |
| :--- | ---: |
| live eye inside the tusk window | +20 |
| fresh tusk cross | +25 |
| slow pair above 0 **and** trunk rising | +15 |
| RSI at/below 35 (top: at/above 65) | +10 |
| volume climax (≥ 1.30 × 20-SMA) | +10 |
| rejection wick or engulfing candle | +10 |
| close on the right side of session VWAP | +5 |
| higher-timeframe bias (HTF EMA200, default 60m, non-lookahead) | +5 |
| close on the right side of EMA200 | +5 |
| volume dry-up (< 0.85 × avg) | **−5** |

---

## 🔧 Inputs that actually change behaviour

| Group | Input | Default | Notes |
| :--- | :--- | :--- | :--- |
| Averages | fast / slow / long / trunk lengths | 5, 8, 13, 21, 34, 89, 144, 233 | the original lengths; 5m and 15m both work, keep the ordering |
| Averages | ATR length | 14 | the unit of every spread — raise it on crypto |
| Pattern | eye cooldown | 8 bars | fewer, cleaner eyes |
| Pattern | tusk window | 10 bars | how long after the eye an entry is still valid |
| Pattern | min score | 55 | 45 = more signals, 65 = sniper only |
| Pattern | show raw tusks | off | every EMA5/8 cross, unscored |
| Filters | RSI buy / sell | 35 / 65 | exhaustion thresholds |
| Filters | volume climax | 1.30× | with `volume` = 0 (some spot indices) the volume filter is neutral, never blocking |
| Filters | HTF bias | 60m EMA200 | `request.security(..., lookahead_off)` — no repaint |
| Session | market mode | Auto | India 09:15–15:30 IST for indices/futures/options, 24×7 for `syminfo.type == crypto` |
| Session | skip open / close | 5 / 10 min | blocks the opening auction and the closing ramp |
| Overlay | stop buffer | 0.30 ATR | beyond the eye swing |
| Overlay | T1 / T2 | 1R / 2R | printed on the label and drawn as lines |

---

## 🔔 Alerts (built in)

`Elephant EYE (bottom forming)` · `Elephant EYE (top forming)` · `Elephant BUY TUSK` · `Elephant SELL TUSK` · `Elephant FULL (bullish)` · `Elephant FULL (bearish)` · `Elephant BOTTOM exhaustion` · `Elephant TOP exhaustion`

Each fires **once per closed bar** (`alert.freq_once_per_bar_close`), and the BUY/SELL alert text carries entry, stop and both targets, so it can be piped straight into a webhook.

---

## 📥 Install (3 steps, same as the rest of this repo)

1. TradingView → **Pine Editor** → `Ctrl+A` → `Delete` (remove the default template).
2. Paste **all** of `indicators/Elephant_Indicator.pine` → **Save** → **Add to chart**. Add the overlay in a second clean tab if you want the signals on the price chart.
3. Works on `NSE:NIFTY`, `BSE:SENSEX`, `BANKNIFTY`, futures, direct CE/PE option charts, and crypto — 1m / 3m / 5m / 15m / higher.

## 🧪 What was actually verified here

| Gate | Result |
| :--- | :--- |
| **PineForge 4-pass transpiler** (`indicator()` → `strategy()` shim on the declaration line only, body untouched) | **0 errors** — indicator: 100 diagnostics (69 notes / 31 warnings, all emulation notes: EMA warm-up, `bar_index` semantics, visual-only plots), **2,543** generated C++ lines · overlay: **0 errors**, 88 diagnostics, **2,522** C++ lines |
| **`g++ -std=c++17 -fsyntax-only`** on both generated units | **rc = 0** |
| PineTS 0.13.1 bar-by-bar VM, 900 synthetic NIFTY 5m bars | `Elephant_Indicator.pine` → **0 runtime errors**, 16 plot/table/label streams |
| Same VM, overlay file | **0 runtime errors**, 18 streams |
| Same VM, zones file | **0 runtime errors**; 16 live boxes / 16 dotted lines / 16 labels at the right of a 900-bar feed (8 resistance + 8 support, 8 mitigated) |
| PineForge + g++ on the zones file | **0 errors**, 1,684 C++ lines, `rc = 0` |
| Signal sanity on that feed | 55 eyes → 4 BUY TUSK, 4 SELL TUSK, 5 FULL ELEPHANT confirmations, 8 top / 9 bottom exhaustion events (≈0.7 scored entries per session — a scanner cadence, not a machine gun) |
| JS mirror in `preview/elephant.html` | renders both canvases + HUD + stats against a DOM stub with **0 runtime errors**; identical state machine, session gate and scoring |

Not verified: TradingView's own hosted compiler (not reachable from this sandbox) and any profit figure. Treat the numbers above as plumbing checks, not a track record.

---

## 🧭 How to actually trade it (course rules, condensed)

0. **Mark the arena first.** Run `Elephant_Zones.pine`: the grey bands are the tops and bottoms the course talks about — resistance above, support below. Trade *into* a band, never in the middle of nowhere.
1. **Wait for the eye.** No eye, no trade — the whole edge is buying after a decline, not in the middle of one.
2. **Take the tusk only with price action**: a support/resistance hold, a trendline break, or a rejection candle at the eye. The score gate is a filter, not a replacement for that read.
3. **Stop below the eye swing** (overlay prints it). If the stop is wider than your risk per trade allows, skip — do not shrink it into the noise.
4. **Book T1 at 1R, trail the runner** while the trunk keeps rising. The "FULL ELEPHANT" label is your permission to hold, not a new entry.
5. **Respect the session gate.** The script itself refuses to signal in the first 5 and last 10 minutes.
6. **Crypto**: switch market mode to `Crypto 24x7`, raise ATR/volume thresholds; the pattern is identical, the noise is not.

*Educational tool only. Not investment advice. Test on paper first.*
