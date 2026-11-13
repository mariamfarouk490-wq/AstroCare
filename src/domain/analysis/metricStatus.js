// Classify a reading against the generic bands in metrics.json.

const RANK = { NoData: 0, Normal: 1, Watch: 2, Critical: 3 };

/** The worst of several statuses (Critical > Watch > Normal > NoData). */
export const worstStatus = (statuses) =>
  statuses.reduce((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'NoData');

/** Bands that apply to a reading (glucose bands depend on context; default Random). */
export function bandsFor(metric, glucoseContext) {
  const hasContext = metric.bands.some((b) => b.context);
  if (!hasContext) return metric.bands;
  const context = glucoseContext ?? 'Random';
  return metric.bands.filter((b) => b.context === context);
}

/** The band a value falls in. Values between two integer bands go to the nearest band. */
export function bandOf(metric, value, glucoseContext) {
  const bands = bandsFor(metric, glucoseContext);
  const inside = bands.find((b) => (b.min === undefined || value >= b.min) && (b.max === undefined || value <= b.max));
  if (inside) return inside;
  const distance = (b) => Math.min(b.min !== undefined ? Math.abs(value - b.min) : Infinity, b.max !== undefined ? Math.abs(value - b.max) : Infinity);
  return [...bands].sort((a, b) => distance(a) - distance(b))[0];
}

export const statusOf = (metric, value, glucoseContext) => bandOf(metric, value, glucoseContext)?.status ?? 'NoData';

/** The generic Normal range for a metric, e.g. { min: 60, max: 100, source: 'AHA' }. */
export function normalRange(metric, glucoseContext) {
  const normal = bandsFor(metric, glucoseContext).filter((b) => b.status === 'Normal');
  if (!normal.length) return null;
  return {
    min: Math.min(...normal.map((b) => b.min ?? -Infinity)),
    max: Math.max(...normal.map((b) => b.max ?? Infinity)),
    source: normal.map((b) => b.source).join(', '),
  };
}
