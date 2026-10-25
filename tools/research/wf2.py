import sys; sys.path.insert(0,'.')
from bt import load, run
BARS=load()
TR=[b for b in BARS if int(b['d'][:4])<=2021]; TE=[b for b in BARS if int(b['d'][:4])>=2022]
TY=set(range(2015,2022)); EY=set(range(2022,2027))
B=dict(costPts=2.0,useStallExit=False,idxPartialPct=0.0,rrTarget2=4.0,idxSl5mMult=3.0)
def st(log,pts):
    n=len(log)
    gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    return n,sum(t['r'] for t in log),(gp/gl if gl else 99),pts
V={
 'base_v9.2'        :dict(B),
 'skip12-14'        :dict(B,skipMidStart=720,skipMidEnd=840),
 'skip12:30-14'     :dict(B,skipMidStart=750,skipMidEnd=840),
 'skip12-13:30'     :dict(B,skipMidStart=720,skipMidEnd=810),
 'skip11:30-13:30'  :dict(B,skipMidStart=690,skipMidEnd=810),
 'lastEntry14:00'   :dict(B,lastEntryMins=840),
 'skip12-14+last14' :dict(B,skipMidStart=720,skipMidEnd=840,lastEntryMins=840),
 'cap1'             :dict(B,maxTradesPerDay=1),
}
print(f"{'variant':<18}{'trN':>6}{'trR':>7}{'trPF':>6} | {'teN':>5}{'teR':>7}{'tePF':>6}{'tePts':>8}")
for k,v in V.items():
    a=run(TR,v,years=TY,collect=True); b=run(TE,v,years=EY,collect=True)
    n1,r1,p1,_=st(a['log'],a['pts']); n2,r2,p2,x2=st(b['log'],b['pts'])
    print(f"{k:<18}{n1:>6}{r1:>7.0f}{p1:>6.2f} | {n2:>5}{r2:>7.0f}{p2:>6.2f}{x2:>+8.0f}")
