# Verification harness (survives sandbox resets)

Everything here is test-only; the indicator does not depend on it.

## 1. Compile gate (strongest local proxy for the TradingView compiler)

```bash
git clone --depth 1 https://github.com/pineforge-4pass/pineforge-codegen-oss.git /tmp/pf_codegen
git clone --depth 1 https://github.com/pineforge-4pass/pineforge-engine.git      /tmp/pf_engine
python3 -m venv /tmp/venv && /tmp/venv/bin/pip -q install -e /tmp/pf_codegen

mkdir -p /tmp/pf_ver/pineforge
printf '#pragma once\n#define PINEFORGE_VERSION "1.7.0"\n' > /tmp/pf_ver/pineforge/version.h

/tmp/venv/bin/python - <<'PY'
from pineforge_codegen import transpile_full
import collections
p = "indicators/SOT_SMC_Pro_Indicator.pine"
src = open(p, encoding="utf-8").read().split("\n")
for i, l in enumerate(src[:8]):
    if l.startswith("indicator("):
        src[i] = 'strategy("PF", overlay=true, max_labels_count=500, max_lines_count=500, max_boxes_count=500)'
r = transpile_full("\n".join(src), filename=p)
print(dict(collections.Counter(str(x.level) for x in r["diagnostics"])))
print("errors:", len([x for x in r["diagnostics"] if "ERROR" in str(x.level).upper()]))
open("/tmp/final.cpp", "w").write(r["cpp"])
PY

g++ -std=c++17 -fsyntax-only -I/tmp/pf_ver -I/tmp/pf_engine/include /tmp/final.cpp && echo "g++ rc 0"
```

`pineforge_codegen` rejects `indicator(...)`, hence the one-line shim to `strategy(...)` — the body is unchanged.

## 2. Execution gate (PineTS VM, runs the exact file)

```bash
cd /home/user/.pinets_rt && npm i pinets
node run_pinets.mjs /path/to/file.pine --synth                 # synthetic 900-bar smoke
node run_pinets.mjs /path/to/file.pine 2024-01-01 2024-12-31   # real NIFTY 5m (needs /tmp/nifty5.json)
```

Real NIFTY 5m source: `https://codeload.github.com/sourish-isi/Nifty50_5minutes_strategy/zip/refs/heads/main`
→ `Strategy 1/NIFTY_50_with_candle.csv` (204,167 rows, 2015-01-09 → 2026-01-22) → `/tmp/nifty5.json` as `[date,o,h,l,c]` tuples.

`--shim` replaces the `syminfo.*` metadata that a headless VM does not provide
(`mintick 0.05`, `ticker "NIFTY"`, `type "index"`, `currency "INR"`, …). Nothing else is touched,
so the executed logic is the shipped logic.

## 3. Expected results (regression baseline, default inputs)

| Config | 2024 | 2023 | 2022 | 2025 |
|---|---|---|---|---|
| `Early Trigger = Micro 5-Bar` (default) | 259 Tr · 47.9% · PF 1.47 · +2,727.1p | 265 Tr · 49.8% · PF 1.75 · +2,394.3p | 265 Tr · 44.2% · PF 1.32 · +1,619.5p | 259 Tr · 43.6% · PF 1.13 · +683.2p |

> **v9.3 baseline (current file, defaults `Partial=0 / Stall=OFF / rrTarget2=4.0 / SL=3.0x / maxPriorAdx=28`):**
> 2024 `216 Tr · 47.7% · PF 1.71 · +3,512.8p` · 2023 `240 · 51.3% · 1.93 · +2,942.2p` · 2022 `229 · 47.6% · 1.47 · +2,161.0p` · 2025 `226 · 47.3% · 1.28 · +1,367.8p` · 2017 `245 · 45.3% · 1.37 · +608.2p`
> Full 12-year (2015→Jan 2026): `2,643 Tr · 46.8% · PF 1.54 · +20,145.0p` gross; 12/12 years positive.
>
> **v9.2 baseline (current file, defaults `Partial=0 / Stall=OFF / rrTarget2=4.0 / SL=3.0x`):** 2024 `239 Tr · 46.9% · PF 1.59 · +3,497.6p` · 2023 `256 · 50.0% · 1.80 · +2,859.3p` · 2022 `252 · 45.6% · 1.38 · +1,948.4p` · 2025 `252 · 47.2% · 1.21 · +1,175.3p` (`999 Tr · 47.4% · PF 1.47 · +9,480.7p` total, vs v9.1 `1,048 Tr · 46.4% · 1.39 · +7,424.0p`).
> PineTS note: `pinets@0.13.0` no longer fires entries for this script (resolves `syminfo.*` to `undefined`); the known-good engine is **`pinets@0.9.34` with the `syminfo` shim**, which reproduces the v9.1 baseline exactly.

| `Early Trigger = Off (Pivot Break Only)` | 63 Tr · 54.0% · PF 1.67 · +1,199.7p | 22 Tr · 59.1% · PF 1.72 · +232.8p | 53 Tr · 45.3% · PF 1.36 · +506.4p | 47 Tr · 46.8% · PF 1.22 · +292.2p |

Any deviation from this table means the file was edited — do not ship without re-running both gates.

## 4. Byte hygiene (catches paste-mangling)

```bash
grep -c $'\t' indicators/SOT_SMC_Pro_Indicator.pine    # 0 tabs
grep -cP '[^\x00-\x7F]' indicators/SOT_SMC_Pro_Indicator.pine  # 0 non-ASCII
grep -c $'\r' indicators/SOT_SMC_Pro_Indicator.pine    # 0 CR
wc -l indicators/SOT_SMC_Pro_Indicator.pine            # 1518
sha256sum indicators/SOT_SMC_Pro_Indicator.pine
```
