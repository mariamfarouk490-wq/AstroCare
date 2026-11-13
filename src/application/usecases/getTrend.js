import { metricTrend, checkInTrend } from '../../domain/analysis/health.js';
import { buildRecord } from './record.js';

/** Daily series of a metric (with generic band and personal baseline) or of a check-in field. */
export function getTrend(ctx, state, { crewId, metric, field, until }) {
  const record = buildRecord(ctx.seed, state);
  if (metric) return metricTrend(record, crewId, metric, until);
  return { field, points: checkInTrend(record, crewId, field, until) };
}
