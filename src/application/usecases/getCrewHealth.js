import { healthSnapshot } from '../../domain/analysis/health.js';
import { buildRecord } from './record.js';

/**
 * Health of one crew member on one day: metrics vs bands and baseline, open alerts
 * (with acknowledgement state), body-part statuses, check-in, cabin air, derived values.
 */
export function getCrewHealth(ctx, state, { crewId, day }) {
  const snapshot = healthSnapshot(buildRecord(ctx.seed, state), crewId, day);
  const ack = (code) => state.alertStates[`${crewId}:${code}`];
  const alerts = snapshot.alerts.map((a) => ({ ...a, acknowledgedAt: ack(a.code)?.at }));
  return {
    ...snapshot,
    crew: ctx.seed.crew.find((c) => c.id === crewId),
    alerts,
    parts: snapshot.parts.map((p) => ({ ...p, alerts: alerts.filter((a) => a.bodyPart === p.part.id) })),
  };
}
