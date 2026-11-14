// Loads src/data, validates every file with its zod schema, checks relations,
// and (by default) shifts the demo dates so the last seed day is "today".
// That way the demo story (HR alert on day 6, sleep debt on day 9) works on any presentation day.
import crew from '../../data/crew.json';
import mission from '../../data/mission.json';
import missionProfiles from '../../data/mission-profiles.json';
import metrics from '../../data/metrics.json';
import measurements from '../../data/measurements.seed.json';
import checkIns from '../../data/checkins.seed.json';
import rules from '../../data/rules.json';
import guides from '../../data/guides.json';
import protocols from '../../data/protocols.json';
import bodyParts from '../../data/body-parts.json';
import symptoms from '../../data/symptoms.json';
import hazards from '../../data/hazards.json';
import nasaRisks from '../../data/nasa-risks.json';
import hrpResearch from '../../data/hrp-research.json';
import environmentLimits from '../../data/environment-limits.json';
import cabinEnvironment from '../../data/cabin-environment.seed.json';
import sources from '../../data/sources.json';
import reminders from '../../data/reminders.json';
import challengeObjectives from '../../data/challenge-objectives.json';
import impact from '../../data/impact.json';
import demoScript from '../../data/demo-script.json';
import mindSupport from '../../data/mind-support.json';
import { buildSeed } from './buildSeed.js';

export const RAW_SEED_FILES = {
  'crew.json': crew,
  'mission.json': mission,
  'mission-profiles.json': missionProfiles,
  'metrics.json': metrics,
  'measurements.seed.json': measurements,
  'checkins.seed.json': checkIns,
  'rules.json': rules,
  'guides.json': guides,
  'protocols.json': protocols,
  'body-parts.json': bodyParts,
  'symptoms.json': symptoms,
  'hazards.json': hazards,
  'nasa-risks.json': nasaRisks,
  'hrp-research.json': hrpResearch,
  'environment-limits.json': environmentLimits,
  'cabin-environment.seed.json': cabinEnvironment,
  'sources.json': sources,
  'reminders.json': reminders,
  'challenge-objectives.json': challengeObjectives,
  'impact.json': impact,
  'demo-script.json': demoScript,
  'mind-support.json': mindSupport,
};

/**
 * @param {{ clock: { now(): Date }, shiftDates?: boolean }} options
 *   shiftDates (default true): move every seed date so the last seed day is today.
 *   Pass false to keep the original dates (2026-11-04 → 2026-11-13).
 */
export function loadSeed({ clock, shiftDates = true }) {
  return buildSeed(RAW_SEED_FILES, { now: clock.now(), shiftDates });
}
