# TradingView Pine Scripts — SBE (Swing / Side Base / Activity)

`pine/` folder me 3 ready-to-use TradingView scripts hain:

| File | Kaam | Type |
|---|---|---|
| **`SBE_Activity_Confirm.pine`** | **"Log yahan trade kar rahe hain"** → Volume Profile (POC / Value Area) + **BUY / SALE / SIDE / EXIT** confirmation + dashboard | Indicator |
| `SBE_Swing_Indicator.pine` | SALE / BUY / EXIT swing labels + auto **SIDE BASE** box + alerts | Indicator |
| `SBE_Swing_Strategy.pine` | Swing logic ka backtest version (Strategy Tester) | Strategy |

---

# 🅰️ SBE Activity Map — BUY / SALE / SIDE / EXIT

**File:** `SBE_Activity_Confirm.pine` → title: `SBE Activity Map — BUY / SALE / SIDE / EXIT`

Ye wahi cheez karta hai jo aapne manga tha: pehle dikhata hai **log kahan trade kar rahe hain** (volume concentration),
aur wahin se **market confirm** karta hai ki BUY leg, SALE leg ya SIDE (wait) — plus **EXIT** levels.

## 1️⃣ "Log kahan trade kar rahe hain" (Activity Map)

| Cheez | Matlab |
|---|---|
| 🟧 **POC** (orange line) | Jis **price par sabse zyada volume** trade hua — sabse strong level. Log yahin sabse zyada active hain |
| 🔵 **VAH / VAL** (dashed) | **Value Area** — jahan **70% trading** hui. VAH = upper edge, VAL = lower edge = "crowd ka area" |
| 🟦 **Histogram** (right side) | Kis price par kitna volume — moti bar = zyada log |
| ⬛ **HVN shelves** | High Volume Nodes — mota volume = strong support/resistance (demand/supply shelf) |
| ⚡ **Volume spike dots** | Jahan volume average se 1.3× zyada tha — bade players active |
| 🟪 **EMA 21** | Trend gate |

Profile har session (Day / Week / Month) par reset hota hai, aur session ke high/low ke hisaab se **live** banta rehta hai.
Range badalte hi profile dobara calculate hota hai, isliye POC/VA ekdum **exact** rehte hain (koi clamping nahi).

## 2️⃣ Market confirmation — BUY / SALE / SIDE / EXIT

**Trigger (kuch ek ho to signal banega):**

| BUY side | SALE side |
|---|---|
| **VAL reject** — VAL touch karke wapas upar close | **VAH reject** — VAH touch karke wapas neeche close |
| **POC reclaim** — close POC ke upar cross | **POC loss** — close POC ke neeche cross |
| **Base breakout up** — side base se upar close | **Base breakout down** — side base se neeche close |
| **Higher-low swing** — HL pivot + structure up | **Lower-high swing** — LH pivot + structure down |

**Confirmation score (0-4)** — signal tabhi jab `minConf` se zyada ho:

1. Close POC ke sahi side pe (BUY: upar / SALE: neeche)
2. Volume spike (≥ 1.3× average)
3. Structure (higher-low = up, lower-high = down)
4. Close value area ke sahi side pe

**+ EMA gate**: BUY sirf EMA21 ke upar, SALE sirf EMA21 ke neeche (settings se off bhi kar sakte ho).

**SIDE** = jab market value area ke andar **tight base** bana raha ho → label `SIDE` aur dashboard `SIDE — WAIT`.
Yani: **yahan trade mat lo, breakout ka wait karo.** Base tootne par hi BUY/SALE confirm milta hai.

**EXIT** 🟠 in 4 me se koi bhi:
- **POC loss** — entry POC ke upar thi aur price POC ke neeche band hui (structure toot gaya)
- **Target hit** — VAH (long) / VAL (short) ya 0.5 × Value Area
- **Swing flip** — long me lower-high ban gaya, short me higher-low ban gaya
- **ATR trailing stop** (optional)

Har position ke saath **SL / Target** bhi calculate hote hain (base edge ya VAL/VAH, max 3 × ATR).

## 3️⃣ Dashboard (top-right)

```
SBE ACTIVITY      NIFTY · 5
Decision          BUY CONFIRM ✓     <- BUY / SALE / SIDE / WAIT / RUNNING
Trigger           VAL reject        <- kis wajah se signal aaya
Position          LONG
POC (max activity) 22,510.00
VAH / VAL         22,585.00 / 22,455.00
Volume            1.8× avg ⚡
Entry             22,470.00
SL / Target       22,410.00 / 22,585.00
Score L / S       3/4 · 1/4
Trades (W/L)      7 (5/2) · +412 pts
```

## 4️⃣ Settings (important ones)

| Group | Setting | Default | Tip |
|---|---|---|---|
| ① Activity | Anchor | `Day` | Intraday 5m ke liye Day best |
| ① Activity | Rows (bins) | 24 | Zyada = fine levels, kam = mota |
| ① Activity | Value area % | 70 | 68-70 standard |
| ① Activity | Range padding % | 10 | 0-10 rakho |
| ① Activity | Histogram width | 30 bars | Chart ke right side me jagah ke hisaab se |
| ② Signal | Min confirmations | 2 | **3** karo to sirf strong signals |
| ② Signal | Volume spike × | 1.3 | 1.5 = sirf bade spikes |
| ② Signal | EMA gate | ON | Off karo to zyada signals |
| ② Signal | Pivot length | 5 | Structure ke liye |
| ③ Exits | POC loss / Target / Swing flip | ON | Teeno ON rakho |
| ③ Exits | ATR trailing | OFF | ON karo to quick exits |
| ④ Side base | Lookback / Max height | 12 / 2.0×ATR | Box na bane to 2.5-3.0 |

## 5️⃣ Alerts

Indicator → right-click → **Add alert** → condition me `BUY CONFIRM`, `SALE CONFIRM`, `EXIT` ya `SIDE — wait` chuno
→ Trigger **Once per bar close** → notification / webhook set karo.

---

# 🅱️ SBE Swing — SALE / BUY / EXIT + Side Base

**File:** `SBE_Swing_Indicator.pine` — simple swing based version (ye aapke original manually-marked chart jaisa hai).

| Chart par (manual) | Indicator |
|---|---|
| **sale** (top) | Swing **HIGH** confirm → 🔴 SALE label |
| **exit** (support) | Swing **LOW** confirm → 🟠 EXIT label |
| **side base** | 12+ bars ka tight range → ⬜ SIDE BASE box |
| **buy** | Swing LOW → 🟢 BUY, ya base breakout up → 🟢 BUY |
| **exit** (resistance) | Swing **HIGH** confirm → 🟠 EXIT |

- `Pivot length` = 5 default (bada = major swings, chhota = zyada signals)
- Trend filter: `Off` / `EMA fast/slow` / `Price vs EMA` / `Structure (HH/LL)`
- Exits: opposite swing / EMA cross / ATR trailing
- Info table: Position, Entry, Open P&L, Closed P&L, W/L count
- Alerts: SALE / BUY / EXIT

**Strategy version** (`SBE_Swing_Strategy.pine`) — Strategy Tester me points me P&L.
Rupees me dekhna hai to Properties → **Order size = 75** (NIFTY lot).

---

## 🚀 Install (dono indicators ke liye same)

1. TradingView → **Pine Editor** → `Open` → `New blank indicator`
2. File ka **pura code** paste karo
3. **Save** → naam do → **Add to chart**
4. Chart: **NIFTY 50 / NIFTY futures, 5 minute** (defaults isi ke liye set hain)
5. Settings ⚙️ se tune karo

---

## ⚖️ Honest baatein (zaroor padho)

1. **Repaint nahi** — Activity version har signal **bar close** par deta hai (`barstate.isconfirmed`), ek baar aaya to badalta nahi.
2. **Pivot 5 bars late confirm hota hai** (Swing version) — label pivot ki bar par dikhta hai kyunki wahi actual swing tha, par signal 5 bars baad aata hai.
3. **POC / Value Area har session me shift hote hain** — ye normal hai, ye "developing" profile hai. Session ke shuru me levels kam reliable hote hain, din badhne ke saath strong hote hain.
4. Volume profile **chart ke volume data** par based hai — index (spot) par volume approximate hota hai, isliye **futures chart** par profile zyada sahi hota hai.
5. Ye **setup highlighter + confirmation tool** hai — guarantee wala top/bottom catcher nahi. Har BUY ke baad upar jana zaroori nahi.
6. **Financial advice nahi hai.** Pehle **Bar Replay** par 2-3 hafte test karo → phir paper trade → phir hi paisa lagao.

---

## 🎯 NIFTY 50 / 5-min preset

**Activity version (recommended):**
```
Anchor Day · Rows 24 · VA 70% · Padding 10%
Min confirmations 2 (strong chahiye to 3) · Volume spike 1.3×
EMA gate ON (21) · Pivot 5
Exits: POC loss + Target + Swing flip ON · Trail OFF
Side base: lookback 12, height 2.0×ATR
```

**Swing version:**
```
Pivot 5 · Filter Off · Exit on opposite swing ON · Trail OFF
Side base 12 / 2.0×ATR · Session OFF
```
