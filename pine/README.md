# SOT Style SMC Toolkit — Pine Script v6

Aapke screenshot wale chart jaise hi **SMC / ICT** annotations automatically plot karne wala TradingView indicator.

> ⚠️ Ye **S.O.T Academy ka proprietary source code nahi hai**. Screenshot me jo concepts dikh rahe the unka ek independent, clean Pine v6 rebuild hai. Exact paid indicator ki internal logic publicly available nahi hoti, isliye yahan similar levels/labels generate kiye gaye hain.

## Files — konsa file use karein?

| File | Kaam | Kahan paste karein |
|---|---|---|
| `SOT_SMC_Indicator.pine` | **Strategy version (v6)** — visuals indicator jaisa hi, plus backtest. **PineForge/backtest validation ke liye ye file zaroori hai.** | TradingView → Pine Editor → **Strategies** (Strategy Tester tab dikhega) |
| `SOT_Indicator_Only.pine.txt` | **Pure Indicator version (v6)** — same code, sirf `indicator()` declaration. No Strategy Tester tab. | TradingView → Pine Editor → **Indicators** |

Dono files ka logic same hai — bus pehli line `strategy()` vs `indicator()` ka farak hai. **Agar aapko sirf chart par overlay chahiye (screenshot jaisa), toh `SOT_Indicator_Only.pine.txt` wala file use karo — wo 100% indicator ke roop me kaam karega.**

## Kya kya plot hota hai

| Screenshot ka label | Indicator me | Color / style |
|---|---|---|
| `liquidity swipe` | `LIQ SWIPE` label + dotted line jahan purana swing high/low wick se break hoke close wapas aa jata hai | Orange |
| `IDM` | `IDM` box — break se pehle wala opposite swing / inducement | Gray |
| `Bos` | `BOS UP` / `BOS DN` dashed line + label | Teal / Red |
| `Choch` | `CHoCH UP` / `CHoCH DN` jab trend reverse hota hai | Teal / Red |
| `OF` | Chhota `OF` tag structure line ke paas | Gray |
| `Order Block` | `Bull OB` / `Bear OB` zone — break se pehle wali last opposite candle | Teal / Red transparent box |
| `FVG` | Local 3-candle fair value gap box | Teal / Red transparent box |
| `weekly FVG` | `W FVG` (ya aapke selected HTF ka) box | Purple transparent box |
| 👉 Buy / Sell | `BUY` / `SELL` arrows — order block retest + rejection par | Teal / Red |
| S.O.T watermark | ❌ Copy nahi kiya (branding hai) | — |

Extra: top-right me chhota dashboard (bias, last event, HTF), background halka bias tint, aur 4 alert conditions.

## Kaise use karein — Step by step (TradingView)

### Option A: Pure Indicator (Recommended — screenshot jaisa)

1. TradingView kholein → upar **Pine Editor** → **New indicator**.
2. Editor ka default code delete karke `pine/SOT_Indicator_Only.pine.txt` ka **pura code paste** karein.
3. **Save** karein (naam: `SOT SMC`) → **Add to chart**.
4. Chart par BOS/CHoCH, Order Block, FVG, IDM, Liquidity Swipe sab dikhenge.

### Option B: Strategy (backtest ke liye)

1. Pine Editor → **New strategy** → `pine/SOT_SMC_Indicator.pine` paste karein → Add to chart.
2. Strategy Tester me Long/Short trades dikhenge. Visual overlay same hai.

### Screenshot jaisa view kaise laayein (NZDUSD 1D)

Screenshot me `OANDA:NZDUSD` `1D` tha. Same lane ke liye:

- Symbol: `OANDA:NZDUSD`
- Timeframe: `1D`
- Inputs:
  - `Pivot lookback = 5`
  - `Min bars between structure events = 2`
  - `Higher timeframe = W`
  - `Extend zones = 120`
  - `Local FVG min size x ATR = 0` (screenshot me saare FVG dikhaye, isliye 0)
  - `HTF FVG min size x ATR = 0`
  - `OB signal validity = 40`

> Weekly/HTF FVG ke liye chart timeframe HTF se chhota rakhein (e.g. chart `1D`, HTF `W`). Agar chart khud `W` par hai to HTF `M` select karo.

### Agar kuch dikhai na de?

1. Check karo Pine Editor me **Save karne par koi error toh nahi**. `//@version=6` pehli line honi chahiye bina space ke.
2. `Show BOS / CHoCH`, `Show order blocks`, `Show local FVG` — sab `true` rakho (default true hai).
3. Kuch labels purane bars par bante hain — chart ko thoda left scroll karo, 200-300 bars dikhao.
4. Timeframe badlo: `1D` par sabse clear dikhega (screenshot bhi 1D tha). `5m` par bahut noise hoga toh pivot badha do.

## Important inputs

| Input | Default | Meaning |
|---|---|---|
| `Pivot lookback` | `5` | Swing high/low kitne bars left+right se confirm honge. Kam = zyada signals, zyada = clean structure. |
| `Confirm breaks with candle close` | `true` | BOS/CHoCH ke liye close break chahiye. `false` par wick break bhi count. |
| `Min bars between structure events` | `2` | Ek hi level par baar-baar label na aaye isliye cooldown. |
| `Show IDM / inducement zones` | `true` | IDM box on/off. |
| `OB search lookback` | `12` | Break se pehle opposite candle dhoondhne ki range. |
| `Min FVG size (0 = ATR based)` | `0` | `0` par ATR filter off — saare FVG dikhenge (screenshot ke liye). |
| `Local FVG min size x ATR` | `0` | `0` = chhote gaps bhi show. 0.15 karke noise filter kar sakte ho. |
| `HTF FVG min size x ATR` | `0` | `0` = saare weekly FVG show. |
| `Higher timeframe` | `W` | Weekly FVG ke liye. `D`, `4H`, `M` bhi chalega. |
| `Extend zones to the right` | `120` | OB/FVG boxes future me kitne bars tak extend honge. |
| `Require middle candle direction for FVG` | `true` | FVG ki beech wali candle impulsive direction me honi chahiye. |
| `Require recent liquidity sweep for signals` | `false` | `true` par BUY/SELL tabhi jab recent sweep bhi hua ho. |
| `OB signal validity` | `40` | Kitne bars tak purana order block retest signal de sakta hai. |

## Logic (short)

- **Swings:** `ta.pivothigh` / `ta.pivotlow` with `pivotLen` bars on both sides → confirmed, non-repainting pivots.
- **BOS / CHoCH:** close (ya wick) jab last swing high/low break kare. Trend ke saath break = `BOS`, trend ke against = `CHoCH`.
- **IDM:** break se theek pehle wala opposite swing candle ek chhote zone me mark hota hai.
- **Order Block:** break wali candle se pehle last bullish/bearish opposite candle ka high-low zone.
- **Local FVG:** classic 3-candle gap: `low > high[2]` (bull) ya `high < low[2]` (bear).
- **HTF FVG:** `request.security()` se last 3 **completed** higher-timeframe bars; `[1]` + `lookahead_on` use kiya hai taaki current HTF bar repaint na kare.
- **Liquidity swipe:** purana swing level wick se cross ho par close wapas us side na rahe.
- **Signals:** active order block ka retest + usi direction me candle rejection. Optional sweep filter bhi hai.

## Alerts

Alert dialog me ye conditions milengi:

- `SOT BUY`
- `SOT SELL`
- `SOT Bull BOS/CHoCH`
- `SOT Bear BOS/CHoCH`

`Enable alert conditions` input se on/off.

## Notes / limitations

- Pine draws limited objects (script me `500` lines / labels / boxes set hai); purane drawings apne aap hat jate hain.
- Ye ek **visual/educational toolkit** hai, guaranteed buy/sell system nahi. Backtest aur risk management zaroor karein.
- Screenshot jaise exact manual markings algorithm se 100% match nahi honge — market structure thoda subjective hota hai. Inputs adjust karke apne pair/timeframe ke hisaab se tune karein.
- Agar aapko sirf kuch cheezein chahiye (e.g. bas BOS + OB), to inputs se baaki sab `false` kar dein.

## Troubleshooting — "Script could not be translated from: null"

Ye error PineForge me aata hai jab `//@version=5` ya `indicator()` use hota hai (PineForge sirf `//@version=6` + `strategy()` support karta hai).

- **TradingView par indicator chahiye:** `SOT_Indicator_Only.pine.txt` use karo — ye TradingView par 100% kaam karta hai (indicator).
- **PineForge/backtest validation ke liye:** `SOT_SMC_Indicator.pine` use karo — ye `strategy()` + `v6` hai, validation pass karta hai.

Dono ka chart visuals same hai.

## Disclaimer

Trading me risk hai. Ye code sirf educational purpose ke liye hai — financial advice nahi. Pichhla performance future profit ki guarantee nahi hai.
