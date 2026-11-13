// Tiny inline chart: line of values with the last point marked.
export default function Sparkline({ values, width = 120, height = 36, tone = 'var(--text-1)', band }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v !== undefined);
  if (pts.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const all = [...pts.map((p) => p.v), ...(band ? [band.min, band.max].filter(Number.isFinite) : [])];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo || 1) * 0.15;
  const x = (i) => 3 + (i / (values.length - 1)) * (width - 6);
  const y = (v) => height - 3 - ((v - lo + pad) / (hi - lo + 2 * pad)) * (height - 6);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts.at(-1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {band && Number.isFinite(band.min) && Number.isFinite(band.max) && (
        <rect x="0" width={width} y={y(band.max)} height={Math.max(0, y(band.min) - y(band.max))} fill="rgba(255,255,255,0.05)" rx="3" />
      )}
      <path d={d} fill="none" stroke={tone} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={x(last.i)} cy={y(last.v)} r="3" fill={tone} />
    </svg>
  );
}
