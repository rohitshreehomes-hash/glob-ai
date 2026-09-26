"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  CandlestickData,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramData,
  IChartApi,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import { fetcher } from "@/lib/client";
import { num } from "@/lib/format";
import type { Candle } from "@/lib/types";
import { Card, DataBadge, Spinner } from "./ui";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y"] as const;

interface HistResp {
  symbol: string;
  range: string;
  candles: Candle[];
  live: boolean;
}

export default function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1M");
  const { data, error, isLoading } = useSWR<HistResp>(
    `/api/stocks/history?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    fetcher
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data?.candles?.length) return;
    const el = containerRef.current;
    el.innerHTML = "";

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: range === "1D" || range === "1W" },
    });
    chartRef.current = chart;

    const candles: CandlestickData[] = data.candles.map((c) => ({
      time: c.t as Time,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    }));
    const volumes: HistogramData[] = data.candles.map((c) => ({
      time: c.t as Time,
      value: c.v,
      color: c.c >= c.o ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)",
    }));

    const series: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      borderVisible: false,
    });
    series.setData(candles);

    const vol = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" } });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(volumes);

    series.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.25 } });
    chart.timeScale().fitContent();

    // OHLC legend on crosshair
    const legend = legendRef.current;
    const renderLegend = (c?: Candle) => {
      if (!legend) return;
      const d = c ?? data.candles[data.candles.length - 1];
      const up = d.c >= d.o;
      legend.innerHTML =
        `<span class="text-slate-300">O <b class="${up ? "text-emerald-400" : "text-rose-400"}">${num(d.o)}</b></span> ` +
        `<span class="text-slate-300">H <b class="${up ? "text-emerald-400" : "text-rose-400"}">${num(d.h)}</b></span> ` +
        `<span className="text-slate-300">L <b class="${up ? "text-emerald-400" : "text-rose-400"}">${num(d.l)}</b></span> ` +
        `<span class="text-slate-300">C <b class="${up ? "text-emerald-400" : "text-rose-400"}">${num(d.c)}</b></span>`;
    };
    renderLegend();
    chart.subscribeCrosshairMove((param) => {
      const t = param.time as number | undefined;
      if (t === undefined) {
        renderLegend();
        return;
      }
      const found = data.candles.find((c) => c.t === t);
      if (found) renderLegend(found);
    });

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, range]);

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                range === r ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div ref={legendRef} className="tnum hidden gap-3 text-xs sm:flex" />
          {data && <DataBadge live={data.live} />}
        </div>
      </div>
      {isLoading && <Spinner label="Loading chart…" />}
      {error && <p className="py-10 text-center text-sm text-rose-300">Chart failed to load.</p>}
      {data && <div ref={containerRef} className="w-full" style={{ height: 380 }} />}
    </Card>
  );
}
