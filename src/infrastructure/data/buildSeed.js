// Pure part of the seed loader (no JSON imports), so Node scripts and tests can use it.
import { SEED_FILE_SCHEMAS } from '../../domain/schemas/index.js';
import { checkIntegrity } from '../../domain/validation/integrity.js';
import { addDays, daysBetween, shiftDateTime, toIsoDay } from '../../domain/utils/dates.js';

export class SeedError extends Error {
  constructor(problems) {
    super(`Seed data is invalid:\n- ${problems.join('\n- ')}`);
    this.problems = problems;
  }
}

/** Validate each raw file; throws SeedError listing file + field for every problem. */
export function validateFiles(rawFiles) {
  const parsed = {};
  const problems = [];
  for (const [file, schema] of Object.entries(SEED_FILE_SCHEMAS)) {
    if (!(file in rawFiles)) { problems.push(`${file}: missing`); continue; }
    const result = schema.safeParse(rawFiles[file]);
    if (result.success) parsed[file] = result.data;
    else for (const issue of result.error.issues) problems.push(`${file} › ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  if (problems.length) throw new SeedError(problems);
  return parsed;
}

/** Days to add so the last seed day becomes today (or yesterday if today's readings would be in the future). */
/** Days to add so the last seed day becomes today (any time of day). */
export function computeDateShift(measurements, now) {
  const last = measurements.map((m) => m.takenAt).sort().at(-1);
  if (!last) return 0;
  return daysBetween(last.slice(0, 10), toIsoDay(now));
}

/**
 * A shifted reading must never be in the future: before 07:10 UTC the last day's morning
 * readings are moved to just before now (same day), so "today" always has data.
 */
function clampToNow(iso, now) {
  const t = Date.parse(iso);
  if (t <= now.getTime()) return iso;
  const startOfDay = Date.parse(`${toIsoDay(now)}T00:00:00Z`);
  const clamped = Math.max(startOfDay + 30_000, now.getTime() - 5 * 60_000);
  return new Date(clamped).toISOString().replace('.000Z', 'Z');
}

function applyShift(seed, n, now) {
  if (n === 0) return seed;
  const move = (iso) => clampToNow(shiftDateTime(iso, n), now);
  return {
    ...seed,
    mission: { ...seed.mission, startDate: addDays(seed.mission.startDate, n) },
    measurements: seed.measurements.map((m) => ({ ...m, takenAt: move(m.takenAt) })),
    checkIns: seed.checkIns.map((c) => ({ ...c, date: addDays(c.date, n) })),
    cabinEnvironment: seed.cabinEnvironment.map((c) => ({ ...c, takenAt: move(c.takenAt) })),
  };
}

/**
 * @param {Record<string, unknown>} rawFiles  file name → parsed JSON
 * @param {{ now: Date, shiftDates?: boolean }} options
 */
export function buildSeed(rawFiles, { now, shiftDates = true }) {
  const f = validateFiles(rawFiles);
  let seed = {
    crew: f['crew.json'],
    mission: f['mission.json'],
    missionProfiles: f['mission-profiles.json'],
    metrics: f['metrics.json'],
    measurements: f['measurements.seed.json'],
    checkIns: f['checkins.seed.json'],
    rules: f['rules.json'],
    guides: f['guides.json'],
    protocols: f['protocols.json'],
    bodyParts: f['body-parts.json'],
    symptoms: f['symptoms.json'],
    hazards: f['hazards.json'],
    nasaRisks: f['nasa-risks.json'],
    hrpResearch: f['hrp-research.json'],
    environmentLimits: f['environment-limits.json'],
    cabinEnvironment: f['cabin-environment.seed.json'],
    sources: f['sources.json'],
    reminders: f['reminders.json'],
    challengeObjectives: f['challenge-objectives.json'],
    impact: f['impact.json'],
    demoScript: f['demo-script.json'],
    mindSupport: f['mind-support.json'],
  };
  const problems = checkIntegrity(seed);
  if (problems.length) throw new SeedError(problems);
  const dateShiftDays = shiftDates ? computeDateShift(seed.measurements, now) : 0;
  seed = applyShift(seed, dateShiftDays, now);
  return { ...seed, dateShiftDays };
}
