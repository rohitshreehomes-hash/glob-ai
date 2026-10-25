import sys
sys.path.insert(0,'/home/user/glob-ai/tools/research')
from bt import load, run
BARS=load(); YEARS=set(range(2015,2027))

def st(log,pts):
    n=len(log)
    gp=sum(t['pts'] for t in log if t['pts']>0); gl=-sum(t['pts'] for t in log if t['pts']<=0)
    eq=pk=dd=0.0
    for t in log:
        eq+=t['pts']; pk=max(pk,eq); dd=min(dd,eq-pk)
    per={}
    for y in range(2015,2027): per[y]=round(sum(t['pts'] for t in log if int(t['day'][:4])==y))
    return n,(100*sum(1 for t in log if t['pts']>0)/n if n else 0),(gp/gl if gl else 99),pts,dd,per

B=dict(costPts=2.0,useStallExit=False,idxPartialPct=0.0)
V={'B_base':dict(B),
   'B_sl2.7':dict(B,idxSl5mMult=2.7),'B_sl3.0':dict(B,idxSl5mMult=3.0),
   'B_trail2.6':dict(B,idxTrail15mMult=2.6),'B_trail3.0':dict(B,idxTrail15mMult=3.0),
   'B_rrT1_2.0':dict(B,rrTarget1=2.0),'B_rrT2_4.0':dict(B,rrTarget2=4.0),
   'B_ratchet2.8':dict(B,tp2RatchetR=2.8),'B_floor0.5':dict(B,tp2FloorR=0.5),
   'B_er.30':dict(B,minErRatio=0.30),
   'B_sl2.7_trail2.6':dict(B,idxSl5mMult=2.7,idxTrail15mMult=2.6),
   'B_sl2.7_trail3.0_rrT2_4':dict(B,idxSl5mMult=2.7,idxTrail15mMult=3.0,rrTarget2=4.0),
}
print(f"{'variant':>24}{'n':>6}{'wr':>6}{'pf':>6}{'pts':>9}{'maxDD':>8}   per-year 15..26")
for k,p in V.items():
    r=run(BARS,p,years=YEARS,collect=True); n,wr,pf,pts,dd,per=st(r['log'],r['pts'])
    print(f"{k:>24}{n:>6}{wr:>6.1f}{pf:>6.2f}{pts:>+9.0f}{dd:>8.0f}   "+' '.join(f"{per[y]:+5d}" for y in range(2015,2027)))
print("\nCOST SENSITIVITY on B (points per round-trip side*2):")
for c in (0,1,2,4,6,8):
    r=run(BARS,dict(B,costPts=float(c)),years=YEARS,collect=True); n,wr,pf,pts,dd,per=st(r['log'],r['pts'])
    print(f"  cost {c}p: {n} tr  PF {pf:.2f}  {pts:+.0f}p  avg {pts/n:+.2f}p  DD {dd:.0f}")
