import { MeasurementSchema } from '../../domain/schemas/measurements.js';
import { commit, newId } from './record.js';

export class ValidationError extends Error {}

/** Check every reading against metrics.json validMin/validMax. Throws ValidationError. */
export function validateReadings(seed, readings) {
  for (const r of readings) {
    const metric = seed.metrics.find((m) => m.code === r.metric);
    if (!metric) throw new ValidationError(`Unknown metric ${r.metric}`);
    if (!Number.isFinite(r.value) || r.value < metric.validMin || r.value > metric.validMax)
      throw new ValidationError(`${metric.label}: enter a value from ${metric.validMin} to ${metric.validMax} ${metric.unit}`);
  }
}

/**
 * Save a measurement for a crew member.
 * @param input { crewId, readings: [{metric, value}], source, glucoseContext?, ocr?, note?, takenAt? }
 */
export function addMeasurement(ctx, state, input) {
  validateReadings(ctx.seed, input.readings);
  const parsed = MeasurementSchema.safeParse({
    id: newId(),
    ...input,
    takenAt: input.takenAt ?? ctx.clock.now().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
  if (!parsed.success) throw new ValidationError(parsed.error.issues.map((i) => i.message).join('; '));
  return commit(ctx, { ...state, measurements: [...state.measurements, parsed.data] });
}
