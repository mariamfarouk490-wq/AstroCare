import { WatchSource } from '../../application/ports/WatchSource.js';

// A simulated wrist watch. It streams heart rate and SpO2 around the crew member's last
// readings, with small random noise, so the UI can show a live device without hardware.
// Scenarios (settings.scenario): normal, risingHr (drifts up ~1 bpm per sample), lowSpo2 (drifts down).
export class SimulatedWatchAdapter extends WatchSource {
  constructor({ random = Math.random } = {}) {
    super();
    this.random = random;
  }

  /**
   * @param options { start: { HEART_RATE, SPO2 }, intervalSec, scenario }
   * @param onSample ({ readings, at }) => void
   */
  stream({ start, intervalSec = 5, scenario = 'normal' }, onSample) {
    let hr = start.HEART_RATE;
    let spo2 = start.SPO2;
    let n = 0;
    const jitter = (amp) => (this.random() - 0.5) * 2 * amp;
    const tick = () => {
      n += 1;
      const drift = scenario === 'risingHr' ? n : 0;
      const drop = scenario === 'lowSpo2' ? n * 0.6 : 0;
      onSample({
        at: new Date().toISOString(),
        readings: [
          { metric: 'HEART_RATE', value: Math.round(hr + drift + jitter(2)) },
          { metric: 'SPO2', value: Math.max(80, Math.min(100, Math.round(spo2 - drop + jitter(0.6)))) },
        ],
      });
    };
    tick();
    const id = setInterval(tick, intervalSec * 1000);
    return () => clearInterval(id);
  }
}
