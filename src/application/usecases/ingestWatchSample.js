import { addMeasurement } from './addMeasurement.js';

/** Save one sample from the watch (source "watch-sim"). */
export function ingestWatchSample(ctx, state, { crewId, readings, at }) {
  return addMeasurement(ctx, state, { crewId, readings, source: 'watch-sim', takenAt: at });
}
