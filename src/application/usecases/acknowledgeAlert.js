import { commit } from './record.js';

/** Mark an alert as seen. It stays open: alerts never close by themselves. */
export function acknowledgeAlert(ctx, state, { crewId, code }) {
  const at = ctx.clock.now().toISOString();
  return commit(ctx, { ...state, alertStates: { ...state.alertStates, [`${crewId}:${code}`]: { status: 'acknowledged', at } } });
}
