import sys, itertools, statistics as st
from multiprocessing import Pool
sys.path.insert(0, '/home/user/glob-ai/tools/research')
from bt import load, run

BARS = load()
TRAIN = [b for b in BARS if int(b['d'][:4]) <= 2021]
TEST  = [b for b in BARS if int(b['d'][:4]) >= 2022]

def evaluate(args):
    name, p = args
    out = {}
    for tag, bars, ys in (("train", TRAIN, set(range(2015, 2022))), ("test", TEST, set(range(2022, 2027)))):
        r = run(bars, p, years=ys, collect=True)
        n = len(r['log'])
        sr = sum(t['r'] for t in r['log'])
        wins = sum(1 for t in r['log'] if t['pts'] > 0)
        gp = sum(t['pts'] for t in r['log'] if t['pts'] > 0)
        gl = -sum(t['pts'] for t in r['log'] if t['pts'] <= 0)
        out[tag] = dict(n=n, sr=sr, wr=100*wins/n if n else 0, pf=gp/gl if gl else 99, pts=r['pts'])
    return name, out

if __name__ == '__main__':
    base = dict(costPts=2.0)
    variants = {
        "baseline": {},
        "no_stall": dict(useStallExit=False),
        "no_stall+cut13": dict(useStallExit=False, lastEntryMins=780),
        "no_stall+cut11:30": dict(useStallExit=False, lastEntryMins=690),
        "cut13": dict(lastEntryMins=780),
        "cut11:30": dict(lastEntryMins=690),
        "no_partial": dict(useStallExit=False, idxPartialPct=0.0),
        "partial50": dict(useStallExit=False, idxPartialPct=0.5),
        "tp1_2R": dict(useStallExit=False, rrTarget1=2.0),
        "ratchet1.5": dict(useStallExit=False, tp2RatchetR=1.5, tp2FloorR=0.5),
        "climax3.5": dict(useStallExit=False, rrTarget2=3.5),
        "sl_2.0": dict(useStallExit=False, idxSl5mMult=2.0),
        "sl_3.4": dict(useStallExit=False, idxSl5mMult=3.4),
        "trail_1.6": dict(useStallExit=False, idxTrail15mMult=1.6),
        "trail_3.0": dict(useStallExit=False, idxTrail15mMult=3.0),
        "trades1": dict(useStallExit=False, maxTradesPerDay=1),
        "trades3": dict(useStallExit=False, maxTradesPerDay=3),
        "er0.26": dict(useStallExit=False, minErRatio=0.26),
        "er0.32": dict(useStallExit=False, minErRatio=0.32),
        "di18": dict(useStallExit=False, minDiSpread=18.0),
        "relvol1.25": dict(useStallExit=False, idxRelVolMin=1.25),
        "early_off": dict(useStallExit=False, earlyOn=False),
        "long_only": dict(useStallExit=False, allowShort=False),
    }
    jobs = [(k, dict(base, **v)) for k, v in variants.items()]
    with Pool(8) as pool:
        res = pool.map(evaluate, jobs)
    print(f"{'variant':20}{'train n':>8}{'trainR':>8}{'tPF':>6}{'test n':>8}{'testR':>8}{'sPF':>6}{'testPts':>9}")
    for name, o in sorted(res, key=lambda x: -(x[1]['train']['sr'])):
        t, s = o['train'], o['test']
        print(f"{name:20}{t['n']:>8}{t['sr']:>8.0f}{t['pf']:>6.2f}{s['n']:>8}{s['sr']:>8.0f}{s['pf']:>6.2f}{s['pts']:>9.0f}")
