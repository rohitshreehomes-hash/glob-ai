import sys; sys.path.insert(0,'.')
from bt import load, run
BARS=load()
TR=[b for b in BARS if int(b['d'][:4])<=2021]; TE=[b for b in BARS if int(b['d'][:4])>=2022]
TY=set(range(2015,2022)); EY=set(range(2022,2027))
B=dict(costPts=2.0,useStallExit=False,idxPartialPct=0.0,rrTarget2=4.0,idxSl5mMult=3.0)
def st(log,pts):
    n=len(log); gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    eq=pk=dd=0.0
    for t in log: eq+=t['pts']; pk=max(pk,eq); dd=min(dd,eq-pk)
    return n,sum(t['r'] for t in log),(gp/gl if gl else 99),pts,dd
V={'base_v9.2':dict(B),
   'stopAfterLoss_1':dict(B,stopAfterLosses=1),
   'stopAfterLoss_2':dict(B,stopAfterLosses=2),
   'stopAfterWin_1':dict(B,stopAfterWin=True),
   'loss1+cap3':dict(B,stopAfterLosses=1,maxTradesPerDay=3)}
print(f"{'variant':<18}{'trN':>6}{'trR':>7}{'trPF':>6} | {'teN':>5}{'teR':>7}{'tePF':>6}{'tePts':>8}{'teDD':>7}")
for k,v in V.items():
    a=run(TR,v,years=TY,collect=True); b=run(TE,v,years=EY,collect=True)
    n1,r1,p1,_,_=st(a['log'],a['pts']); n2,r2,p2,x2,d2=st(b['log'],b['pts'])
    print(f"{k:<18}{n1:>6}{r1:>7.0f}{p1:>6.2f} | {n2:>5}{r2:>7.0f}{p2:>6.2f}{x2:>+8.0f}{d2:>7.0f}")
