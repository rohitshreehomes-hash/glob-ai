# SOT Style SMC Toolkit — Pine Script v5

Aapke screenshot wale chart jaise hi **SMC / ICT** annotations automatically plot karne wala TradingView indicator.

> ⚠️ Ye **S.O.T Academy ka proprietary source code nahi hai**. Screenshot me jo concepts dikh rahe the unka ek independent, clean Pine v5 rebuild hai. Exact paid indicator ki internal logic publicly available nahi hoti, isliye yahan similar levels/labels generate kiye gaye hain.

## Files

| File | Kaam |
|---|---|
| `SOT_SMC_Indicator.pine` | Main Pine Script — `strategy()` overlay (v6, TradingView + PineForge compatible) — TradingView me paste karein |
| `README.md` | Ye guide |

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

## Kaise use karein

1. TradingView kholein → **Pine Editor** → **New / Create new indicator**.
2. Editor ka default code hata kar [`SOT_SMC_Indicator.pine`](SOT_SMC_Indicator.pine) ka pura code paste karein.
3. **Save** karein (name example: `SOT SMC`) → **Add to chart**.
4. Screenshot jaisa view chahiye to try karein:
   - Symbol: `OANDA:NZDUSD`
   - Timeframe: `1D`
   - Inputs: `Pivot lookback = 5`, `Higher timeframe = W`, `Extend zones = 120`.

> Weekly/HTF FVG ke liye chart timeframe HTF se chhota rakhein (e.g. chart `1D`, HTF `W`). Agar chart khud `W` par hai to HTF `M` ya `W` try karein.

## Important inputs

| Input | Default | Meaning |
|---|---|---|
| `Pivot lookback` | `5` | Swing high/low kitne bars left+right se confirm honge. Kam = zyada signals, zyada = clean structure. |
| `Confirm breaks with candle close` | `true` | BOS/CHoCH ke liye close break chahiye. `false` karne par wick break bhi count hoga. |
| `Min bars between structure events` | `3` | Ek hi level par baar-baar label na aaye isliye cooldown. |
| `Show IDM / inducement zones` | `true` | IDM box on/off. |
| `OB search lookback` | `12` | Break se pehle opposite candle dhoondhne ki range. |
| `Min FVG size (0 = ATR based)` | `0` | `0` par ATR-based filter lagega. Fixed price gap chahiye to value daalein (forex me jaise `0.0004`). |
| `Local FVG min size x ATR` | `0.15` | Chhote noise gaps ignore karne ke liye. |
| `HTF FVG min size x ATR` | `0.50` | Weekly gaps thode bade hote hain, isliye bada filter. |
| `Higher timeframe` | `W` | Weekly FVG ke liye. `D`, `4H`, `M` bhi chalega. |
| `Extend zones to the right` | `120` | OB/FVG boxes future me kitne bars tak extend honge. |
| `Require middle candle direction for FVG` | `true` | FVG ki beech wali candle impulsive direction me honi chahiye. |
| `Require recent liquidity sweep for signals` | `false` | `true` karne par BUY/SELL tabhi aayenge jab recent sweep bhi hua ho. |
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

`Enable alert conditions` input se inhe on/off kiya ja sakta hai.

## Indicator vs Strategy
- File ab `strategy()` use karta hai taaki PineForge/backtest validation pass ho aur TradingView dono par chale. Visuals (BOS/CHoCH, OB, FVG, IDM, LIQ) indicator jaisa hi overlay hote hain — `Strategy Tester` tab extra me dikhega.
- Agar aapko sirf indicator (no Strategy Tester) chahiye: Pine Editor me pehli line ko
  ```
  indicator("SOT Style SMC Toolkit", overlay=true, max_bars_back=1000, max_lines_count=500, max_labels_count=500, max_boxes_count=500)
  ```
  se replace kar do aur neeche ke do `strategy.entry(...)` lines hata/comment kar do. Baaki code same rahega, v6 par hi chalna chahiye.

## Notes / limitations

- Pine draws limited objects (script me `500` lines / labels / boxes set hai); purane drawings apne aap hat jate hain.
- Ye ek **visual/educational toolkit** hai, guaranteed buy/sell system nahi. Backtest aur risk management zaroor karein.
- Screenshot jaise exact manual markings algorithm se 100% match nahi honge — market structure thoda subjective hota hai. Inputs adjust karke apne pair/timeframe ke hisaab se tune karein.
- Agar aapko sirf kuch cheezein chahiye (e.g. bas BOS + OB), to inputs se baaki sab `false` kar dein.

## Disclaimer

Trading me risk hai. Ye code sirf educational purpose ke liye hai — financial advice nahi. Pichhla performance future profit ki guarantee nahi hai.
