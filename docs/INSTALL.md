# 🐘 Elephant Indicator — TradingView install guide (step by step)

Applies to every file in this repo:

| File | Where it appears on the chart |
| :--- | :--- |
| `indicators/Elephant_Bands.pine` | price chart — orange top bands, cyan bottom bands, blue dotted PDH/PDL (the look from the course video) |
| `indicators/Elephant_Signals_Overlay.pine` | price chart — 🐘 BUY / SELL labels + Entry / SL / T1 / T2 |
| `indicators/Elephant_Zones.pine` | price chart — grey boxes with names (PDH, PDL, PWH, PWL, swing R/S) |
| `indicators/Elephant_Indicator.pine` | separate pane below price — tusk / head / trunk oscillator + HUD |
| `indicators/SOT_SMC_Pro_Indicator.pine` | price chart — the SMC engine of this repo |

A free TradingView account is enough (3 indicators per chart on the free plan — remove other indicators if "Add to chart" is greyed out).

---

## 1. Copy the code

**Option A — from this repo**

Open the file you want (for example `indicators/Elephant_Bands.pine`) and copy **everything**, from the first line `//@version=6` to the last line.

**Option B — from the live terminal**

```bash
npm start          # in the repo root
```

Open <http://localhost:8080/elephant> and press:

* **📋 Copy Bands (exact video look)** → `Elephant_Bands.pine`
* **📋 Copy Price Overlay** → `Elephant_Signals_Overlay.pine`
* **📋 Copy Zones** → `Elephant_Zones.pine`
* **📋 Copy Pine v6 Indicator** → `SOT_SMC_Pro_Indicator.pine`

The buttons copy the **byte-exact** file from `indicators/`, so nothing can be lost in chat transcription.

---

## 2. Open the Pine Editor

1. Open any chart on <https://www.tradingview.com/chart/> (NIFTY, BANKNIFTY, SENSEX, ETHUSD, BTCUSD — anything).
2. At the very bottom of the screen click **Pine Editor**. If you cannot see it: bottom-right `{}` icon, or the top menu **Pine Editor**.
3. The editor opens with a 3-line template:

```pine
//@version=6
indicator("My script")
plot(close)
```

4. Click inside the editor → **Ctrl + A** (select all) → **Delete** / **Backspace** so the editor is **completely empty**.

> ⚠️ This step matters. If the default template stays at the top you get `line 1: 'indicator' or 'strategy' or 'library' function is already declared` — the classic "cannot compile" error.

---

## 3. Paste, save, add

1. **Ctrl + V** to paste the whole file.
2. Click **Save** (top-right of the Pine Editor) → give it a name, e.g. `Elephant Bands` → **Save**.
3. Click **Add to chart** (button next to Save).
4. The indicator now appears in the chart legend. Click the **gear / settings icon** next to its name to change inputs.

For the pane script (`Elephant_Indicator.pine`) the oscillator appears **below** the price chart; for the others everything is drawn **on** the price chart.

---

## 4. Settings to match the course video

**Elephant_Bands.pine**

| Input | Value |
| :--- | :--- |
| Pivot strength | `5` |
| Band depth (× ATR14) | `0.35` |
| Break buffer | `0.15` |
| Live bands per side | `3` |
| Previous day high / low | ON |
| Resistance border / fill | `#ff9800` / 86 % transparent |
| Support border / fill | `#00c853` / cyan `#00bcd4` |
| Key level colour | `#2962ff` |

**Elephant_Signals_Overlay.pine** — `Min confluence score` `55`, `Stop buffer` `0.30 ATR`, `T1` `1R`, `T2` `2R`, market mode **Auto**.
**Elephant_Zones.pine** — `Pivot strength` `5`, `Zone depth` `0.35 ATR`, `Maximum zones` `20`, theme **Grey (video style)**.
**Elephant_Indicator.pine** — defaults are the tuned ones; only `Market mode` needs a look if you trade crypto.

Timeframes: everything works on 1m / 3m / 5m / 15m / 1h / daily. The course itself uses **15m**.

---

## 5. Add alerts

1. Right-click the chart → **Add alert** (or press `Alt + A`).
2. **Condition** → select the indicator name → pick one of its alert conditions, e.g. *Elephant BUY TUSK*, *Elephant new RESISTANCE band*, *Elephant resistance tapped*.
3. **Trigger** → *Once per bar close* (recommended — the scripts are non-repainting on bar close).
4. Set notification (app / email / webhook) → **Create**.

Webhook alerts: copy the alert message from the script's `alert()` call if you want the entry/SL/targets in the payload.

---

## 6. Troubleshooting

| Message / symptom | Fix |
| :--- | :--- |
| `'indicator' function is already declared` | step 2.4 — the default 3-line template was not deleted |
| `Add to chart` greyed out | free plan indicator limit (3 per chart) — remove another indicator |
| `The study has too many labels/lines/boxes` | lower `Maximum zones`, or turn off `Show zone labels` |
| Nothing draws on the chart | you are on a different symbol/timeframe than expected, or price is far away — press `Alt + R` to reset the chart scale |
| Signals missing during 09:15–09:20 IST | intended: the session gate skips the first 5 minutes (setting `Skip first N minutes`) |
| Bands look empty on a daily chart | daily PDH/PDL levels are skipped on daily charts by design; use the swing bands or a lower timeframe |
| Crypto chart: no session blocking | correct — with `Market mode = Auto` crypto runs 24×7 |
| Code copied from chat shows `…` | use the terminal copy buttons (Option B) or the raw file; chat can truncate |

---

## 7. Which file should I use?

* Want **exactly what the course video shows** → `Elephant_Bands.pine` (orange tops, cyan bottoms, blue dotted levels, coloured price-axis tags).
* Want **entry signals with stop and targets** → `Elephant_Signals_Overlay.pine`.
* Want a **named zone map** (PDH/PDL/PWH/PWL + swing R/S with labels) → `Elephant_Zones.pine`.
* Want the **tusk / head / trunk oscillator** in its own pane → `Elephant_Indicator.pine`.

They are independent — you can add two or three at once (free plan: max 3 studies).

> Educational tooling only, not investment advice. The original Elephant indicator is proprietary and is **not** included; these files are independent reconstructions of the publicly described concept.
