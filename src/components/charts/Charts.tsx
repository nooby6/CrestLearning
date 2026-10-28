"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SERIES } from "./palette";
const INK = "#0A1D4F";
const MUTED = "#6B7799";
const GRID = "#E7EAF2";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number, steps = 4) {
  if (v <= 0) return steps;
  const raw = v / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Math.max(steps, Math.ceil(step) * steps);
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left, top: y - 8 }}
      role="status"
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-500">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

const PAD = { top: 12, right: 8, bottom: 28, left: 32 };

/* ------------------------------------------------------------------ stacked columns */

export function StackedColumns({
  data,
  series,
  height = 220,
  unit = "lessons",
}: {
  data: { label: string; values: number[] }[];
  series: string[];
  height?: number;
  unit?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.values.reduce((a, b) => a + b, 0))));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.min(36, band * 0.56);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Weekly ${unit}: ${series.join(" and ")}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + band * i + band / 2;
            let acc = 0;
            const total = d.values.reduce((a, b) => a + b, 0);
            return (
              <g key={d.label} opacity={hover === null || hover === i ? 1 : 0.45}>
                {d.values.map((v, s) => {
                  if (!v) return null;
                  const top = y(acc + v);
                  const bottom = y(acc);
                  acc += v;
                  const isTop = acc === total;
                  const h = Math.max(0, bottom - top - (s > 0 ? 2 : 0)); // 2px surface gap between segments
                  const r = isTop ? Math.min(4, h, barW / 2) : 0;
                  const x0 = cx - barW / 2;
                  const yTop = top;
                  return (
                    <path
                      key={s}
                      fill={SERIES[s]}
                      d={`M${x0},${yTop + h} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${yTop + h} Z`}
                    />
                  );
                })}
                {(band >= 46 || ((data.length - 1 - i) % 2 === 0 && (i === data.length - 1 || data.length - 1 - i >= 4))) && <text x={i === data.length - 1 ? Math.min(cx, width - PAD.right - 2) : cx} y={height - 8} textAnchor={i === data.length - 1 && cx + 30 > width - PAD.right ? "end" : "middle"} fontSize={11} fill={i === data.length - 1 ? INK : MUTED} fontWeight={i === data.length - 1 ? 600 : 400}>
                  {d.label}
                </text>}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="#C9CFDF" strokeWidth={1} />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={PAD.left + band * hover + band / 2} y={y(data[hover].values.reduce((a, b) => a + b, 0))} width={width}>
          <p className="mb-1 font-semibold text-navy-900">{data[hover].label}</p>
          {series.map((s, i) => (
            <p key={s} className="flex items-center gap-2 text-navy-600">
              <span className="h-2 w-2 rounded-sm" style={{ background: SERIES[i] }} />
              {s}
              <span className="ml-auto pl-4 font-semibold tabular-nums text-navy-900">{data[hover].values[i]}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ line (percent) */

export function PercentLine({ data, height = 220, label }: { data: { label: string; value: number | null }[]; height?: number; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const left = PAD.left + 10;
  const plotW = Math.max(0, width - left - PAD.right - 12);
  const plotH = height - PAD.top - PAD.bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const x = (i: number) => left + 8 + step * i;
  const every = Math.max(1, Math.ceil(46 / (step || 46)));
  const showLabel = (i: number) => i === data.length - 1 || ((data.length - 1 - i) % every === 0 && data.length - 1 - i >= (every > 1 ? 2 * every : 1));
  const y = (v: number) => PAD.top + plotH - (v / 100) * plotH;

  // Break the line where a week has no records.
  const segments: { i: number; v: number }[][] = [];
  data.forEach((d, i) => {
    if (d.value === null) return;
    const prev = segments.at(-1);
    if (prev && prev.at(-1)!.i === i - 1) prev.push({ i, v: d.value });
    else segments.push([{ i, v: d.value }]);
  });
  const lastIdx = [...data.keys()].reverse().find((i) => data[i].value !== null);

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round((e.clientX - r.left - left - 8) / (step || 1));
            setHover(Math.max(0, Math.min(data.length - 1, i)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                {t}%
              </text>
            </g>
          ))}
          {data.map((d, i) => showLabel(i) && (
            <text key={d.label} x={i === data.length - 1 ? x(i) + 8 : x(i)} y={height - 8} textAnchor={i === data.length - 1 ? "end" : "middle"} fontSize={11} fill={i === data.length - 1 ? INK : MUTED} fontWeight={i === data.length - 1 ? 600 : 400}>
              {d.label}
            </text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="#C9CFDF" strokeDasharray="3 3" />}
          {segments.map((seg, k) => (
            <path
              key={k}
              d={seg.map((p, j) => `${j ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ")}
              fill="none"
              stroke={SERIES[0]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {segments.flat().map((p) => (
            <circle
              key={p.i}
              cx={x(p.i)}
              cy={y(p.v)}
              r={hover === p.i || p.i === lastIdx ? 4.5 : 3}
              fill={SERIES[0]}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
          {lastIdx !== undefined && hover === null && (
            <text x={x(lastIdx)} y={y(data[lastIdx].value!) - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK}>
              {data[lastIdx].value}%
            </text>
          )}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip x={x(hover)} y={data[hover].value === null ? y(50) : y(data[hover].value!)} width={width}>
          <p className="font-semibold text-navy-900">{data[hover].label}</p>
          <p className="text-navy-600">
            {data[hover].value === null ? "No lessons recorded" : <>Present or late: <b className="tabular-nums text-navy-900">{data[hover].value}%</b></>}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ horizontal bars */

export function HBars({ data }: { data: { label: string; value: number; display: string; max?: number; href?: string; flag?: boolean }[] }) {
  const scale = Math.max(1, ...data.map((d) => d.max ?? d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const track = d.max !== undefined;
        const pct = (d.value / (track ? d.max || 1 : scale)) * 100;
        const over = d.flag ?? (track && d.value > (d.max ?? 0));
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate text-navy-800">{d.label}</span>
              <span className="shrink-0 tabular-nums font-semibold text-navy-900">{d.display}</span>
            </div>
            <div className={track ? "h-2 overflow-hidden rounded-full bg-navy-50" : "h-2"}>
              <div
                className="h-2 rounded-full transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(pct, d.value ? 2 : 0))}%`, background: over ? SERIES[1] : SERIES[0] }}
              />
            </div>
          </>
        );
        return (
          <li key={d.label}>
            {d.href ? (
              <Link href={d.href} className="block rounded-md transition hover:opacity-80">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
