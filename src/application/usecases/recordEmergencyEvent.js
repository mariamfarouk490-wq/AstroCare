import { commit } from './record.js';

/** Append one step (and the answer, if any) to an emergency session log. */
export function recordEmergencyEvent(ctx, state, { sessionId, step, answer }) {
  const at = ctx.clock.now().toISOString();
  const emergencySessions = state.emergencySessions.map((s) =>
    s.id === sessionId ? { ...s, log: [...s.log, { at, step, ...(answer ? { answer } : {}) }] } : s,
  );
  return commit(ctx, { ...state, emergencySessions });
}
