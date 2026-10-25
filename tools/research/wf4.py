import sys; sys.path.insert(0,'.')
from bt import load, run
BARS=load()
TR=[b for b in BARS if int(b['d'][:4])<=2021]; TE=[b for b in BARS if int(b['d'][:4])>=2022]
TY=set(range(2015,2022)); EY=set(range(2022,2027))
B=dict(costPts=2.0,useStallExit=False,idxPartialPct=0.0,rrTarget2=4.0,idxSl5mMult=3.0)
def st(log,pts):
    n=len(log); gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    return n,sum(t['r'] for t in log),(gp/gl if gl else 99),pts
V={'base':dict(B),
   'er0.22':dict(B,minErRatio=0.22),'er0.26':dict(B,minErRatio=0.26),
   'cool8':dict(B,cooldownBars=8),'cool2':dict(B,cooldownBars=2),
   'adx28':dict(B,maxPriorAdx=28.0),'rangeAdx17':dict(B,rangeAdxMax=17.0),
   'exh82':dict(B,exhaustRsi=82.0),'tp1_1.1':dict(B,rrTarget1=1.1),
   'floor0.5':dict(B,tp2FloorR=0.5),'ratchet2.4':dict(B,tp2RatchetR=2.4),
   'lead0.10':dict(B,earlyLeadAtr=0.10),'lead0.30':dict(B,earlyLeadAtr=0.30)}
print(f"{'variant':<12}{'trR':>6}{'trPF':>6} | {'teR':>6}{'tePF':>6}{'tePts':>8}")
for k,v in V.items():
    a=run(TR,v,years=TY,collect=True); b=run(TE,v,years=EY,collect=True)
    n1,r1,p1,_=st(a['log'],a['pts']); n2,r2,p2,x2=st(b['log'],b['pts'])
    mark='  <<' if (r1>0 and r2>0 and p1>1.31 and p2>1.40) else ''
    print(f"{k:<12}{r1:>6.0f}{p1:>6.2f} | {r2:>6.0f}{p2:>6.2f}{x2:>+8.0f}{mark}")
