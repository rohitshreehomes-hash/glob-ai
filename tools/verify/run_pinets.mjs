// PineTS harness: runs a .pine file (optionally with real NIFTY 5m data) and prints the HUD.
// usage: node run_pinets.mjs <file.pine> [from] [to] [--shim] [--synth]
import { PineTS } from 'pinets';
import fs from 'fs';

const file = process.argv[2];
const from = process.argv[3] || '';
const to   = process.argv[4] || '';
const shim = process.argv.includes('--shim');
const synth = process.argv.includes('--synth') || !from;

function synthFeed() {
  const kinds = ['trend_up','range','breakout_up','trend_down','range','chop','trend_up','range','breakout_down','trend_up','range','chop'];
  let s = 20261024 >>> 0;
  const rnd = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
  const candles = []; let px = 24050, dayMs = Date.UTC(2026, 8, 1, 3, 45);
  for (const k of kinds) {
    const o0 = px, trend = k === 'trend_up' ? 2.4 : k === 'trend_down' ? -2.2 : 0;
    const amp = k === 'range' ? 48 : k === 'chop' ? 26 : 16; let sp = o0;
    for (let b = 0; b < 75; b++) {
      let d = trend;
      if (k === 'breakout_up' && b >= 34) d = 3.1;
      if (k === 'breakout_down' && b >= 34) d = -3.0;
      if (k === 'range') d = (o0 + Math.sin(b / 6) * amp - sp) * 0.22;
      if (k === 'chop') d = (o0 + Math.sin(b / 3) * amp - sp) * 0.30;
      const noise = (rnd() - 0.5) * (k === 'range' ? 8 : 13);
      const o = sp + (rnd() - 0.5) * 2, c = o + d + noise;
      const wick = 3 + rnd() * (k === 'range' ? 5 : 11);
      candles.push({ open: o, high: Math.max(o, c) + wick, low: Math.min(o, c) - wick, close: c,
        volume: Math.round(70000 + rnd() * 90000 + (b > 34 && k.startsWith('breakout') ? 120000 : 0) + (Math.abs(c - o) > 14 ? 60000 : 0)),
        openTime: dayMs + b * 300000 });
      sp = c;
    }
    px = sp; dayMs += 86400000;
    const wd = new Date(dayMs).getUTCDay();
    if (wd === 6) dayMs += 2 * 86400000; if (wd === 0) dayMs += 86400000;
  }
  return candles;
}

function realFeed() {
  const rows = JSON.parse(fs.readFileSync('/tmp/nifty5.json', 'utf8'));
  const out = [];
  for (const [ds, o, h, l, c] of rows) {
    const day = ds.slice(0, 10);
    if (day < from || day > to) continue;
    const [Y, M, D] = day.split('-').map(Number);
    const [hh, mm] = ds.slice(11, 16).split(':').map(Number);
    out.push({ open: o, high: h, low: l, close: c,
      volume: Math.max(1000, Math.round(100000 * (Math.max(h - l, 0.05) / 25))),
      openTime: Date.UTC(Y, M - 1, D, hh, mm) - 5.5 * 3600 * 1000 });
  }
  return out;
}

let src = fs.readFileSync(file, 'utf8');
if (shim) {
  const map = { 'syminfo.mintick': '0.05', 'syminfo.tickerid': '"NSE:NIFTY"', 'syminfo.ticker': '"NIFTY"',
    'syminfo.description': '"NIFTY 50"', 'syminfo.prefix': '"NSE"', 'syminfo.type': '"index"', 'syminfo.currency': '"INR"' };
  for (const k of Object.keys(map)) src = src.split(k).join(map[k]);
}
const candles = synth ? synthFeed() : realFeed();
let out;
try { out = await new PineTS(candles, 'NSE:NIFTY', '5').run(src); }
catch (e) { console.log('RUNTIME_ERROR:', e && e.message); process.exit(2); }
const keys = Object.keys(out.plots || {});
console.log(`OK | ${file.split('/').pop()} | bars ${candles.length} | streams ${keys.length}`);
const tbl = out.plots.__tables__ && out.plots.__tables__.data;
const last = tbl && tbl.length ? tbl[tbl.length - 1].value : [];
for (const t of last || []) { if (t._deleted) continue;
  (t.cells || []).forEach((r, i) => { const x = r.map(c => (c && c.text) || '').join(' : ');
    if (/Verified Audit|Early Trigger|Market Mode|Apex Readiness/.test(x)) console.log('  r' + i, x); }); }
