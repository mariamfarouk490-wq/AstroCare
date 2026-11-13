// Composition root: picks the adapters behind each port and loads the seed.
import { loadSeed } from '../infrastructure/data/seedLoader.js';
import { SystemClock } from '../infrastructure/time/SystemClock.js';
import { LocalStorageHealthRepository } from '../infrastructure/storage/LocalStorageHealthRepository.js';
import { SimulatedWatchAdapter } from '../infrastructure/devices/SimulatedWatchAdapter.js';
import { OfflineNumericOcrEngine } from '../infrastructure/ocr/OfflineNumericOcrEngine.js';
import { createAppStore } from '../state/store.js';

export function createContainer() {
  const clock = new SystemClock();
  const ctx = {
    clock,
    seed: loadSeed({ clock }),
    repo: new LocalStorageHealthRepository(),
    watch: new SimulatedWatchAdapter(),
    ocr: new OfflineNumericOcrEngine(),
  };
  return { ctx, store: createAppStore(ctx) };
}
