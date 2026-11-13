// Hand-drawn SVG trend chart: generic Normal band, personal baseline band (mean ± SD),
// daily values coloured by status, and optional reference lines (rule thresholds, NASA targets).
import { useEffect, useRef, useState } from 'react';

const STATUS_FILL = { Normal: '#30d158', Watch: 'transparent', Critical: '#ff453a', NoData: '#6e6e73' };
const STATUS_STROKE = { Normal: '#30d158', Watch: '#ff453a', Critical: '#ff453a', NoData: '#6e6e73' };

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * points: [{ day, value, status?, baseline?: { mean, low, high } }]
 * range:  { min, max } generic Normal band (optional)
 * lines:  [{ value, label }] reference lines
 */
export default function TrendChart({ points, range, lines = [], unit, format = (v) => v, height = 320, labels }) {
  const [ref, width] = useWidth();
  const pad = { top: 24, right: 56, bottom: 36, left: 16 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const values = points.map((p) => p.value).filter((v) => v !== undefined);
  const base = points.flatMap((p) => (p.baseline ? [p.baseline.low, p.baseline.high] : []));
  const bandVals = range ? [range.min, range.max].filter(Number.isFinite) : [];
  const all = [...values, ...base, ...bandVals, ...lines.map((l) => l.value)];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  const span = hi - lo || 1;
  lo -= span * 0.12;
  hi += span * 0.12;

  const x = (i) => pad.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v) => pad.top + h - ((v - lo) / (hi - lo)) * h;
  const clampY = (v) => Math.max(pad.top, Math.min(pad.top + h, y(v)));

  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const linePath = points
    .map((p, i) => (p.value === undefined ? null : [x(i), y(p.value)]))
    .filter(Boolean)
    .map(([px, py], k) => `${k ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ');

  const withBase = points.map((p, i) => ({ ...p, i })).filter((p) => p.baseline);
  const basePath = withBase.length
    ? `M${withBase.map((p) => `${x(p.i).toFixed(1)},${y(p.baseline.high).toFixed(1)}`).join(' L')} L${[...withBase]
        .reverse()
        .map((p) => `${x(p.i).toFixed(1)},${y(p.baseline.low).toFixed(1)}`)
        .join(' L')} Z`
    : null;
  const meanPath = withBase.length ? `M${withBase.map((p) => `${x(p.i).toFixed(1)},${y(p.baseline.mean).toFixed(1)}`).join(' L')}` : null;

  return (
    <div ref={ref} className="trend-chart">
      <svg width={width} height={height} role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="trend-line" x1="0" x2="1">
            <stop offset="0" stopColor="#a1a1a6" />
            <stop offset="1" stopColor="#f5f5f7" />
          </linearGradient>
          <pattern id="baseline-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          </pattern>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left + w + 10} y={y(t) + 4} className="trend-chart__tick">
              {format(t)}
            </text>
          </g>
        ))}

        {range && (Number.isFinite(range.min) || Number.isFinite(range.max)) && (
          <g>
            <rect
              x={pad.left}
              width={w}
              y={clampY(Number.isFinite(range.max) ? range.max : hi)}
              height={Math.max(0, clampY(Number.isFinite(range.min) ? range.min : lo) - clampY(Number.isFinite(range.max) ? range.max : hi))}
              fill="rgba(48,209,88,0.07)"
              rx="6"
            />
            <text x={pad.left + 8} y={clampY(Number.isFinite(range.max) ? range.max : hi) + 16} className="trend-chart__band-label">
              {labels?.band ?? 'Generic normal range'}
            </text>
          </g>
        )}

        {basePath && (
          <g>
            <path d={basePath} fill="url(#baseline-hatch)" stroke="rgba(255,255,255,0.22)" strokeDasharray="3 4" />
            <path d={meanPath} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="2 4" />
          </g>
        )}

        {lines.map((l) => (
          <g key={l.label}>
            <line x1={pad.left} x2={pad.left + w} y1={y(l.value)} y2={y(l.value)} stroke="#ff453a" strokeOpacity="0.6" strokeDasharray="5 5" />
            <text x={pad.left + w - 6} y={y(l.value) - 8} textAnchor="end" className="trend-chart__line-label">
              {l.label}
            </text>
          </g>
        ))}

        {linePath && <path className="trend-chart__line" pathLength="1" d={linePath} fill="none" stroke="url(#trend-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

        {points.map((p, i) =>
          p.value === undefined ? null : (
            <g key={p.day} className="trend-chart__point" style={{ animationDelay: `${300 + i * 60}ms` }}>
              <circle cx={x(i)} cy={y(p.value)} r="5" fill={STATUS_FILL[p.status ?? 'NoData'] === 'transparent' ? '#000' : STATUS_FILL[p.status ?? 'NoData']} stroke={STATUS_STROKE[p.status ?? 'NoData']} strokeWidth="2" />
              <title>{`${p.day}: ${format(p.value)} ${unit ?? ''}`}</title>
            </g>
          ),
        )}

        {points.map((p, i) => (
          <text key={p.day} x={x(i)} y={height - 12} textAnchor="middle" className="trend-chart__x">
            {i + 1}
          </text>
        ))}
      </svg>
    </div>
  );
}
