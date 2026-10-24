# SALE • BUY • EXIT — Swing + Side Base (Pine Script v6)

Aapke chart jaisa manual marking ( **sale → exit → side base → buy → exit** ) ab **automatic** ho jayega.
Ye indicator wahi points khud detect karke chart par label/box laga deta hai, aur unhi points par **alerts** bhi deta hai.

---

## 📁 Files

| File | Kaam |
|---|---|
| `SBE_Swing_Indicator.pine` | **Main indicator** — SALE / BUY / EXIT labels, SIDE BASE box, zig-zag, EMAs, info table, alerts |
| `SBE_Swing_Strategy.pine` | Wahi logic ka **backtest version** — Strategy Tester me P&L, win-rate check karne ke liye |

---

## 🚀 Install (2 minute)

1. TradingView chart kholo → neeche **Pine Editor** tab.
2. `Open` → `New blank indicator` → purana code delete karo.
3. `SBE_Swing_Indicator.pine` ka **pura code** paste karo.
4. **Save** (naam do: `SBE Swing`) → **Add to Chart**.
5. Chart par indicator ke naam ke aage settings ⚙️ icon se tuning kar sakte ho.

> Chart **NIFTY 50 index / NIFTY futures, 5 minute** par lagao — defaults usi ke hisaab se set hain.

---

## 🔁 Chart ke labels ↔ indicator

| Chart par (aapka manual) | Indicator kya karta hai |
|---|---|
| **sale** (top par) | Swing **HIGH** confirm hote hi 🔴 **SALE** label (short setup) |
| **exit** (support par) | Swing **LOW** confirm → 🟠 **EXIT** label (short cover) |
| **side base** | 12+ bars ka tight range → ⬜ **SIDE BASE** box (live expand hota hai) |
| **buy** | Swing **LOW** se 🟢 **BUY**, ya base ke **upside breakout** par 🟢 **BUY** |
| **exit** (resistance par) | Swing **HIGH** confirm → 🟠 **EXIT** (long close) |

**Ek hi baar me ek trade:** jab tak position open hai naya SALE/BUY nahi aata — pehle EXIT hota hai.
`Reverse on same swing` ON karo to ek hi swing par palat bhi sakta hai.

---

## ⚙️ Settings

### ② Swing
| Setting | Default | Matlab |
|---|---|---|
| Pivot length | **5** | 5 bars left + 5 bars right. Bada = major swings, chhota = zyada signals |

### ③ Trend filter
| Option | Kya karta hai |
|---|---|
| `Off` | Har swing par signal (default — exactly aapke chart jaisa) |
| `EMA fast/slow` | EMA21 > EMA50 par sirf BUY, ulta par sirf SALE |
| `Price vs EMA` | Slow EMA ke upar sirf BUY |
| `Structure (HH/LL)` | Higher-low par BUY, lower-high par SALE |

### ④ Exits
| Setting | Default | Matlab |
|---|---|---|
| Exit on opposite swing | ✅ | Short open ho to swing low par EXIT, long open ho to swing high par EXIT |
| Exit on EMA cross | ❌ | Price EMA21 cross kare to exit |
| ATR trailing stop | ❌ | 2 × ATR trailing stop (chop me achha) |
| Reverse on same swing | ❌ | EXIT + opposite entry ek hi bar par |

### ⑤ Side base
| Setting | Default | Matlab |
|---|---|---|
| Lookback | **12** | Itne bars tak range tight rahe to box banega |
| Max height (× ATR) | **2.0** | Box ban raha hi nahi → **2.5-3.0** karo. Bahut boxes → **1.2-1.5** |
| Trade base breakout | ✅ | Box ke bahar close → BUY / SALE |
| Breakout valid for | 30 | Base tootne ke baad 30 bars tak breakout valid |

### ⑥ Session (optional)
`0915-1530` + `Asia/Kolkata` — ON karne par sirf market hours me signal aayega.

---

## 🔔 Alerts kaise lagaye

1. Indicator ke naam par right-click → **Add alert**.
2. Condition me **SALE / BUY / EXIT** me se ek chuno (ya `Any alert() function call`).
3. Trigger: **Once per bar close** (ye important hai — repaint bachane ke liye).
4. Notification / App / **Webhook URL** (broker ya algo platform) set karo → Create.

Alerts ke messages me `{{ticker}}`, `{{interval}}`, `{{close}}` placeholders already lage hain.

---

## 📊 Backtest (Strategy version)

`SBE_Swing_Strategy.pine` ko chart par add karo → **Strategy Tester** panel:

- Default: qty = 1, commission 0 → P&L **index points** me.
- Rupees me dekhna hai to Settings → **Properties → Order size = 75** (NIFTY lot).
- `ATR trailing stop` ON/OFF karke compare karo — jyada tar cases me trail on karne se drawdown kam hota hai.

---

## ⚖️ Honest baat (ye jaanna zaroori hai)

1. **Pivot `Pivot length` bars baad confirm hota hai.** Chart par label pivot ki bar par chipakta hai (kyunki wahi actual swing tha), lekin **signal tab aata hai jab 5 bars baad wapas cross hota hai**. Real-time me entry price pivot se thoda kharab milega — ye normal aur honest hai.
2. **Repaint nahi** — signal ek baar aaya to gayab/change nahi hota.
3. Ye **setup highlighter** hai, guarantee wala "top/bottom catcher" nahi. Har SALE ke baad girna zaroori nahi.
4. EMAs, ATR, base — sab current chart ke hi data se bante hain, koi future data use nahi hota.
5. **Ye financial advice nahi hai.** Pehle **Bar Replay** par 2-3 hafte test karo, phir paper trade, phir hi paisa lagao.

---

## 🎯 NIFTY 50 / 5-min ke liye suggested preset

```
Pivot length        : 5
Filter              : Off  (ya EMA fast/slow)
Exit on opposite swing : ON
ATR trailing        : OFF  (jab trade ka avg hold badhe to ON)
Side base lookback  : 12
Side base height    : 2.0 × ATR
Trade base breakout : ON
Session             : OFF
```

Zyada signals chahiye → `Pivot length` 3 karo.
Zyada clean chart chahiye → `Pivot length` 8-10 karo.
