# 📈 SBE ALL-IN-ONE — TradingView Pine Script (v6)

**Ek hi file, sab kuch:** Volume Profile (log kahan trade kar rahe hain) + Swing + Side Base + **BUY / SALE / SIDE / EXIT** + Dashboard + Alerts.

| File | Kaam |
|---|---|
| **`SBE_AllInOne.pine`** | ⭐ **Yahi use karo** — pura indicator ek hi file me |
| `TEST_REPORT.md` | Testing report (static check + backtest + edge cases + ablation) |
| `tools/validate_pine.py` | Pine v6 static checker |
| `tools/backtest_sbe.py` | Same logic ka Python backtest (complete data par) |
| `archive/` | Purane 3 scripts (swing-only, activity-only, strategy) — reference ke liye |

---

## 🚀 Install (1 minute)

1. TradingView → **Pine Editor** → `Open` → `New blank indicator`
2. `SBE_AllInOne.pine` ka **pura code** paste karo
3. **Save** → naam do (`SBE ALL-IN-ONE`) → **Add to chart**
4. Chart: **NIFTY 50 / NIFTY futures, 5 minute**
5. Settings ⚙️ se tune karo (neeche suggested preset)

---

## 🧠 Ye kya karta hai

### 1) Activity Map — "log yahan trade kar rahe hain"
| Cheez | Matlab |
|---|---|
| 🟧 **POC** | Jis price par **sabse zyada volume** — sabse strong level |
| 🔵 **VAH / VAL** | **Value area** — jahan 70% trading hui (crowd ka area) |
| 🟦 **Histogram** | Right side: kis price par kitna volume |
| ⬛ **HVN shelves** | High volume nodes = strong support/resistance |
| ⚡ **Volume spikes** | Average se 1.3× zyada volume wali bars |

### 2) Signals (3 sources, sab ek saath)
| BUY side | SALE side |
|---|---|
| VAL reject (support se wapas upar) | VAH reject (resistance se wapas neeche) |
| POC reclaim (POC ke upar close) | POC loss (POC ke neeche close) |
| Side base ka **upside breakout** | Side base ka **downside breakdown** |
| Higher-low swing | Lower-high swing |

Har signal ko **4-point score** + **EMA gate** se filter kiya jata hai (`minConf` = 2 default).

### 3) SIDE — trade mat lo
Market jab value area ke andar **compress** ho raha ho (chhoti range ≤ 45% of badi range) → `SIDE` label.
Breakout hone par hi BUY/SALE aata hai.

### 4) EXIT
POC loss · target (VAH/VAL) · swing flip · ATR trailing stop (default ON).

---

## 📊 Dashboard (top-right)

```
SBE ALL-IN-ONE        NIFTY · 5
Decision              BUY CONFIRM ✓   <- BUY / SALE / SIDE / WAIT / RUNNING
Trigger               VAL reject
Position              LONG
POC                   22,510.00
VAH / VAL             22,585.00 / 22,455.00
Volume                1.8× avg ⚡
Entry                 22,470.00
SL / Target           22,410.00 / 22,585.00
Score L / S           3/4 · 1/4
Trades W / L          7 · 5 / 2
P&L (points)          +412 pts · PF 1.6
Active                ACT SWING BASE · Day
```

---

## ⚙️ Settings — jahan haath lagana chahiye

| Group | Setting | Default | Kab badlo |
|---|---|---|---|
| ① Signals | Activity / Swing / Base | sab ON | Sirf swing chahiye → Activity OFF |
| ① Signals | Min score | 2 | 3 = kam par strong signals |
| ② Activity | Anchor | Day | Intraday 5m ke liye best |
| ② Activity | Rows | 24 | 12 = mota profile, 36 = fine |
| ② Activity | Value area % | 70 | Standard |
| ③ Swing | Pivot length | 5 | 3 = zyada signals, 8 = major swings |
| ④ Side base | Compression % | 45 | Zyada base → 55, kam → 35 |
| ⑤ Confirmation | EMA gate | ON | OFF = zyada signals (kam quality) |
| ⑥ Exits | ATR trailing | ON | Trend follow karna hai to ON hi rakho |
| ⑥ Exits | Target | ON | OFF = winners ko chalne do (DD badhta hai) |
| ⑦ Session | 0915-1530 | OFF | ON karke sirf market hours |

---

## 🔔 Alerts

Indicator → right-click → **Add alert** → condition: `BUY CONFIRM` / `SALE CONFIRM` / `EXIT` / `SIDE — wait`
→ **Once per bar close** → App / Email / Webhook.

---

## 🧪 Testing (details: `TEST_REPORT.md`)

| Test | Result |
|---|---|
| Static check (brackets, scope, namespaces, `var` scope, duplicates) | ✅ 0 errors, 563 lines |
| Profile volume conservation | ✅ 295/295 sessions |
| Incremental vs brute-force profile | ✅ 610/610 samples |
| POC always inside VAL..VAH | ✅ |
| One position at a time | ✅ |
| Edge cases (flat market, zero volume, 8% gap, 120 bars, extreme params) | ✅ no crash |
| Backtest, 5 seeds median (synthetic 5m, 60 din) | 481 trades · 46.1% win · **+998.6 pts** · PF **1.33** · maxDD 264 |

**Testing ne jo fix karwaya:** side base detection ko compression-based banaya (pehle 2×ATR se kabhi detect hi nahi hota tha), SIDE label cooldown, trail default ON (P&L +45%, DD −31%).

---

## ⚖️ Honest baatein

1. **Repaint nahi** — sab signals bar close par (`barstate.isconfirmed`).
2. **Volume profile futures chart par best** kaam karta hai; spot index par volume approximate hota hai.
3. Backtest **synthetic data** par hai — ye logic/correctness ka proof hai, **profit ka proof nahi**. Real data par khud Bar Replay se check karo.
4. **Slippage/commission** model me nahi hai. Avg trade 2 points ka hai — real me cost isse kaafi kha jayegi.
5. **Financial advice nahi.** Pehle replay → phir paper → phir chhoti size.
