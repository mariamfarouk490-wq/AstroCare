import { HealthRepository } from '../../application/ports/HealthRepository.js';
import { UserStateSchema } from '../../domain/schemas/userState.js';

export const STORAGE_KEY = 'astrocare:v1';

/** User state in LocalStorage, validated with UserStateSchema on every read and write. */
export class LocalStorageHealthRepository extends HealthRepository {
  constructor(storage = globalThis.localStorage) {
    super();
    this.storage = storage;
  }

  /** Returns the saved state, or null if there is none or it no longer validates. */
  load() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = UserStateSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  save(state) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(UserStateSchema.parse(state)));
    } catch (error) {
      if (error?.name === 'ZodError') throw error;
      // storage full or blocked (private window): keep working in memory
    }
  }

  clear() {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      // storage blocked
    }
  }
}
