import sys
sys.path.insert(0,'.')
from bt import load, run
BARS=load(); Y=set(range(2015,2027))
def st(log,pts):
    n=len(log); gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    eq=pk=dd=0.0
    for t in log: eq+=t['pts']; pk=max(pk,eq); dd=min(dd,eq-pk)
    per={y:round(sum(t['pts'] for t in log if int(t['day'][:4])==y)) for y in range(2015,2027)}
    return n,(100*sum(1 for t in log if t['pts']>0)/n),(gp/gl if gl else 99),pts,dd,per
B=dict(costPts=2.0,useStallExit=False,idxPartialPct=0.0)
V={'v9.2a rT2=4':dict(B,rrTarget2=4.0),
   'v9.2b rT2=4 sl3':dict(B,rrTarget2=4.0,idxSl5mMult=3.0),
   'v9.2c rT2=4 sl3 er.30':dict(B,rrTarget2=4.0,idxSl5mMult=3.0,minErRatio=0.30),
   'cur shipped v9.1':dict(costPts=2.0)}
for k,p in V.items():
    r=run(BARS,p,years=Y,collect=True); n,wr,pf,pts,dd,per=st(r['log'],r['pts'])
    r4=run(BARS,dict(p,costPts=4.0),years=Y,collect=True); _,_,pf4,pts4,_,_=st(r4['log'],r4['pts'])
    r0=run(BARS,dict(p,costPts=0.0),years=Y,collect=True); _,_,_,pts0,_,_=st(r0['log'],r0['pts'])
    print(f"{k:>24}: {n:>5}tr {wr:4.1f}% PF {pf:.2f} {pts:+8.0f}p DD {dd:6.0f} | c0 {pts0:+7.0f} c4 {pts4:+7.0f} PF4 {pf4:.2f} | 15{per[2015]:+5d} 16{per[2016]:+5d} 17{per[2017]:+5d} 18{per[2018]:+5d} 19{per[2019]:+5d} 20{per[2020]:+5d} 21{per[2021]:+5d} 22{per[2022]:+5d} 23{per[2023]:+5d} 24{per[2024]:+5d} 25{per[2025]:+5d} 26{per[2026]:+4d}")
