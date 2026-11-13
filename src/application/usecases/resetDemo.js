import { emptyUserState } from './record.js';

/** Forget every user change; the app goes back to the seed. */
export function resetDemo(ctx) {
  ctx.repo.clear();
  const state = emptyUserState(ctx.seed.demoScript.subject);
  ctx.repo.save(state);
  return state;
}
