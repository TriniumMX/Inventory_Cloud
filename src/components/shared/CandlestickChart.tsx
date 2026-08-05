import { useState } from "react";
import type { PatrimonioMensual } from "@/lib/api";

interface CandlestickChartProps {
  data: PatrimonioMensual[];
  height?: number;
}

const UP_COLOR = "#059669"; // emerald-600 — coincide con el uso de "Activo/bien" en el resto de la app
const DOWN_COLOR = "#dc2626"; // red-600 — coincide con el uso de "Baja" en el resto de la app
const FLAT_COLOR = "#94a3b8"; // slate-400

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function CandlestickChart({ data, height = 220 }: CandlestickChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const withData = data.filter((d) => d.altas > 0);
  if (withData.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400 font-medium" style={{ height }}>
        Sin altas registradas en el período
      </div>
    );
  }

  const allHigh = Math.max(...data.map((d) => (d.altas > 0 ? d.high : -Infinity)));
  const allLow = Math.min(...data.map((d) => (d.altas > 0 ? d.low : Infinity)));
  const pad = (allHigh - allLow) * 0.12 || allHigh * 0.1 || 1;
  const maxV = allHigh + pad;
  const minV = Math.max(0, allLow - pad);
  const range = maxV - minV || 1;

  const width = 640;
  const marginLeft = 68;
  const marginRight = 12;
  const marginTop = 12;
  const marginBottom = 28;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const slotW = plotW / data.length;
  const candleW = Math.min(28, slotW * 0.5);

  const y = (v: number) => marginTop + plotH - ((v - minV) / range) * plotH;

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => minV + (range * i) / gridLines);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Valor de altas mensuales, gráfica tipo velas">
        {/* Gridlines */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={marginLeft}
              x2={width - marginRight}
              y1={y(v)}
              y2={y(v)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={marginLeft - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#94a3b8" fontWeight={600}>
              {v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line x1={marginLeft} x2={width - marginRight} y1={marginTop + plotH} y2={marginTop + plotH} stroke="#c3c2b7" strokeWidth={1} />

        {/* Candles */}
        {data.map((d, i) => {
          const cx = marginLeft + slotW * i + slotW / 2;
          const hasData = d.altas > 0;
          const color = !hasData ? FLAT_COLOR : d.close >= d.open ? UP_COLOR : DOWN_COLOR;
          const bodyTop = hasData ? y(Math.max(d.open, d.close)) : y(minV);
          const bodyBottom = hasData ? y(Math.min(d.open, d.close)) : y(minV);
          const bodyH = Math.max(2, bodyBottom - bodyTop);
          const isHovered = hovered === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              style={{ cursor: hasData ? "pointer" : "default" }}
            >
              {/* Hit area (wider than the candle, easier to hover) */}
              <rect x={cx - slotW / 2} y={marginTop} width={slotW} height={plotH} fill="transparent" />

              {hasData && (
                <>
                  {/* Wick */}
                  <line
                    x1={cx}
                    x2={cx}
                    y1={y(d.high)}
                    y2={y(d.low)}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={isHovered ? 1 : 0.85}
                  />
                  {/* Body */}
                  <rect
                    x={cx - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyH}
                    rx={2}
                    fill={color}
                    opacity={isHovered ? 1 : 0.9}
                  />
                </>
              )}

              {/* X label */}
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fontSize={10}
                fontWeight={isHovered ? 800 : 600}
                fill={isHovered ? "#0b0b0b" : "#94a3b8"}
                className="capitalize"
              >
                {d.mes}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && data[hovered].altas > 0 && (
        <div
          className="absolute top-1 right-1 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs pointer-events-none"
          style={{ minWidth: 150 }}
        >
          <p className="font-black text-slate-800 capitalize mb-1">{data[hovered].mes}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-500 font-semibold">
            <span>Apertura</span>
            <span className="text-slate-800 text-right">{formatCurrency(data[hovered].open)}</span>
            <span>Cierre</span>
            <span className="text-slate-800 text-right">{formatCurrency(data[hovered].close)}</span>
            <span>Máximo</span>
            <span className="text-slate-800 text-right">{formatCurrency(data[hovered].high)}</span>
            <span>Mínimo</span>
            <span className="text-slate-800 text-right">{formatCurrency(data[hovered].low)}</span>
            <span>Altas</span>
            <span className="text-slate-800 text-right">{data[hovered].altas}</span>
          </div>
        </div>
      )}
    </div>
  );
}
