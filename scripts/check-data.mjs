// Seed data check: zod schema for every file + cross-file relations + the demo story.
// Run from the project root:  node scripts/check-data.mjs
// The demo story is checked by replaying every rule in rules.json over the seed, day by day,
// with the same pure engine the app uses (src/domain/analysis/engine.js),
// and comparing the first day each alert fires with demo-script.json (evidence for "Validity").
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildSeed, SeedError } from '../src/infrastructure/data/buildSeed.js';
import { SEED_FILE_SCHEMAS } from '../src/domain/schemas/index.js';
import { evaluateCrew } from '../src/domain/analysis/engine.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const raw = Object.fromEntries(
  readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8'))]),
);
const errors = [];
for (const f of Object.keys(raw)) if (!SEED_FILE_SCHEMAS[f]) errors.push(`${f}: no schema registered in src/domain/schemas/index.js`);

let seed;
try {
  seed = buildSeed(raw, { now: new Date('2026-11-13T12:00:00Z'), shiftDates: false });
} catch (e) {
  if (!(e instanceof SeedError)) throw e;
  errors.push(...e.problems);
}

/** Replays rules.json for one crew member with the app's engine. Returns { ruleCode: first seed day it fired }. */
const replay = (seed, crewId) => Object.fromEntries(evaluateCrew(seed, crewId).alerts.map((a) => [a.code, a.seedDay]));

if (seed) {
  const script = seed.demoScript;
  // objectives point at real files
  for (const o of seed.challengeObjectives) for (const f of o.dataFiles) if (!raw[f]) errors.push(`challenge-objectives ${o.code}: file ${f} does not exist`);

  // demo subject: each alert first fires exactly on the scripted day, and nothing unscripted fires
  const fired = replay(seed, script.subject);
  const expected = Object.fromEntries(script.steps.flatMap((s) => (s.expectFirstAlerts ?? []).map((c) => [c, s.day])));
  for (const [code, day] of Object.entries(expected)) if (fired[code] !== day) errors.push(`demo: ${code} fires on day ${fired[code] ?? 'never'}, script says day ${day}`);
  for (const code of Object.keys(fired)) if (!(code in expected)) errors.push(`demo: unscripted alert ${code} on day ${fired[code]}`);
  const hr = seed.measurements.filter((m) => m.crewId === script.subject).map((m) => m.readings.find((r) => r.metric === 'HEART_RATE').value);
  if (Math.max(...hr) >= 90) errors.push('demo: resting HR must stay below 90');

  // other crew: only the shared cabin alert
  for (const c of seed.crew.filter((c) => c.id !== script.subject)) {
    const other = Object.keys(replay(seed, c.id)).sort();
    if (other.join() !== [...script.otherCrewExpectedAlerts].sort().join()) errors.push(`${c.id}: alerts ${other.join(', ') || 'none'}, expected ${script.otherCrewExpectedAlerts.join(', ')}`);
  }

  // date shift: on a later presentation day the last seed day becomes today, never in the future
  const later = buildSeed(raw, { now: new Date('2026-11-14T09:00:00Z') });
  if (later.checkIns.map((c) => c.date).sort().at(-1) !== '2026-11-14') errors.push('date shift: last seed day should be 2026-11-14');
  const early = buildSeed(raw, { now: new Date('2026-11-14T06:00:00Z') });
  if (early.measurements.some((m) => Date.parse(m.takenAt) > Date.parse('2026-11-14T06:05:00Z'))) errors.push('date shift: readings in the future');

  if (!errors.length) {
    const nasa = seed.sources.filter((s) => s.publisher === 'NASA').length;
    console.log(`Data check passed: ${Object.keys(raw).length} files valid, ${seed.crew.length} crew, ${seed.measurements.length} measurements, ${seed.checkIns.length} check-ins, ${seed.rules.length} rules, ${seed.sources.length} sources (${nasa} NASA).`);
    console.log('Demo replay (day → alerts that first fire):');
    const byDay = {};
    for (const [code, day] of Object.entries(fired)) (byDay[day] ??= []).push(code);
    for (const day of Object.keys(byDay).sort((a, b) => a - b)) console.log(`  day ${day}: ${byDay[day].join(', ')}`);
    console.log(`Other crew: ${script.otherCrewExpectedAlerts.join(', ')} only. Date shift on 14 Nov 09:00 UTC: +${later.dateShiftDays} day.`);
  }
}
if (errors.length) {
  console.error(`Data check FAILED (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
