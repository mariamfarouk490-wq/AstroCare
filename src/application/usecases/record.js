// Merge the read-only seed with the user's changes into one record for the domain engine.
import { UserStateSchema } from '../../domain/schemas/userState.js';

export const newId = () => globalThis.crypto.randomUUID();

/** A fresh user state (nothing changed yet). */
export const emptyUserState = (selectedCrewId) => UserStateSchema.parse({ schemaVersion: 1, selectedCrewId, settings: {} });

/** Seed + user state. A user check-in replaces the seed check-in of the same crew member and day. */
export function buildRecord(seed, state) {
  const userDays = new Set(state.checkIns.map((c) => `${c.crewId}|${c.date}`));
  return {
    ...seed,
    measurements: [...seed.measurements, ...state.measurements],
    checkIns: [...seed.checkIns.filter((c) => !userDays.has(`${c.crewId}|${c.date}`)), ...state.checkIns],
    settings: state.settings,
  };
}

/** Validate and persist a new user state. */
export function commit(ctx, state) {
  const next = UserStateSchema.parse(state);
  ctx.repo.save(next);
  return next;
}

/** All seed days, oldest first (the demo replay scrubs through these). */
export const seedDays = (seed) => [...new Set(seed.measurements.map((m) => m.takenAt.slice(0, 10)))].sort();
