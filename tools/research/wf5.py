import sys; sys.path.insert(0,'.')
from bt import load, run
BARS=load()
TR=[b for b in BARS if int(b['d'][:4])<=2021]; TE=[b for b in BARS if int(b['d'][:4])>=2022]
TY=set(range(2015,2022)); EY=set(range(2022,2027))
B=dict(costPts=2.0,useStallExit=False,idxPartialPct=0.0,rrTarget2=4.0,idxSl5mMult=3.0)
def st(log,pts):
    n=len(log); gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    return n,sum(t['r'] for t in log),(gp/gl if gl else 99),pts
V={'base32':dict(B),
   'adx26':dict(B,maxPriorAdx=26.0),'adx28':dict(B,maxPriorAdx=28.0),
   'adx30':dict(B,maxPriorAdx=30.0),'adx34':dict(B,maxPriorAdx=34.0),
   'adx28+exh82':dict(B,maxPriorAdx=28.0,exhaustRsi=82.0),
   'adx28+tp1_1.1':dict(B,maxPriorAdx=28.0,rrTarget1=1.1),
   'adx28+er0.22':dict(B,maxPriorAdx=28.0,minErRatio=0.22),
   'adx28+climax4.5':dict(B,maxPriorAdx=28.0,rrTarget2=4.5)}
print(f"{'variant':<16}{'trN':>5}{'trR':>6}{'trPF':>6} | {'teN':>5}{'teR':>6}{'tePF':>6}{'tePts':>8}")
for k,v in V.items():
    a=run(TR,v,years=TY,collect=True); b=run(TE,v,years=EY,collect=True)
    n1,r1,p1,_=st(a['log'],a['pts']); n2,r2,p2,x2=st(b['log'],b['pts'])
    print(f"{k:<16}{n1:>5}{r1:>6.0f}{p1:>6.2f} | {n2:>5}{r2:>6.0f}{p2:>6.2f}{x2:>+8.0f}")
