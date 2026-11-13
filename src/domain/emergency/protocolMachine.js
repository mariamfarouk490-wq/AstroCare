// Pure state machine over protocols.json.
// State: { protocol, step }. A `next` like "UNRESPONSIVE:CALL_CREW" jumps to another protocol.

export function startProtocol(protocols, code) {
  const protocol = protocols.find((p) => p.code === code);
  if (!protocol) throw new Error(`Unknown protocol ${code}`);
  return { protocol: protocol.code, step: protocol.startStep };
}

export function currentStep(protocols, state) {
  const protocol = protocols.find((p) => p.code === state.protocol);
  return { protocol, step: protocol.steps.find((s) => s.code === state.step) };
}

function resolve(protocols, state, target) {
  if (!target) return state;
  if (target.includes(':')) {
    const [protocol, step] = target.split(':');
    return { protocol, step };
  }
  return { protocol: state.protocol, step: target };
}

/** Advance. For a question step pass the chosen option label. */
export function advance(protocols, state, optionLabel) {
  const { step } = currentStep(protocols, state);
  if (step.type === 'question') {
    const option = step.options.find((o) => o.label === optionLabel);
    if (!option) throw new Error(`Option "${optionLabel}" not on step ${step.code}`);
    return resolve(protocols, state, option.next);
  }
  return resolve(protocols, state, step.next);
}

/** Round-trip communication delay with Earth for a mission profile, in seconds. */
export const earthRoundTripSec = (profile) => profile.oneWayDelaySec * 2;
