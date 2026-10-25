import sys, random, json, statistics as st
from multiprocessing import Pool
sys.path.insert(0, '/home/user/glob-ai/tools/research')
from bt import load, run

BARS = load()
TRAIN = [b for b in BARS if int(b['d'][:4]) <= 2021]
TEST  = [b for b in BARS if int(b['d'][:4]) >= 2022]
TR_Y = set(range(2015, 2022)); TE_Y = set(range(2022, 2027))

def summ(r):
    log = r['log']; n = len(log)
    if not n: return dict(n=0, sr=0, wr=0, pf=0, pts=0)
    gp = sum(t['pts'] for t in log if t['pts'] > 0)
    gl = -sum(t['pts'] for t in log if t['pts'] <= 0)
    return dict(n=n, sr=sum(t['r'] for t in log), wr=100*sum(1 for t in log if t['pts'] > 0)/n,
                pf=(gp/gl if gl else 99), pts=r['pts'])

def ev(job):
    i, p = job
    tr = summ(run(TRAIN, p, years=TR_Y, collect=True))
    return i, tr, p

if __name__ == '__main__':
    random.seed(7)
    base = dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0)
    grids = dict(
        idxSl5mMult=[2.0,2.4,2.7,3.0,3.3,3.6],
        idxTrail15mMult=[1.6,2.0,2.25,2.6,3.0,3.4],
        rrTarget1=[0.8,1.1,1.3,1.6,2.0,2.4],
        tp1FloorR=[0.0,0.1,0.2,0.3,0.45],
        tp2RatchetR=[1.4,1.7,2.0,2.4,2.8],
        tp2FloorR=[0.3,0.5,0.7,0.85,1.1],
        rrTarget2=[2.0,2.5,3.0,3.5,4.0],
        lastEntryMins=[690,780,840,875],
        minErRatio=[0.12,0.18,0.24,0.30],
        minDiSpread=[8.0,12.0,16.0,20.0],
        idxRelVolMin=[0.95,1.07,1.20,1.32],
        idxGamMin=[0.06,0.10,0.14,0.18],
        maxTradesPerDay=[1,2,3],
        cooldownBars=[0,2,4,8],
        earlyLeadAtr=[0.05,0.20,0.35],
        microLen=[3,5,8],
        earlyBodyMin=[0.20,0.30,0.40],
        earlyClvMin=[0.50,0.58,0.66],
        minClvRatio=[0.55,0.65,0.75],
    )
    cfgs = [dict(base)]
    for _ in range(320):
        cfgs.append(dict(base, **{k: random.choice(v) for k, v in grids.items()}))
    jobs = list(enumerate(cfgs))
    with Pool(8) as pool:
        res = pool.map(ev, jobs, chunksize=2)
    res = [r for r in res if r[1]['sr'] > -1e9]
    res.sort(key=lambda x: -x[1]['sr'])
    print("TOP 12 by TRAIN sumR (net of 2pt cost, no partial, no stall)")
    print(f"{'#':>3}{'trainN':>7}{'trainR':>8}{'wr':>6}{'pf':>6}  params")
    top = []
    for idx, tr, p in res[:12]:
        print(f"{idx:>3}{tr['n']:>7}{tr['sr']:>8.0f}{tr['wr']:>6.1f}{tr['pf']:>6.2f}", json.dumps({k: p[k] for k in grids}))
        top.append(p)
    json.dump(top, open('/home/user/glob-ai/tools/research/top.json', 'w'), indent=1)
