import { commit } from './record.js';

/** Close an emergency session with an outcome: Stabilized, HandedToEarth or Ongoing. */
export function endEmergency(ctx, state, { sessionId, outcome }) {
  const at = ctx.clock.now().toISOString();
  const emergencySessions = state.emergencySessions.map((s) =>
    s.id === sessionId ? { ...s, endedAt: at, outcome, log: [...s.log, { at, step: 'END', answer: outcome }] } : s,
  );
  return commit(ctx, { ...state, emergencySessions });
}
