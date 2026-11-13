import { WatchSource } from '../../application/ports/WatchSource.js';
export class SimulatedWatchAdapter extends WatchSource {
  async sample({ seed, crewId, date }) {
    const sample = seed.measurements.filter(m => m.source === 'seed' && m.crewId === crewId && m.takenAt.startsWith(date)).at(-1);
    if (!sample) throw new Error('No simulated watch sample for this day');
    return structuredClone(sample.readings.filter(r => ['HEART_RATE', 'SPO2'].includes(r.metric)));
  }
}
