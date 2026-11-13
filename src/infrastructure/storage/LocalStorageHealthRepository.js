import { MeasurementSchema } from '../../domain/schemas/measurements.js';
import { CheckInSchema } from '../../domain/schemas/checkins.js';
import { UserStateSchema } from '../../domain/schemas/userState.js';
export const emptyState = (crewId) => UserStateSchema.parse({schemaVersion:1, selectedCrewId:crewId, settings:{}});
export class LocalStorageHealthRepository {
  constructor(storage) { this.storage = storage; }
  load(crewId) {
    const raw = this.storage.getItem('astrocare:v1');
    return raw ? UserStateSchema.parse(JSON.parse(raw)) : emptyState(crewId);
  }
  save(state) { this.storage.setItem('astrocare:v1', JSON.stringify(UserStateSchema.parse(state))); }
}
export function validateMeasurement(value, seed) {
  const m = MeasurementSchema.parse(value);
  for (const r of m.readings) {
    const metric = seed.metrics.find(x => x.code === r.metric);
    if (!metric || !Number.isFinite(r.value) || r.value < metric.validMin || r.value > metric.validMax) throw new Error(`${metric?.label || r.metric}: enter ${metric?.validMin}–${metric?.validMax}`);
  }
  return m;
}
export function validateCheckIn(value, seed) {
  const c = CheckInSchema.parse(value);
  if (c.symptoms.some(s => !seed.symptoms.some(x => x.code === s))) throw new Error('Unknown symptom');
  return c;
}
export function mergeSeed(seed, user) {
  return {...seed, measurements:[...seed.measurements,...user.measurements], checkIns:[...seed.checkIns.filter(c=>!user.checkIns.some(u=>u.crewId===c.crewId&&u.date===c.date)),...user.checkIns]};
}
