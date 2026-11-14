import { commit, newId } from './record.js';

/** "Request private conference with ground": stored on the device and listed in the Earth report. */
export function requestGroundSupport(ctx, state, { crewId, alerts = [] }) {
  const at = ctx.clock.now().toISOString();
  return commit(ctx, { ...state, supportRequests: [...state.supportRequests, { id: newId(), crewId, at, alerts }] });
}
