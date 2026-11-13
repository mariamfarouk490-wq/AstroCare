import { startProtocol } from '../../domain/emergency/protocolMachine.js';
import { commit, newId } from './record.js';

/** Open an emergency session for a crew member with a protocol from protocols.json. */
export function startEmergency(ctx, state, { protocol, patientId }) {
  const machine = startProtocol(ctx.seed.protocols, protocol);
  const at = ctx.clock.now().toISOString();
  const session = { id: newId(), protocol, patientId, startedAt: at, log: [{ at, step: `${machine.protocol}:${machine.step}`, answer: 'started' }] };
  return { state: commit(ctx, { ...state, emergencySessions: [...state.emergencySessions, session] }), session, machine };
}
