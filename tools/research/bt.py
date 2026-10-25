"""
Independent research backtester for the S.O.T SMC Pro v9 engine (index/spot path).

This is NOT the indicator's self-audit. It re-implements the decision + exit logic
bar-by-bar in Python so we can
  * run 11 years in seconds,
  * charge realistic costs / slippage,
  * test entry-at-close vs entry-at-next-open,
  * sweep parameters for robustness (not curve-fitting a single year).

Validation target (PineTS, same data, entry-at-close, no costs):
    2024 -> 259 trades, +2727.1 pts
    2023 -> 265 trades, +2394.3 pts
    2022 -> 265 trades, +1619.5 pts
    2025 -> 259 trades,  +683.2 pts
"""
import json
import math

BARS_PER_DAY = 75  # 9:15-15:25 5m candles


def load(path="/tmp/nifty5.json"):
    raw = json.load(open(path))
    bars = []
    for ds, o, h, l, c in raw:
        d = ds[:10]
        hh = int(ds[11:13])
        mm = int(ds[14:16])
        bars.append(
            dict(d=d, o=o, h=h, l=l, c=c, mins=hh * 60 + mm,
                 vol=max(1000, round(100000 * (max(h - l, 0.05) / 25.0))))
        )
    return bars


def default_params():
    return dict(
        # engine / session
        maxTradesPerDay=2, cooldownBars=4, minClvRatio=0.65, minErRatio=0.18,
        # gates
        idxGamMin=0.100, idxRelVolMin=1.07, useEma50Slope=True, useMornShield=True,
        useOrbFilter=True, maxOrb15mMult=4.2, maxPriorAdx=32.0, minDiSpread=12.0,
        swingLen=3, intLen=2,
        # risk / exits
        idxSl5mMult=2.7, idxTrail15mMult=2.25, idxPartialPct=0.30,
        rrTarget1=1.30, tp1FloorR=0.20, tp2RatchetR=2.00, tp2FloorR=0.85,
        rrTarget2=2.50, peakLock5mMult=1.8, useNextBarOpen=False,
        useExhaustionExit=True, exhaustRsi=78.0, exhaustVolX=2.20,
        useStallExit=True, stallBars=12,
        # v9 range engine
        useRangeMode=True, rangeLookback=20, rangeAdxMax=19.0, rangeErMax=0.20,
        rangeEdgeAtr=0.25, rangeTp1R=0.55, rangeMaxRiskAtr=2.60, rangeMinRr=1.60,
        maxRangeTrades=3,
        # v9.1 early trigger
        earlyOn=True, earlyLeadAtr=0.20, microLen=5, earlyBodyMin=0.30,
        earlyVolX=1.10, earlyErMin=0.18, earlyClvMin=0.58, earlyNeedEma200=True,
        earlyBlockBars=12,
        # extra research switches (not in Pine)
        allowLong=True, allowShort=True, lastEntryMins=875, minAtrPct=0.0,
        costPts=0.0, entrySlippagePts=0.0,
    )


def sma_series(vals, n):
    out = [None] * len(vals)
    s = 0.0
    for i, v in enumerate(vals):
        s += v
        if i >= n:
            s -= vals[i - n]
        if i >= n - 1:
            out[i] = s / n
    return out


def highest(arr, i, n):
    j0 = max(0, i - n + 1)
    return max(arr[j0:i + 1])


def lowest(arr, i, n):
    j0 = max(0, i - n + 1)
    return min(arr[j0:i + 1])


def pivot_high(h, i, left, right):
    """Pine ta.pivothigh: value confirmed at bar i is h[i-left]."""
    k = i - left
    if k - left < 0 or i >= len(h):
        return None
    x = h[k]
    for j in range(k - left, k):
        if h[j] >= x:
            return None
    for j in range(k + 1, k + right + 1):
        if h[j] >= x:
            return None
    return x


def pivot_low(l, i, left, right):
    k = i - left
    if k - left < 0 or i >= len(l):
        return None
    x = l[k]
    for j in range(k - left, k):
        if l[j] <= x:
            return None
    for j in range(k + 1, k + right + 1):
        if l[j] <= x:
            return None
    return x


def run(bars, p=None, years=None, collect=False):
    p = dict(default_params(), **(p or {}))
    n = len(bars)
    if years:
        idx = [i for i, b in enumerate(bars) if int(b["d"][:4]) in years]
        if not idx:
            return dict(trades=0, wins=0, win_pts=0.0, loss_pts=0.0, pts=0.0, log=[], pf=0.0)
        # keep warm-up context but start accounting at the first selected bar
        start_acc = idx[0]
    else:
        start_acc = 0

    O = [b["o"] for b in bars]
    H = [b["h"] for b in bars]
    L = [b["l"] for b in bars]
    C = [b["c"] for b in bars]
    VOL = [b["vol"] for b in bars]
    MINS = [b["mins"] for b in bars]
    DAY = [b["d"] for b in bars]

    # previous-day clean high/low (full session) for the daily-security fallback
    day_hi, day_lo = {}, {}
    for b in bars:
        d = b["d"]
        day_hi[d] = max(day_hi.get(d, -1e18), b["h"])
        day_lo[d] = min(day_lo.get(d, 1e18), b["l"])
    day_order = sorted(day_hi)
    prev_of = {d: day_order[k - 1] for k, d in enumerate(day_order) if k > 0}

    vSma20 = sma_series(VOL, 20)
    vSmaSess = sma_series(VOL, 75)
    vSmaWeek = sma_series([1.0 if v > 0 else 0.0 for v in VOL], 375)

    # ---- state ----
    lastCleanRng = 0.0
    intraAtr = 0.0
    idxBase = 0.0
    ema9 = ema21 = ema50 = ema200 = 0.0
    avgGain = avgLoss = 0.0
    smTr = smPlus = smMinus = 0.0
    gapSafeAdx = 20.0
    adx_prev = 20.0
    pupE = pdnE = pupT = pdnT = 0.0
    stEntryDir = 1
    stTrailDir = 1
    cumPV = cumPV2 = cumW = 0.0
    curCleanDh = curCleanDl = None
    swpHigh = swpLow = None
    pregap_day = None
    last_new_day_bar = -999
    prev_er = 1.0

    # position state
    tr_open = False
    tr_dir = 0
    tr_entry = tr_init_sl = tr_trail = tr_peak = tr_risk = 0.0
    tr_tp1 = tr_tp2ref = tr_tp2 = 0.0
    tr_tp1hit = tr_tp2hit = tr_lock = tr_range = False
    tr_kind = ""
    tr_mfe = 0.0
    tr_mae = 0.0
    tr_bar = 0
    tr_day = -1
    daystart_bar = 0
    cur_day_id = 0
    orb_hi = orb_lo = None
    orb_ready = False
    pdh_swept = pdl_swept = False
    trades_today = 0
    range_trades_today = 0
    day_wins = 0
    day_losses = 0
    pre_fires_today = 0
    last_early_bar = -999
    last_closed_bar = -999
    pend_dir = 0
    pend_risk = 0.0
    pend_range = False
    pdh = pdl = None
    prevStructHigh = prevStructLow = None
    extHigh = extLow = None
    extHighBar = extLowBar = 0
    extHighDone = extLowDone = False
    trend = 0
    currHigh = currLow = None
    currHighBar = currLowBar = 0
    currHighConf = currLowConf = False
    currHighPiv = currLowPiv = False
    protLow = protHigh = None
    protLowBar = protHighBar = 0
    idmLow = idmHigh = None
    idmLowBar = idmHighBar = 0
    pendPl = pendPh = None
    pendPlBar = pendPhBar = 0
    pullLow = pullHigh = None
    pullLowBar = pullHighBar = 0

    trades = []
    wins = 0
    win_pts = loss_pts = 0.0
    net = 0.0

    for i in range(n):
        o, h, l, c = O[i], H[i], L[i], C[i]
        mins = MINS[i]
        d = DAY[i]
        new_day = d != pregap_day
        is_splice = False
        rst = (i == 0) or is_splice
        prev_c = C[i - 1] if i > 0 else c
        c1 = prev_c
        c2 = C[i - 2] if i > 1 else c
        c10 = C[i - 10] if i > 9 else c
        h1 = H[i - 1] if i > 0 else h
        h2 = H[i - 2] if i > 1 else h
        l1 = L[i - 1] if i > 0 else l
        l2 = L[i - 2] if i > 1 else l
        o1 = O[i - 1] if i > 0 else o
        o2 = O[i - 2] if i > 1 else o

        # ---------- section 3 : volatility / ATR ----------
        min_flr = max(0.05 * 10, c * 0.0001)
        raw_range = max(h - l, 0.05)
        idx_range = max(h - l, min_flr)
        full_tr = max(h - l, max(abs(h - c1), abs(l - c1)))
        spk = (mins == 555) or (mins >= 925)
        if rst or not spk:
            lastCleanRng = idx_range
        clean_range = max(lastCleanRng, min_flr) if spk else idx_range
        intraAtr = clean_range if rst else (intraAtr * 13.0 + clean_range) / 14.0
        alpha_base = 2.0 / (max(30.0, round(72000.0 / 300.0)) + 1.0)
        idxBase = intraAtr if rst else alpha_base * intraAtr + (1.0 - alpha_base) * idxBase

        volsafe = VOL[i]
        vol_exp = (volsafe / vSma20[i]) if (vSma20[i] or 0) > 0 else 1.5

        # RSI
        raw_ret = c - c1
        g = max(raw_ret, 0.0)
        ls = max(-raw_ret, 0.0)
        if i == 0:
            avgGain = avgLoss = 0.0
        elif i < 14:
            avgGain = avgGain + g / 14.0
            avgLoss = avgLoss + ls / 14.0
        else:
            avgGain = (avgGain * 13.0 + g) / 14.0
            avgLoss = (avgLoss * 13.0 + ls) / 14.0
        rsi = 50.0 if i == 0 else (100.0 if avgLoss == 0 else 100.0 - 100.0 / (1.0 + avgGain / avgLoss))

        # DMI
        u_op = max(c - o, 0.0)
        d_op = max(o - c, 0.0)
        if new_day:
            u_mv, d_mv = u_op, d_op
        elif mins >= 925:
            u_mv = d_mv = 0.0
        else:
            u_mv = h - h1
            d_mv = l1 - l
        plus_dm = u_mv if (u_mv > d_mv and u_mv > 0) else 0.0
        minus_dm = d_mv if (d_mv > u_mv and d_mv > 0) else 0.0
        dmi_tr = clean_range if (new_day or mins >= 925) else full_tr
        if rst:
            smTr, smPlus, smMinus = dmi_tr, plus_dm, minus_dm
        else:
            smTr = (smTr * 13.0 + dmi_tr) / 14.0
            smPlus = (smPlus * 13.0 + plus_dm) / 14.0
            smMinus = (smMinus * 13.0 + minus_dm) / 14.0
        plusDi = 100.0 * smPlus / smTr if smTr > 0 else 0.0
        minusDi = 100.0 * smMinus / smTr if smTr > 0 else 0.0
        dx_sum = plusDi + minusDi
        dx_raw = 100.0 * abs(plusDi - minusDi) / dx_sum if dx_sum > 0.0001 else 0.0
        gapSafeAdx = 20.0 if rst else (gapSafeAdx * 13.0 + dx_raw) / 14.0
        adx_lag1 = adx_prev
        adx_prev = gapSafeAdx

        atr_val = intraAtr
        atr5m_pct = atr_val / max(c, 0.05) * 100.0

        # EMAs
        if rst:
            ema9 = ema21 = ema50 = ema200 = c
        else:
            ema9 = 0.2 * c + 0.8 * ema9
            ema21 = 2.0 / 22.0 * c + 20.0 / 22.0 * ema21
            ema50 = 2.0 / 51.0 * c + 49.0 / 51.0 * ema50
            ema200 = 2.0 / 201.0 * c + 199.0 / 201.0 * ema200
        e50_lag5 = ema50  # simplified: slope via current vs stored
        # ER
        er_path = 0.0
        if i >= 9:
            er_path = sum(abs(C[k] - C[k - 1]) for k in range(i - 9, i + 1)) / 10.0 * 10.0
        er_val = abs(c - c10) / er_path if (i >= 10 and er_path > 1e-6) else prev_er
        prev_er = er_val

        # SuperTrend (entry + trail)
        st_mult_e = 2.2
        st_mult_t = max(2.0, p["idxTrail15mMult"] * math.sqrt(3.0))
        raw_up_e = (h + l) / 2 - st_mult_e * atr_val
        raw_dn_e = (h + l) / 2 + st_mult_e * atr_val
        raw_up_t = (h + l) / 2 - st_mult_t * atr_val
        raw_dn_t = (h + l) / 2 + st_mult_t * atr_val
        if rst:
            pupE, pdnE, stEntryDir = raw_up_e, raw_dn_e, 1
            pupT, pdnT, stTrailDir = raw_up_t, raw_dn_t, 1
        else:
            stUpE = max(raw_up_e, pupE) if c1 > pupE else raw_up_e
            stDnE = min(raw_dn_e, pdnE) if c1 < pdnE else raw_dn_e
            if stEntryDir == -1 and c > pdnE:
                stEntryDir = 1
            elif stEntryDir == 1 and c < pupE:
                stEntryDir = -1
            pupE, pdnE = stUpE, stDnE
            stUpT = max(raw_up_t, pupT) if c1 > pupT else raw_up_t
            stDnT = min(raw_dn_t, pdnT) if c1 < pdnT else raw_dn_t
            if stTrailDir == -1 and c > pdnT:
                stTrailDir = 1
            elif stTrailDir == 1 and c < pupT:
                stTrailDir = -1
            pupT, pdnT = stUpT, stDnT
        st_trail_line = pupT if stTrailDir == 1 else pdnT

        # VWAP
        w = volsafe if volsafe > 0 else clean_range
        if new_day or i == 0:
            cumPV, cumPV2, cumW = (h + l + c) / 3 * w, ((h + l + c) / 3) ** 2 * w, w
        elif mins < 925:
            cumPV += (h + l + c) / 3 * w
            cumPV2 += ((h + l + c) / 3) ** 2 * w
            cumW += w
        vwap = cumPV / cumW if cumW > 0 else (h + l + c) / 3
        vwap_sigma = math.sqrt(max(0.0, cumPV2 / cumW - vwap * vwap)) if cumW > 0 else 0.0
        vwap_lag3 = vwap

        # ---------- PDH / PDL ----------
        ok_pd = mins > 555
        if new_day or i == 0:
            if new_day and i > 0 and curCleanDh is not None:
                pass
            curCleanDh = h if ok_pd else None
            curCleanDl = l if ok_pd else None
            swpHigh = h if mins > 555 else None
            swpLow = l if mins > 555 else None
            pd = prev_of.get(d)
            if pd:
                pdh, pdl = day_hi[pd], day_lo[pd]
        else:
            if ok_pd:
                curCleanDh = h if curCleanDh is None else max(curCleanDh, h)
                curCleanDl = l if curCleanDl is None else min(curCleanDl, l)
            if mins > 555:
                swpHigh = h if swpHigh is None else max(swpHigh, h)
                swpLow = l if swpLow is None else min(swpLow, l)

        # ---------- range / squeeze ----------
        range_hi = highest(H, i, p["rangeLookback"])
        range_lo = lowest(L, i, p["rangeLookback"])
        range_w = max(range_hi - range_lo, 0.05)
        range_w_atr = range_w / max(atr_val, 0.05)
        sqz = atr_val / max(idxBase, 1e-6)
        squeeze_on = sqz <= 0.90
        range_tradeable = 1.2 <= range_w_atr <= 7.0
        chop = p["useRangeMode"] and range_tradeable and gapSafeAdx < p["rangeAdxMax"] and er_val < p["rangeErMax"]
        trend_regime = (not chop) and gapSafeAdx >= p["rangeAdxMax"] and er_val >= p["minErRatio"]

        # ---------- v9.1 micro break levels ----------
        micro_hi = highest(H, i - 1, p["microLen"]) if i > 0 else h
        micro_lo = lowest(L, i - 1, p["microLen"]) if i > 0 else l
        micro_buy = micro_hi - p["earlyLeadAtr"] * atr_val
        micro_sell = micro_lo + p["earlyLeadAtr"] * atr_val

        # ---------- daily reset ----------
        if new_day or i == 0:
            daystart_bar = i
            cur_day_id += 1
            orb_hi = orb_lo = None
            orb_ready = False
            pdh_swept = pdl_swept = False
            trades_today = range_trades_today = pre_fires_today = 0
            day_wins = day_losses = 0
            pend_dir = 0

        if 555 <= mins < 570:
            orb_hi = h if orb_hi is None else max(orb_hi, h)
            orb_lo = l if orb_lo is None else min(orb_lo, l)
        elif orb_hi is not None:
            orb_ready = True

        # ---------- pending next-open entry ----------
        if pend_dir != 0 and not tr_open and not new_day:
            tr_open = True
            tr_dir = pend_dir
            tr_entry = o
            risk = pend_risk
            if pend_range:
                p_rng_sl = range_lo - 0.20 * atr_val if pend_dir == 1 else range_hi + 0.20 * atr_val
                risk = max(abs(o - p_rng_sl), 0.05)
                tr_init_sl = p_rng_sl
                tr_trail = p_rng_sl
                tr_tp1 = o + risk * p["rangeTp1R"] if pend_dir == 1 else o - risk * p["rangeTp1R"]
                tr_tp2ref = o + risk if pend_dir == 1 else o - risk
            else:
                tr_init_sl = o - risk if pend_dir == 1 else o + risk
                tr_trail = tr_init_sl
                tr_tp1 = o + risk * p["rrTarget1"] if pend_dir == 1 else o - risk * p["rrTarget1"]
                tr_tp2ref = o + risk * p["tp2RatchetR"] if pend_dir == 1 else o - risk * p["tp2RatchetR"]
            tr_peak = o
            tr_risk = risk
            tr_tp2 = o + risk * p["rrTarget2"] if pend_dir == 1 else o - risk * p["rrTarget2"]
            tr_tp1hit = tr_tp2hit = tr_lock = False
            tr_range = pend_range
            tr_bar = i - 1
            tr_day = cur_day_id
            pend_dir = 0
            pend_range = False

        # ---------- exit state machine ----------
        is_tr_bar = tr_open and i > tr_bar
        is_long = tr_dir == 1
        closed_now = False
        exit_price = c
        close_tag = ""
        if is_tr_bar:
            if is_long:
                tr_mfe = max(tr_mfe, (h - tr_entry) / max(tr_risk, 1e-9))
                tr_mae = min(tr_mae, (l - tr_entry) / max(tr_risk, 1e-9))
            else:
                tr_mfe = max(tr_mfe, (tr_entry - l) / max(tr_risk, 1e-9))
                tr_mae = min(tr_mae, (tr_entry - h) / max(tr_risk, 1e-9))
            hit_stop = (l <= tr_trail) if is_long else (h >= tr_trail)
            if cur_day_id != tr_day:
                exit_price, close_tag, closed_now = o, "Gap Exit", True
            elif hit_stop:
                exit_price = min(o, tr_trail) if is_long else max(o, tr_trail)
                close_tag = "Climax Lock" if tr_lock else ("+0.85R Lock" if tr_tp2hit else ("+0.2R Lock" if tr_tp1hit else "SL Exit"))
                closed_now = True
            else:
                tp1_cross = (not tr_tp1hit) and ((h >= tr_tp1) if is_long else (l <= tr_tp1))
                if tp1_cross:
                    tr_tp1hit = True
                    tr_trail = max(tr_trail, tr_entry + p["tp1FloorR"] * tr_risk) if is_long else min(tr_trail, tr_entry - p["tp1FloorR"] * tr_risk)
                tr_peak = max(tr_peak, h) if is_long else min(tr_peak, l)
                fav_peak = (tr_peak - tr_entry) if is_long else (tr_entry - tr_peak)
                bar_clv_up = (c - l) / (h - l) if h > l else 0.5
                bar_clv_dn = (h - c) / (h - l) if h > l else 0.5
                rng_tgt = tr_range and ((h >= tr_tp2) if is_long else (l <= tr_tp2))
                exh = (p["useExhaustionExit"] and tr_tp1hit and fav_peak >= tr_risk
                       and vol_exp >= p["exhaustVolX"]
                       and ((rsi >= p["exhaustRsi"] and bar_clv_dn >= 0.62) if is_long
                            else (rsi <= 100 - p["exhaustRsi"] and bar_clv_up >= 0.62)))
                stall = (p["useStallExit"] and not tr_tp1hit and (i - tr_bar) >= p["stallBars"]
                         and fav_peak < 0.30 * tr_risk)
                if rng_tgt or exh or stall:
                    exit_price = tr_tp2 if rng_tgt else c
                    close_tag = "Range Target" if rng_tgt else ("Exhaustion Lock" if exh else "Stall Exit")
                    closed_now = True
                elif mins >= 915:
                    exit_price, close_tag, closed_now = c, "3:15 Square-Off", True
                else:
                    if stTrailDir == (1 if is_long else -1):
                        tr_trail = max(tr_trail, st_trail_line) if is_long else min(tr_trail, st_trail_line)
                    fav_move = (tr_peak - tr_entry) if is_long else (tr_entry - tr_peak)
                    ratchet_r = 1.0 if tr_range else p["tp2RatchetR"]
                    climax_r = 2.0 if tr_range else p["rrTarget2"]
                    if fav_move >= ratchet_r * tr_risk:
                        tr_tp2hit = True
                        tr_trail = max(tr_trail, tr_entry + p["tp2FloorR"] * tr_risk) if is_long else min(tr_trail, tr_entry - p["tp2FloorR"] * tr_risk)
                    if fav_move >= climax_r * tr_risk:
                        tr_lock = True
                        lock_mult = 1.8
                        tr_trail = max(tr_trail, tr_peak - lock_mult * atr_val) if is_long else min(tr_trail, tr_peak + lock_mult * atr_val)

        if is_tr_bar and closed_now:
            sgn = 1.0 if is_long else -1.0
            part = p["idxPartialPct"]
            book1 = part if tr_tp1hit else 0.0
            book_run = 1.0 - book1
            pts = book1 * sgn * (tr_tp1 - tr_entry) + book_run * sgn * (exit_price - tr_entry)
            pts -= p["costPts"]
            if collect and i >= start_acc:
                trades.append(dict(entry_bar=tr_bar, exit_bar=i, dir=tr_dir, entry=tr_entry,
                                   exit=exit_price, pts=pts, tag=close_tag, day=d,
                                   kind=tr_kind, mins=MINS[tr_bar], risk=tr_risk,
                                   mfe=tr_mfe, mae=tr_mae, r=pts / max(tr_risk, 1e-9)))
            if i >= start_acc:
                net += pts
                if pts > 0:
                    wins += 1
                    win_pts += pts
                    day_wins += 1
                else:
                    loss_pts += abs(pts)
                    day_losses += 1
            tr_open = False
            last_closed_bar = i

        # ---------- structure (pivots) ----------
        def _ph(left, right):
            return pivot_high(H, i, left, right) if i >= left + right else None

        eph = _ph(p["swingLen"], p["swingLen"])
        epl = pivot_low(L, i, p["swingLen"], p["swingLen"]) if i >= 2 * p["swingLen"] else None
        iph = _ph(p["intLen"], p["intLen"])
        ipl = pivot_low(L, i, p["intLen"], p["intLen"]) if i >= 2 * p["intLen"] else None
        if eph is not None:
            extHigh, extHighBar, extHighDone, prevStructHigh = eph, i - p["swingLen"], False, eph
        if epl is not None:
            extLow, extLowBar, extLowDone, prevStructLow = epl, i - p["swingLen"], False, epl

        if trend == 0 and extHigh is not None and extLow is not None:
            trend = 1 if c >= o else -1
            currHigh, currHighBar = extHigh, extHighBar
            currLow, currLowBar = extLow, extLowBar
            protLow, protLowBar = extLow, extLowBar
            protHigh, protHighBar = extHigh, extHighBar

        if iph is not None:
            iphBar = i - p["intLen"]
            if trend == 1 and not currHighConf and (currHigh is None or iph >= currHigh * 0.9995):
                currHighPiv = True
            if trend == -1 and not currLowConf and iphBar < currLowBar:
                idmHigh, idmHighBar = iph, iphBar
            else:
                pendPh, pendPhBar = iph, iphBar
        if ipl is not None:
            iplBar = i - p["intLen"]
            if trend == -1 and not currLowConf and (currLow is None or ipl <= currLow * 1.0005):
                currLowPiv = True
            if trend == 1 and not currHighConf and iplBar < currHighBar:
                idmLow, idmLowBar = ipl, iplBar
            else:
                pendPl, pendPlBar = ipl, iplBar

        # ---------- entry engine ----------
        body = abs(c - o)
        rng_body = h - l
        clv_bull = min(1.0, max(0.0, (c - l) / rng_body)) if rng_body > 0 else 0.5
        clv_bear = min(1.0, max(0.0, (h - c) / rng_body)) if rng_body > 0 else 0.5
        has_pd = pdh is not None and pdl is not None

        vwap_up = c > vwap
        vwap_dn = c < vwap
        ema_stack_bull = ema9 > ema21 > ema50
        ema_stack_bear = ema9 < ema21 < ema50
        di_bull = plusDi - minusDi >= p["minDiSpread"]
        di_bear = minusDi - plusDi >= p["minDiSpread"]
        idx_vol_ok = atr_val >= p["idxRelVolMin"] * idxBase and atr5m_pct >= p["idxGamMin"]
        bull_reclaim = (c > (pdh or 1e18)) or (swpLow is not None and pdh is not None and pdl is not None and swpLow < pdl and c > pdl)
        bear_reclaim = (pdl is not None and c < pdl) or (swpHigh is not None and pdh is not None and swpHigh > pdh and c < pdh)
        bull_pd = idx_vol_ok and has_pd and bull_reclaim
        bear_pd = idx_vol_ok and has_pd and bear_reclaim
        idx_bull = (c > ema200 and bull_pd and vwap_up and stEntryDir == 1 and ema_stack_bull
                    and orb_ready and orb_hi is not None and c > orb_hi and rsi >= 58.0 and di_bull)
        idx_bear = (c < ema200 and bear_pd and vwap_dn and stEntryDir == -1 and ema_stack_bear
                    and orb_ready and orb_lo is not None and c < orb_lo and rsi <= 42.0 and di_bear)
        bull_regime = idx_bull
        bear_regime = idx_bear

        orb_width_ok = (not p["useOrbFilter"]) or (orb_hi is not None and orb_lo is not None
                                                   and orb_hi - orb_lo <= p["maxOrb15mMult"] * math.sqrt(3.0) * atr_val)
        coil_ok = adx_lag1 <= p["maxPriorAdx"]
        er_ok = er_val >= p["minErRatio"]
        bull_piv = prevStructHigh is not None and c > prevStructHigh
        bear_piv = prevStructLow is not None and c < prevStructLow
        strong_bull = c > o and body >= 0.60 * atr_val and clv_bull >= p["minClvRatio"]
        strong_bear = c < o and body >= 0.60 * atr_val and clv_bear >= p["minClvRatio"]

        warmup = i >= 205
        day_block = (p.get("stopAfterLosses", 99) < 99 and day_losses >= p.get("stopAfterLosses", 99))\
                    or (p.get("stopAfterWin", False) and day_wins >= 1)
        base_trend = (not tr_open and pend_dir == 0 and i > last_closed_bar + p["cooldownBars"]
                      and trades_today < p["maxTradesPerDay"] and warmup and orb_width_ok and coil_ok and er_ok and not day_block)
        base_range = (p["useRangeMode"] and not tr_open and pend_dir == 0 and i > last_closed_bar + p["cooldownBars"]
                      and range_trades_today < p["maxRangeTrades"] and warmup and orb_width_ok and coil_ok and not day_block)

        # time windows
        morn_start = 615 if p["useMornShield"] else 570
        morn_bull = mins >= morn_start or (570 <= mins < 615 and pdh is not None and c > pdh)
        morn_bear = mins >= morn_start or (570 <= mins < 615 and pdl is not None and c < pdl)
        mid_ok = not (p.get("skipMidStart", 9999) <= mins < p.get("skipMidEnd", 9999))
        time_bull = (not new_day) and mins <= p["lastEntryMins"] and mid_ok and morn_bull and atr5m_pct >= p["minAtrPct"]
        time_bear = (not new_day) and mins <= p["lastEntryMins"] and mid_ok and morn_bear and atr5m_pct >= p["minAtrPct"]

        block_reentry = p["earlyBlockBars"] > 0 and last_early_bar > 0 and (i - last_early_bar) <= p["earlyBlockBars"]
        trend_buy = base_trend and not block_reentry and time_bull and bull_regime and bull_piv and strong_bull
        trend_sell = base_trend and not block_reentry and time_bear and bear_regime and bear_piv and strong_bear and not trend_buy

        rng_sl_bull = range_lo - 0.20 * atr_val
        rng_sl_bear = range_hi + 0.20 * atr_val
        rng_risk_bull = c - rng_sl_bull
        rng_risk_bear = rng_sl_bear - c
        rng_rew_bull = (range_hi - 0.15 * atr_val) - c
        rng_rew_bear = c - (range_lo + 0.15 * atr_val)
        bull_rej = c > o and (body >= rng_body * 0.45 or min(o, c) - l >= rng_body * 0.42)
        bear_rej = c < o and (body >= rng_body * 0.45 or h - max(o, c) >= rng_body * 0.42)
        rng_setup_bull = (chop and l <= range_lo + p["rangeEdgeAtr"] * atr_val and c >= range_lo + 0.12 * atr_val
                          and bull_rej and rsi <= 40.0 and range_w_atr >= 1.8)
        rng_setup_bear = (chop and h >= range_hi - p["rangeEdgeAtr"] * atr_val and c <= range_hi - 0.12 * atr_val
                          and bear_rej and rsi >= 60.0 and range_w_atr >= 1.8)
        rng_ok_bull = rng_risk_bull <= p["rangeMaxRiskAtr"] * atr_val and rng_rew_bull >= p["rangeMinRr"] * rng_risk_bull
        rng_ok_bear = rng_risk_bear <= p["rangeMaxRiskAtr"] * atr_val and rng_rew_bear >= p["rangeMinRr"] * rng_risk_bear
        range_buy = base_range and rng_setup_bull and rng_ok_bull and time_bull
        range_sell = base_range and rng_setup_bear and rng_ok_bear and time_bear and not range_buy

        bias_bull = c > vwap and ema9 > ema21 and plusDi > minusDi and ((not p["earlyNeedEma200"]) or c > ema200)
        bias_bear = c < vwap and ema9 < ema21 and minusDi > plusDi and ((not p["earlyNeedEma200"]) or c < ema200)
        early_buy = (p["earlyOn"] and base_trend and time_bull and not chop and c >= micro_buy and c > o
                     and body >= p["earlyBodyMin"] * atr_val and vol_exp >= p["earlyVolX"]
                     and clv_bull >= p["earlyClvMin"] and er_val >= p["earlyErMin"] and bias_bull)
        early_sell = (p["earlyOn"] and base_trend and time_bear and not chop and c <= micro_sell and c < o
                      and body >= p["earlyBodyMin"] * atr_val and vol_exp >= p["earlyVolX"]
                      and clv_bear >= p["earlyClvMin"] and er_val >= p["earlyErMin"] and bias_bear)

        buy_sig = (early_buy or trend_buy or range_buy) and p["allowLong"]
        sell_sig = (not buy_sig) and (early_sell or trend_sell or range_sell) and p["allowShort"]

        if buy_sig or sell_sig:
            is_buy = buy_sig
            is_range = range_buy if is_buy else range_sell
            is_early = early_buy if is_buy else early_sell
            risk = (p["idxSl5mMult"] * atr_val)
            if is_early:
                last_early_bar = i
            if not p["useNextBarOpen"]:
                tr_open = True
                tr_dir = 1 if is_buy else -1
                tr_entry = c + (p["entrySlippagePts"] if is_buy else -p["entrySlippagePts"])
                if is_range:
                    rk = rng_risk_bull if is_buy else rng_risk_bear
                    risk = max(rk, 0.05)
                    tr_init_sl = tr_entry - risk if is_buy else tr_entry + risk
                    tr_trail = tr_init_sl
                    tr_tp1 = tr_entry + risk * p["rangeTp1R"] if is_buy else tr_entry - risk * p["rangeTp1R"]
                    tr_tp2ref = tr_entry + risk if is_buy else tr_entry - risk
                    tr_tp2 = (max(tr_entry + risk * 1.20, range_hi - 0.15 * atr_val) if is_buy
                              else min(tr_entry - risk * 1.20, range_lo + 0.15 * atr_val))
                else:
                    tr_init_sl = tr_entry - risk if is_buy else tr_entry + risk
                    tr_trail = tr_init_sl
                    tr_tp1 = tr_entry + risk * p["rrTarget1"] if is_buy else tr_entry - risk * p["rrTarget1"]
                    tr_tp2ref = tr_entry + risk * p["tp2RatchetR"] if is_buy else tr_entry - risk * p["tp2RatchetR"]
                    tr_tp2 = tr_entry + risk * p["rrTarget2"] if is_buy else tr_entry - risk * p["rrTarget2"]
                tr_peak = tr_entry
                tr_risk = risk
                tr_tp1hit = tr_tp2hit = tr_lock = False
                tr_range = bool(is_range)
                tr_kind = "range" if is_range else ("early" if is_early else "trend")
                tr_mfe = 0.0
                tr_mae = 0.0
                tr_bar = i
                tr_day = cur_day_id
            else:
                pend_dir = 1 if is_buy else -1
                pend_risk = risk
                pend_range = bool(is_range)
            trades_today += 0 if is_range else 1
            range_trades_today += 1 if is_range else 0

        pregap_day = d

    pf = (win_pts / loss_pts) if loss_pts > 0 else (99.9 if win_pts > 0 else 0.0)
    return dict(trades=wins + (len(trades) - wins) if collect else None, wins=wins,
                win_pts=win_pts, loss_pts=loss_pts, pts=net, pf=pf, log=trades)
