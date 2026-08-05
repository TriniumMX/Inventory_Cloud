import { useState } from "react";
import type { PatrimonioMensual } from "@/lib/api";

interface CandlestickChartProps {
  data: PatrimonioMensual[];
  height?: number;
}

const UP_COLOR = "#059669"; // emerald-600 — coincide con el uso de "Activo/bien" en el resto de la app
const DOWN_COLOR = "#dc2626"; // red-600 — coincide con el uso de "Baja" en el resto de la app
const FLAT_COLOR = "#cbd5e1"; // slate-300

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

const formatCompact = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
  return `$${Math.round(v)}`;
};

export function CandlestickChart({ data, height = 260 }: CandlestickChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const withData = data.filter((d) => d.altas > 0);
  if (withData.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-sm text-slate-400 font-medium rounded-xl bg-slate-50/60 border border-dashed border-slate-200"
        style={{ height }}
      >
        <span className="text-2xl">📉</span>
        Sin altas registradas en el período
      </div>
    );
  }

  const allHigh = Math.max(...data.map((d) => (d.altas > 0 ? d.high : -Infinity)));
  const allLow = Math.min(...data.map((d) => (d.altas > 0 ? d.low : Infinity)));
  const pad = (allHigh - allLow) * 0.15 || allHigh * 0.1 || 1;
  const maxV = allHigh + pad;
  const minV = Math.max(0, allLow - pad);
  const range = maxV - minV || 1;

  const width = 640;
  const marginLeft = 60;
  const marginRight = 16;
  const marginTop = 16;
  const marginBottom = 30;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const slotW = plotW / data.length;
  const candleW = Math.min(30, slotW * 0.46);

  const y = (v: number) => marginTop + plotH - ((v - minV) / range) * plotH;
  const cxFor = (i: number) => marginLeft + slotW * i + slotW / 2;

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => minV + (range * i) / gridLines);

  // Línea de tendencia conectando los cierres (solo meses con datos)
  const closePoints = data
    .map((d, i) => (d.altas > 0 ? `${cxFor(i)},${y(d.close)}` : null))
    .filter(Boolean)
    .join(" L ");

  const activeDatum = hovered !== null ? data[hovered] : null;
  const activeDelta =
    activeDatum && activeDatum.open > 0 ? ((activeDatum.close - activeDatum.open) / activeDatum.open) * 100 : 0;

  return (
    <div className="relative">
      {/* Leyenda alza/baja */}
      <div className="flex items-center justify-end gap-4 mb-2 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: UP_COLOR }} />
          <span className="text-[10.5px] font-bold text-slate-500">Cierre ≥ apertura</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: DOWN_COLOR }} />
          <span className="text-[10.5px] font-bold text-slate-500">Cierre &lt; apertura</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
        role="img"
        aria-label="Valor de altas mensuales, gráfica tipo velas"
      >
        <defs>
          <linearGradient id="candle-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Bandas de fondo alternadas para lectura horizontal */}
        {gridValues.slice(0, -1).map((v, i) =>
          i % 2 === 1 ? (
            <rect
              key={`band-${i}`}
              x={marginLeft}
              y={y(gridValues[i + 1])}
              width={plotW}
              height={y(v) - y(gridValues[i + 1])}
              fill="#f8fafc"
            />
          ) : null
        )}

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
              strokeDasharray={i === 0 ? undefined : "3 3"}
            />
            <text x={marginLeft - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#94a3b8" fontWeight={700}>
              {formatCompact(v)}
            </text>
          </g>
        ))}

        {/* Área + línea de tendencia de cierres */}
        {closePoints && (
          <>
            <path d={`M ${closePoints} L ${cxFor(data.length - 1)},${y(minV)} L ${cxFor(0)},${y(minV)} Z`} fill="url(#candle-trend-fill)" />
            <path d={`M ${closePoints}`} fill="none" stroke="#2563eb" strokeWidth={1.25} strokeOpacity={0.35} strokeDasharray="4 3" />
          </>
        )}

        {/* Crosshair vertical al pasar el mouse */}
        {hovered !== null && (
          <line
            x1={cxFor(hovered)}
            x2={cxFor(hovered)}
            y1={marginTop}
            y2={marginTop + plotH}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* Baseline */}
        <line x1={marginLeft} x2={width - marginRight} y1={marginTop + plotH} y2={marginTop + plotH} stroke="#c3c2b7" strokeWidth={1} />

        {/* Candles */}
        {data.map((d, i) => {
          const cx = cxFor(i);
          const hasData = d.altas > 0;
          const color = !hasData ? FLAT_COLOR : d.close >= d.open ? UP_COLOR : DOWN_COLOR;
          const isFlatSingle = hasData && d.open === d.close;
          const bodyTop = hasData ? y(Math.max(d.open, d.close)) : y(minV);
          const bodyBottom = hasData ? y(Math.min(d.open, d.close)) : y(minV);
          const bodyH = Math.max(3, bodyBottom - bodyTop);
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

              {isHovered && hasData && (
                <rect
                  x={cx - slotW / 2 + 1}
                  y={marginTop}
                  width={slotW - 2}
                  height={plotH}
                  fill="#2563eb"
                  opacity={0.05}
                  rx={4}
                />
              )}

              {hasData && (
                <>
                  {/* Wick */}
                  <line
                    x1={cx}
                    x2={cx}
                    y1={y(d.high)}
                    y2={y(d.low)}
                    stroke={color}
                    strokeWidth={isHovered ? 2.5 : 2}
                    strokeLinecap="round"
                    opacity={isHovered ? 1 : 0.85}
                  />
                  {/* Body (o marcador tipo "doji" si solo hubo 1 alta con el mismo costo) */}
                  {isFlatSingle ? (
                    <rect
                      x={cx - candleW / 2}
                      y={bodyTop - 1.5}
                      width={candleW}
                      height={3}
                      rx={1.5}
                      fill={color}
                      opacity={isHovered ? 1 : 0.9}
                    />
                  ) : (
                    <rect
                      x={cx - candleW / 2}
                      y={bodyTop}
                      width={candleW}
                      height={bodyH}
                      rx={2.5}
                      fill={color}
                      opacity={isHovered ? 1 : 0.9}
                      stroke={isHovered ? color : "none"}
                      strokeWidth={isHovered ? 1 : 0}
                    />
                  )}
                </>
              )}

              {/* X label */}
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={isHovered ? 800 : 600}
                fill={isHovered ? "#0f172a" : "#94a3b8"}
                className="capitalize"
              >
                {d.mes}
              </text>
            </g>
          );
        })}
      </svg>

      {activeDatum && activeDatum.altas > 0 && (
        <div
          className="absolute top-1 right-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl px-4 py-3 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: 190 }}
        >
          <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-100">
            <p className="font-black text-slate-800 capitalize text-[13px]">{activeDatum.mes}</p>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                activeDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {activeDelta >= 0 ? "▲" : "▼"} {Math.abs(activeDelta).toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-500 font-semibold">
            <span>Apertura</span>
            <span className="text-slate-800 text-right font-bold">{formatCurrency(activeDatum.open)}</span>
            <span>Cierre</span>
            <span className="text-slate-800 text-right font-bold">{formatCurrency(activeDatum.close)}</span>
            <span>Máximo</span>
            <span className="text-emerald-600 text-right font-bold">{formatCurrency(activeDatum.high)}</span>
            <span>Mínimo</span>
            <span className="text-red-600 text-right font-bold">{formatCurrency(activeDatum.low)}</span>
            <span className="pt-1 border-t border-slate-100">Altas</span>
            <span className="text-slate-800 text-right font-bold pt-1 border-t border-slate-100">{activeDatum.altas}</span>
          </div>
        </div>
      )}
    </div>
  );
}
