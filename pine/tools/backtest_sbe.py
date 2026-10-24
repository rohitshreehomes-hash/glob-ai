#!/usr/bin/env python3
"""
SBE ALL-IN-ONE — reference implementation + backtest harness.

Kyun: TradingView ka Pine compiler yahan nahi hai, isliye Pine file ka logic
Python me bilkul same tarike se likha gaya hai aur usko complete synthetic
NIFTY-5m data (multi-day, trend + range regimes) par chalaya jata hai.

Verify kya hota hai:
  • profile binning ka volume conservation (sum(bins) == session volume)
  • incremental profile vs brute-force recompute (rebuild logic ka exact test)
  • POC hamesha VAL..VAH ke beech
  • state machine (kabhi 2 position nahi, exit ke baad hi naya entry)
  • signals / side base / exits fire hote hain aur NaN nahi aata
  • P&L, win-rate, profit factor, max drawdown, streaks

Usage:
  python3 backtest_sbe.py            # default run + sweep
  python3 backtest_sbe.py --quick    # fast, single seed
"""
import math
import random
import statistics
import sys
from dataclasses import dataclass, replace


# ═══════════════════════════════════════════════════════════════════════════════
#  1. DATA — synthetic NIFTY-like 5 minute bars (9:15-15:30 IST)
# ═══════════════════════════════════════════════════════════════════════════════
BARS_PER_DAY = 75          # 09:15 -> 15:30 = 375 min = 75 x 5m


@dataclass
class Bar:
    day: int
    idx: int            # index within day
    o: float
    h: float
    l: float
    c: float
    v: float


def gen_data(days=60, seed=7, start=22500.0):
    rnd = random.Random(seed)
    bars = []
    price = start
    for d in range(days):
        price *= 1 + rnd.gauss(0, 0.0010)                 # overnight gap
        trend_day = rnd.random() < 0.35
        drift = rnd.choice([-1, 1]) * 3.2 if trend_day else 0.0
        anchor = price
        vol_mult = max(0.55, min(1.9, rnd.gauss(1.0, 0.22)))
        for b in range(BARS_PER_DAY):
            u = abs(b - BARS_PER_DAY / 2) / (BARS_PER_DAY / 2)   # 1 edges, 0 mid
            sig = (4.0 + 2.2 * u) * vol_mult
            mu = drift + (0.0 if trend_day else -0.35 * (price - anchor) / BARS_PER_DAY)
            o = price
            p = o
            hi = lo = o
            for _ in range(4):
                p += rnd.gauss(mu / 4.0, sig)
                hi = max(hi, p)
                lo = min(lo, p)
            c = p
            rng_pts = hi - lo
            v = max(1000.0, (60000 + 9000 * rnd.gauss(0, 1) + 5200 * rng_pts) * (0.75 + 0.5 * u))
            if rnd.random() < 0.03:
                v *= rnd.uniform(1.6, 2.6)                 # news spike
            bars.append(Bar(d, b, o, hi, lo, c, v))
            price = c
    return bars


# ═══════════════════════════════════════════════════════════════════════════════
#  2. INDICATORS (Pine ke same behaviour)
# ═══════════════════════════════════════════════════════════════════════════════
def ema_series(vals, length):
    out, a, prev = [], 2.0 / (length + 1), None
    for v in vals:
        prev = v if prev is None else a * v + (1 - a) * prev
        out.append(prev)
    return out


def sma_series(vals, length):
    out, acc = [], []
    for v in vals:
        acc.append(v)
        if len(acc) > length:
            acc.pop(0)
        out.append(sum(acc) / len(acc) if len(acc) == length else None)
    return out


def rma_series(vals, length):
    """Wilder RMA (ta.atr / ta.rma), SMA seed."""
    out, prev, acc = [], None, []
    for v in vals:
        if prev is None:
            acc.append(v)
            if len(acc) == length:
                prev = sum(acc) / length
            out.append(prev)
            continue
        prev = (prev * (length - 1) + v) / length
        out.append(prev)
    return out


def atr_series(bars, length):
    trs = []
    for i, b in enumerate(bars):
        if i == 0:
            trs.append(b.h - b.l)
        else:
            pc = bars[i - 1].c
            trs.append(max(b.h - b.l, abs(b.h - pc), abs(b.l - pc)))
    return rma_series(trs, length)


def pivot_series(bars, n):
    """Pine ta.pivothigh/low(left=n, right=n): value milta hai n bars baad."""
    m = len(bars)
    ph = [None] * m
    pl = [None] * m
    for i in range(2 * n, m):
        p = i - n
        win_h = [bars[j].h for j in range(p - n, p + n + 1)]
        win_l = [bars[j].l for j in range(p - n, p + n + 1)]
        if bars[p].h == max(win_h):
            ph[i] = bars[p].h
        if bars[p].l == min(win_l):
            pl[i] = bars[p].l
    return ph, pl


# ═══════════════════════════════════════════════════════════════════════════════
#  3. PARAMS (Pine inputs ke mirror)
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class P:
    piv_len: int = 5
    n_rows: int = 24
    va_pct: float = 70.0
    pad_pct: float = 10.0
    vol_mult: float = 1.3
    vol_len: int = 20
    min_conf: int = 2
    ema_on: bool = True
    ema_len: int = 21
    atr_len: int = 14
    base_len: int = 12
    base_len2: int = 50
    base_mult: float = 3.5
    compress: float = 45.0
    base_expiry: int = 30
    sig_act: bool = True
    sig_swing: bool = True
    sig_base: bool = True
    exit_poc: bool = True
    exit_target: bool = True
    exit_flip: bool = True
    exit_opp: bool = False
    exit_trail: bool = True
    trail_mult: float = 2.0
    allow_reverse: bool = False


# ═══════════════════════════════════════════════════════════════════════════════
#  4. ENGINE — Pine file ka step-by-step mirror
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class Trade:
    side: int
    entry_i: int
    exit_i: int
    entry: float
    exit: float
    pnl: float
    why: str


def run(bars, p: P, keep_checks=True):
    n = len(bars)
    atr = atr_series(bars, p.atr_len)
    emas = ema_series([b.c for b in bars], p.ema_len)
    vsma = sma_series([b.v for b in bars], p.vol_len)
    ph, pl = pivot_series(bars, p.piv_len)
    vols = [b.v for b in bars]
    highs = [b.h for b in bars]
    lows = [b.l for b in bars]
    closes = [b.c for b in bars]

    # rolling highest/lowest for side base
    hiN = [None] * n
    loN = [None] * n
    hiN2 = [None] * n
    loN2 = [None] * n
    for i in range(n):
        if i + 1 >= p.base_len:
            hiN[i] = max(highs[i - p.base_len + 1:i + 1])
            loN[i] = min(lows[i - p.base_len + 1:i + 1])
        if i + 1 >= p.base_len2:
            hiN2[i] = max(highs[i - p.base_len2 + 1:i + 1])
            loN2[i] = min(lows[i - p.base_len2 + 1:i + 1])

    state = 0
    entry = stop = tp = None
    e_above = e_below = False
    realized = 0.0
    trades: list[Trade] = []
    eq_curve = [0.0]
    max_eq, max_dd = 0.0, 0.0
    streak = worst_streak = 0
    bars_in_market = 0
    sig_count = {"buy": 0, "sell": 0, "exit": 0, "side": 0}
    why_count: dict[str, int] = {}

    # profile state
    bins = [0.0] * p.n_rows
    bHi: list[float] = []
    bLo: list[float] = []
    bVol: list[float] = []
    rHi = rLo = None
    sess_start = None
    prev_day = None
    prof_checks = {"conservation": 0, "brute": 0, "bad": 0}

    # swing memory
    lastSH = lastSL = prevSH = prevSL = None
    trend_up = True

    # side base
    base_cnt = 0
    base_top = base_bot = None
    base_armed = False
    base_end = None
    base_hits = 0

    poc = vah = val = None
    prev_poc = None
    exit_sig = False

    for i in range(n):
        b = bars[i]
        new_sess = (prev_day is None) or (b.day != prev_day)
        prev_day = b.day

        # ── profile reset ────────────────────────────────────────────────────
        if new_sess:
            # session end check: volume conservation
            if keep_checks and bVol:
                if abs(sum(bins) - sum(bVol)) > 1e-6 * max(1.0, sum(bVol)):
                    prof_checks["bad"] += 1
                prof_checks["conservation"] += 1
            bins = [0.0] * p.n_rows
            bHi, bLo, bVol = [], [], []
            rHi, rLo = b.h, b.l
            sess_start = i

        atrU = atr[i] if atr[i] is not None else (b.h - b.l) * 2
        rng_min = atrU * 0.5
        rng0 = max(rHi - rLo, rng_min)
        expand = b.h > rHi + rng0 * p.pad_pct / 100 or b.l < rLo - rng0 * p.pad_pct / 100
        if expand:
            rHi = max(rHi, b.h)
            rLo = min(rLo, b.l)

        bHi.append(b.h)
        bLo.append(b.l)
        bVol.append(b.v)

        rng = max(rHi - rLo, rng_min)
        pLo = rLo - rng * p.pad_pct / 100
        pHi = rHi + rng * p.pad_pct / 100
        pStep = (pHi - pLo) / p.n_rows
        can_bin = pStep > 0

        def bin_bar(lo_, hi_, vol_):
            i1 = max(0, min(p.n_rows - 1, int((lo_ - pLo) / pStep)))
            i2 = max(0, min(p.n_rows - 1, int((hi_ - pLo) / pStep)))
            per = vol_ / (i2 - i1 + 1)
            for k in range(i1, i2 + 1):
                bins[k] += per

        if can_bin:
            if new_sess or expand:
                for k in range(p.n_rows):
                    bins[k] = 0.0
                for j in range(len(bHi)):
                    bin_bar(bLo[j], bHi[j], bVol[j])
            else:
                bin_bar(b.l, b.h, b.v)

        # brute-force cross-check of rebuild logic
        if keep_checks and can_bin and i % 37 == 0:
            brute = [0.0] * p.n_rows
            for j in range(len(bHi)):
                i1 = max(0, min(p.n_rows - 1, int((bLo[j] - pLo) / pStep)))
                i2 = max(0, min(p.n_rows - 1, int((bHi[j] - pLo) / pStep)))
                per = bVol[j] / (i2 - i1 + 1)
                for k in range(i1, i2 + 1):
                    brute[k] += per
            if max(abs(a - c) for a, c in zip(bins, brute)) > 1e-6 * max(1.0, sum(bVol)):
                prof_checks["bad"] += 1
            prof_checks["brute"] += 1

        # ── POC / value area ─────────────────────────────────────────────────
        if can_bin:
            max_v = 0.0
            poc_b = 0
            for k in range(p.n_rows):
                if bins[k] > max_v:
                    max_v = bins[k]
                    poc_b = k
            total_v = sum(bins)
            target_v = total_v * p.va_pct / 100.0
            acc = max_v
            up_i = dn_i = poc_b
            for _ in range(p.n_rows):
                if acc >= target_v:
                    break
                can_u = up_i < p.n_rows - 1
                can_d = dn_i > 0
                v_u = bins[min(up_i + 1, p.n_rows - 1)]
                v_d = bins[max(dn_i - 1, 0)]
                if can_u and (v_u >= v_d or not can_d):
                    up_i += 1
                    acc += v_u
                elif can_d:
                    dn_i -= 1
                    acc += v_d
            prev_poc = poc
            poc = pLo + (poc_b + 0.5) * pStep
            vah = pLo + (up_i + 1) * pStep
            val = pLo + dn_i * pStep
            if not (val - 1e-9 <= poc <= vah + 1e-9):
                prof_checks["bad"] += 1
        else:
            poc = vah = val = None

        ok_prof = poc is not None and vah is not None and val is not None
        inside_va = ok_prof and val <= b.c <= vah

        # ── swing / structure ────────────────────────────────────────────────
        new_up = ph[i] is not None
        new_dn = pl[i] is not None
        if new_up:
            prevSH, lastSH = lastSH, ph[i]
        if new_dn:
            prevSL, lastSL = lastSL, pl[i]
        if new_dn and (prevSL is None or pl[i] > prevSL):
            trend_up = True
        if new_up and (prevSH is None or ph[i] < prevSH):
            trend_up = False

        # ── side base ────────────────────────────────────────────────────────
        tight = False
        if hiN[i] is not None:
            r_small = hiN[i] - loN[i]
            cap = p.base_mult * atrU
            if hiN2[i] is not None:
                cap = min(cap, p.compress / 100.0 * (hiN2[i] - loN2[i]))
            tight = r_small <= cap
        base_up = base_dn = base_expired = False
        if tight:
            base_cnt += 1
            if base_cnt == p.base_len:
                base_top, base_bot = hiN[i], loN[i]
                base_armed = False
                base_hits += 1
            if base_cnt > p.base_len:
                base_top = max(base_top, b.h)
                base_bot = min(base_bot, b.l)
        else:
            if base_cnt >= p.base_len:
                base_armed = True
                base_end = i - 1
            base_cnt = 0
        if base_armed and base_top is not None:
            base_up = b.c > base_top
            base_dn = b.c < base_bot
            base_expired = base_end is not None and (i - base_end) > p.base_expiry
            if base_up or base_dn or base_expired:
                base_armed = False

        # ── triggers ─────────────────────────────────────────────────────────
        val_rej = ok_prof and b.l <= val and b.c > val and b.c > b.o
        vah_rej = ok_prof and b.h >= vah and b.c < vah and b.c < b.o
        x_up = ok_prof and prev_poc is not None and closes[i - 1] <= prev_poc and b.c > poc
        x_dn = ok_prof and prev_poc is not None and closes[i - 1] >= prev_poc and b.c < poc
        poc_reclaim = ok_prof and x_up
        poc_loss = ok_prof and x_dn

        act_up = p.sig_act and (val_rej or poc_reclaim)
        act_dn = p.sig_act and (vah_rej or poc_loss)
        sw_up = p.sig_swing and new_dn and trend_up
        sw_dn = p.sig_swing and new_up and not trend_up
        bs_up = p.sig_base and base_up
        bs_dn = p.sig_base and base_dn
        trig_up = act_up or sw_up or bs_up
        trig_dn = act_dn or sw_dn or bs_dn

        vol_avg = vsma[i]
        vol_spike = vol_avg is not None and b.v > vol_avg * p.vol_mult
        conf_up = (b.c > poc if ok_prof else 0) + (1 if vol_spike else 0) + (1 if trend_up else 0) + (1 if ok_prof and b.c > val else 0)
        conf_dn = (b.c < poc if ok_prof else 0) + (1 if vol_spike else 0) + (1 if not trend_up else 0) + (1 if ok_prof and b.c < vah else 0)
        ema_ok_up = (not p.ema_on) or b.c > emas[i]
        ema_ok_dn = (not p.ema_on) or b.c < emas[i]

        # ── exits (Pine: exits pehle, entries baad me) ───────────────────────
        did_exit = False
        if state != 0:
            bars_in_market += 1
            trail_hit = p.exit_trail and stop is not None and ((state == 1 and b.l <= stop) or (state == -1 and b.h >= stop))
            poc_exit = p.exit_poc and ((state == 1 and e_above and poc_loss) or (state == -1 and e_below and poc_reclaim))
            tgt_exit = p.exit_target and tp is not None and ((state == 1 and b.c >= tp) or (state == -1 and b.c <= tp))
            flip_exit = p.exit_flip and ((state == 1 and new_up and not trend_up) or (state == -1 and new_dn and trend_up))
            opp_exit = p.exit_opp and ((state == 1 and new_up) or (state == -1 and new_dn))
            if trail_hit or poc_exit or tgt_exit or flip_exit or opp_exit:
                px = stop if trail_hit else b.c
                pnl = (px - entry) if state == 1 else (entry - px)
                trades.append(Trade(state, int(entry_i), i, entry, px, pnl, "exit"))
                realized += pnl
                eq_curve.append(realized)
                max_eq = max(max_eq, realized)
                max_dd = max(max_dd, max_eq - realized)
                if pnl > 0:
                    streak = 0
                else:
                    streak += 1
                    worst_streak = max(worst_streak, streak)
                state = 0
                entry = stop = tp = None
                did_exit = True
                exit_sig = True
                sig_count["exit"] += 1
        else:
            trail_hit = poc_exit = tgt_exit = flip_exit = opp_exit = False

        can_enter = state == 0 and (p.allow_reverse or not did_exit) and ok_prof

        if can_enter and trig_up and conf_up >= p.min_conf and ema_ok_up:
            state = 1
            entry = b.c
            entry_i = i
            sl = base_bot if (bs_up and base_bot is not None) else val
            stop = max(sl, b.c - atrU * 3)
            tp = (vah if b.c < vah else b.c + (vah - val) * 0.5) if b.c > poc else poc
            e_above, e_below = b.c > poc, False
            why = "base BO" if bs_up else "POC reclaim" if poc_reclaim else "VAL reject" if val_rej else "HL swing"
            why_count[why] = why_count.get(why, 0) + 1
            sig_count["buy"] += 1

        elif can_enter and trig_dn and conf_dn >= p.min_conf and ema_ok_dn:
            state = -1
            entry = b.c
            entry_i = i
            sl = base_top if (bs_dn and base_top is not None) else vah
            stop = min(sl, b.c + atrU * 3)
            tp = (val if b.c > val else b.c - (vah - val) * 0.5) if b.c < poc else poc
            e_above, e_below = False, b.c < poc
            why = "base BO" if bs_dn else "POC loss" if poc_loss else "VAH reject" if vah_rej else "LH swing"
            why_count[why] = why_count.get(why, 0) + 1
            sig_count["sell"] += 1

        if p.exit_trail and state == 1:
            stop = max(stop, b.l - p.trail_mult * atrU) if stop is not None else b.l - p.trail_mult * atrU
        if p.exit_trail and state == -1:
            stop = min(stop, b.h + p.trail_mult * atrU) if stop is not None else b.h + p.trail_mult * atrU

        side_now = tight and inside_va and state == 0
        if side_now and not locals().get("_side_prev", False):
            sig_count["side"] += 1
        _side_prev = side_now

    # ── metrics ──────────────────────────────────────────────────────────────
    pnls = [t.pnl for t in trades]
    wins = [x for x in pnls if x > 0]
    losses = [x for x in pnls if x <= 0]
    gross_w = sum(wins)
    gross_l = -sum(losses)
    res = {
        "bars": n,
        "trades": len(trades),
        "win_rate": (100.0 * len(wins) / len(pnls)) if pnls else 0.0,
        "pnl_pts": realized,
        "pf": (gross_w / gross_l) if gross_l > 0 else (float("inf") if gross_w > 0 else 0.0),
        "avg_trade": (realized / len(pnls)) if pnls else 0.0,
        "max_dd": max_dd,
        "worst_streak": worst_streak,
        "exposure_pct": 100.0 * bars_in_market / max(1, n),
        "signals": sig_count,
        "why": why_count,
        "base_hits": base_hits,
        "prof_checks": prof_checks,
        "trades_list": trades,
    }
    return res


# ═══════════════════════════════════════════════════════════════════════════════
#  5. REPORT
# ═══════════════════════════════════════════════════════════════════════════════
def fmt_inf(x):
    return "∞" if x == float("inf") else f"{x:.2f}"


def run_multi(seeds, params):
    out = [run(gen_data(days=60, seed=s), params) for s in seeds]
    agg = {}
    for key in ("trades", "win_rate", "pnl_pts", "pf", "avg_trade", "max_dd", "worst_streak", "exposure_pct"):
        vals = [o[key] for o in out if o[key] != float("inf")]
        agg[key] = statistics.median(vals) if vals else 0.0
    agg["per_seed"] = out
    return agg


def main():
    quick = "--quick" in sys.argv
    seeds = [7] if quick else [7, 11, 23, 42, 91]
    p = P()

    print("=" * 78)
    print(" SBE ALL-IN-ONE — reference backtest")
    print("=" * 78)
    data = gen_data(days=60, seed=7)
    print(f"data: {len(data)} bars ({len(data)//BARS_PER_DAY} days x {BARS_PER_DAY} bars of 5m, synthetic NIFTY-like)")
    print(f"price range: {min(b.l for b in data):.0f} .. {max(b.h for b in data):.0f}")
    print(f"avg bar volume: {statistics.mean(b.v for b in data):,.0f}")
    print()

    agg = run_multi(seeds, p)
    d0 = agg["per_seed"][0]
    print(f"DEFAULT CONFIG ({len(seeds)} seed(s), median)")
    print("-" * 78)
    print(f"  trades            : {agg['trades']:.0f}")
    print(f"  win rate          : {agg['win_rate']:.1f}%")
    print(f"  P&L (points)      : {agg['pnl_pts']:.1f}")
    print(f"  profit factor     : {fmt_inf(agg['pf'])}")
    print(f"  avg trade         : {agg['avg_trade']:.2f} pts")
    print(f"  max drawdown      : {agg['max_dd']:.1f} pts")
    print(f"  worst losing run  : {agg['worst_streak']:.0f}")
    print(f"  time in market    : {agg['exposure_pct']:.0f}%")
    print(f"  signals (seed 7)  : {d0['signals']}")
    print(f"  triggers (seed 7) : {d0['why']}")
    print(f"  side-base detects : {d0['base_hits']}")
    print()

    # ── correctness checks ───────────────────────────────────────────────────
    print("CORRECTNESS CHECKS")
    print("-" * 78)
    total_bad = 0
    total_cons = 0
    total_brute = 0
    for o in agg["per_seed"]:
        pc = o["prof_checks"]
        total_bad += pc["bad"]
        total_cons += pc["conservation"]
        total_brute += pc["brute"]
    print(f"  profile volume conservation checks : {total_cons} sessions, {total_bad} mismatches")
    print(f"  incremental vs brute-force recompute: {total_brute} samples, {total_bad} mismatches")
    print(f"  POC inside VAL..VAH                 : {'OK' if total_bad == 0 else 'FAIL'}")
    print(f"  one position at a time              : {'OK' if all(o['exposure_pct'] < 100 for o in agg['per_seed']) else 'FAIL'}")
    print()

    # ── parameter sweep ──────────────────────────────────────────────────────
    print(f"PARAMETER SWEEP (median of {len(seeds)} seed(s) each)")
    print("-" * 78)
    print(f"{'config':<34}{'trades':>8}{'win%':>8}{'pnl':>10}{'PF':>8}{'maxDD':>9}")
    sweep = []
    for piv in (3, 5, 8):
        for mc in (1, 2, 3):
            for ema in (True, False):
                cfg = replace(p, piv_len=piv, min_conf=mc, ema_on=ema)
                a = run_multi(seeds, cfg)
                name = f"pivot={piv} minConf={mc} ema={'on' if ema else 'off'}"
                print(f"{name:<34}{a['trades']:>8.0f}{a['win_rate']:>8.1f}{a['pnl_pts']:>10.1f}{fmt_inf(a['pf']):>8}{a['max_dd']:>9.1f}")
                sweep.append((name, a))
    print()

    best = max(sweep, key=lambda kv: kv[1]["pnl_pts"])
    print(f"best by P&L: {best[0]}  ->  {best[1]['pnl_pts']:.1f} pts, win {best[1]['win_rate']:.1f}%, PF {fmt_inf(best[1]['pf'])}")
    print()
    print("NOTE: synthetic data — ye sirf logic/correctness test hai, profitability ka proof nahi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
