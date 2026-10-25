import sys, json
sys.path.insert(0,'/home/user/glob-ai/tools/research')
from bt import load, run

BARS = load()
YEARS = sorted({int(b['d'][:4]) for b in BARS})

def stats(log, pts):
    n=len(log)
    if not n: return dict(n=0,sr=0,wr=0,pf=0,pts=0,dd=0,avg=0)
    gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    eq=0.0; peak=0.0; dd=0.0
    for t in log:
        eq+=t['pts']; peak=max(peak,eq); dd=min(dd, eq-peak)
    return dict(n=n,sr=sum(t['r'] for t in log),wr=100*sum(1 for t in log if t['pts']>0)/n,
                pf=(gp/gl if gl else 99),pts=pts,dd=dd,avg=pts/n)

CANDS = {
 'A_v91_shipped' : dict(costPts=2.0),
 'B_noPart_noStall': dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0),
 'C_B_knobs': dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0,
                   idxSl5mMult=2.4, idxTrail15mMult=2.6, rrTarget1=2.0, rrTarget2=4.0, tp2RatchetR=2.8, tp2FloorR=0.5),
 'D_C_cut1130': dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0,
                   idxSl5mMult=2.4, idxTrail15mMult=2.6, rrTarget1=2.0, rrTarget2=4.0, tp2RatchetR=2.8, tp2FloorR=0.5,
                   lastEntryMins=690),
 'E_C_cut1230': dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0,
                   idxSl5mMult=2.4, idxTrail15mMult=2.6, rrTarget1=2.0, rrTarget2=4.0, tp2RatchetR=2.8, tp2FloorR=0.5,
                   lastEntryMins=780),
 'F_D_er030'   : dict(costPts=2.0, useStallExit=False, idxPartialPct=0.0,
                   idxSl5mMult=2.4, idxTrail15mMult=2.6, rrTarget1=2.0, rrTarget2=4.0, tp2RatchetR=2.8, tp2FloorR=0.5,
                   lastEntryMins=690, minErRatio=0.30),
}
out={}
for name,p in CANDS.items():
    per={}
    for y in YEARS:
        sub=[b for b in BARS if int(b['d'][:4])==y]
        r=run(sub,p,years={y},collect=True); per[y]=stats(r['log'],r['pts'])
    r=run(BARS,p,years=set(YEARS),collect=True); tot=stats(r['log'],r['pts'])
    out[name]=dict(per=per,total=tot)
    pos=sum(1 for y in YEARS if per[y]['pts']>0)
    print(f"\n{name}: {tot['n']} tr  {tot['wr']:.1f}%  PF {tot['pf']:.2f}  {tot['pts']:+.0f}p  avg {tot['avg']:+.2f}p  maxDD {tot['dd']:.0f}p  posYears {pos}/{len(YEARS)}")
    print('  ' + '  '.join(f"{y%100:02d}:{per[y]['pts']:+.0f}/{per[y]['n']}" for y in YEARS))
json.dump({k:{'per':{str(y):v for y,v in d['per'].items()},'total':d['total']} for k,d in out.items()}, open('eval.json','w'), indent=1)
