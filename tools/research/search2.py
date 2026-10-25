import sys, random, json
from multiprocessing import Pool
sys.path.insert(0, '/home/user/glob-ai/tools/research')
from bt import load, run

BARS = load()
TRAIN = [b for b in BARS if int(b['d'][:4]) <= 2021]
TEST  = [b for b in BARS if int(b['d'][:4]) >= 2022]
TR_Y = set(range(2015, 2022)); TE_Y = set(range(2022, 2027))

def summ(log, pts):
    n = len(log)
    if not n: return dict(n=0, sr=0.0, wr=0.0, pf=0.0, pts=0.0, rpt=0.0)
    gp = sum(t['pts'] for t in log if t['pts'] > 0); gl = -sum(t['pts'] for t in log if t['pts'] <= 0)
    return dict(n=n, sr=round(sum(t['r'] for t in log),2), wr=round(100*sum(1 for t in log if t['pts']>0)/n,1),
                pf=round((gp/gl if gl else 99),3), pts=round(pts,1), rpt=round(sum(t['r'] for t in log)/n,4))

def ev(job):
    i, p = job
    a = run(TRAIN, p, years=TR_Y, collect=True); b = run(TEST, p, years=TE_Y, collect=True)
    return i, summ(a['log'], a['pts']), summ(b['log'], b['pts']), p

random.seed(7)
base = dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0)
grids = dict(
    idxSl5mMult=[2.0,2.4,2.7,3.0,3.3,3.6], idxTrail15mMult=[1.6,2.0,2.25,2.6,3.0,3.4],
    rrTarget1=[0.8,1.1,1.3,1.6,2.0,2.4], tp1FloorR=[0.0,0.1,0.2,0.3,0.45],
    tp2RatchetR=[1.4,1.7,2.0,2.4,2.8], tp2FloorR=[0.3,0.5,0.7,0.85,1.1],
    rrTarget2=[2.0,2.5,3.0,3.5,4.0], lastEntryMins=[690,780,840,875],
    minErRatio=[0.12,0.18,0.24,0.30], minDiSpread=[8.0,12.0,16.0,20.0],
    idxRelVolMin=[0.95,1.07,1.20,1.32], idxGamMin=[0.06,0.10,0.14,0.18],
    maxTradesPerDay=[1,2,3], cooldownBars=[0,2,4,8], earlyLeadAtr=[0.05,0.20,0.35],
    microLen=[3,5,8], earlyBodyMin=[0.20,0.30,0.40], earlyClvMin=[0.50,0.58,0.66],
    minClvRatio=[0.55,0.65,0.75],
)
cfgs = [dict(base)] + [dict(base, **{k: random.choice(v) for k, v in grids.items()}) for _ in range(319)]

if __name__ == '__main__':
    with Pool(8) as pool:
        res = pool.map(ev, list(enumerate(cfgs)), chunksize=2)
    json.dump([{'i':i,'tr':a,'te':b,'p':p} for i,a,b,p in res], open('sweep.json','w'))
    res = res[1:]  # drop baseline duplicate for marginals
    print(f"n configs {len(res)}")
    hdr = f"{'param':>17} {'value':>7} {'k':>4} {'trR/t':>7} {'teR/t':>7} {'both':>5} {'trPF':>6} {'tePF':>6}"
    print(hdr); print('-'*len(hdr))
    rows=[]
    for k, vals in grids.items():
        for v in vals:
            sel = [r for r in res if r[3][k]==v]
            if not sel: continue
            tr = sum(r[1]['rpt'] for r in sel)/len(sel); te = sum(r[2]['rpt'] for r in sel)/len(sel)
            trpf = sum(r[1]['pf'] for r in sel)/len(sel); tepf = sum(r[2]['pf'] for r in sel)/len(sel)
            rows.append((k,v,len(sel),tr,te,trpf,tepf,min(tr,te)))
    for k in grids:
        sub=[r for r in rows if r[0]==k]; sub.sort(key=lambda r:-r[7])
        for r in sub: print(f"{r[0]:>17} {str(r[1]):>7} {r[2]:>4} {r[3]:>7.3f} {r[4]:>7.3f} {'YES' if r[7]>0 else 'no':>5} {r[5]:>6.2f} {r[6]:>6.2f}")
        print()
