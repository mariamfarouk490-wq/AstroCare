import { CheckInSchema } from '../../domain/schemas/checkins.js';
import { toIsoDay } from '../../domain/utils/dates.js';
import { commit, newId } from './record.js';
import { ValidationError } from './addMeasurement.js';

/**
 * Save a check-in (replaces an earlier one for the same crew member and day).
 * @param input { crewId, sleepHours, mood, stress, symptoms, exerciseMin?, date? }
 * @returns {{ state, redFlags }} redFlags = the symptoms.json entries marked redFlag
 */
export function submitCheckIn(ctx, state, input) {
  const unknown = input.symptoms.filter((s) => !ctx.seed.symptoms.some((x) => x.code === s));
  if (unknown.length) throw new ValidationError(`Unknown symptom: ${unknown.join(', ')}`);
  const date = input.date ?? toIsoDay(ctx.clock.now());
  const parsed = CheckInSchema.safeParse({ id: newId(), source: 'manual', ...input, date });
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const checkIns = [...state.checkIns.filter((c) => !(c.crewId === input.crewId && c.date === date)), parsed.data];
  const redFlags = ctx.seed.symptoms.filter((s) => s.redFlag && input.symptoms.includes(s.code));
  return { state: commit(ctx, { ...state, checkIns }), redFlags };
}
