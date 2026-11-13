// Pure rules engine: replays rules.json for one crew member, day by day.
//
// Kinds: threshold (one reading vs a fixed limit), baseline (z-score or delta vs the
// previous 7 days, for N consecutive days), streak (a check-in field for N days),
// derived (dose, bone loss, cabin CO2, headache today), combo (all listed alerts open).
// Alerts stay open once fired. Combos are evaluated after every other rule of the same day.
//
// Input `record` is the merged data (seed + user changes):
//   { measurements, checkIns, cabinEnvironment, rules, metrics, mission, missionProfiles,
//     bodyParts, environmentLimits, settings? }
import { daysBetween } from '../utils/dates.js';
import { mean, sampleSd, round } from '../utils/stats.js';
import { OPS, OP_SYMBOL, FIELD_INFO } from './fields.js';

const BASELINE_WINDOW_DAYS = 7;
const BASELINE_MIN_DAYS = 3;

/** Every day with a measurement or check-in for this crew member, sorted, up to `until` (inclusive). */
export function crewDays(record, crewId, until) {
  const days = new Set();
  for (const m of record.measurements) if (m.crewId === crewId) days.add(m.takenAt.slice(0, 10));
  for (const c of record.checkIns) if (c.crewId === crewId) days.add(c.date);
  return [...days].filter((d) => !until || d <= until).sort();
}

/** Latest reading of a metric on a day: { value, takenAt, source, glucoseContext } or undefined. */
export function readingOn(record, crewId, day, metric) {
  let best;
  for (const m of record.measurements) {
    if (m.crewId !== crewId || !m.takenAt.startsWith(day)) continue;
    const r = m.readings.find((x) => x.metric === metric);
    if (r && (!best || m.takenAt >= best.takenAt)) best = { value: r.value, takenAt: m.takenAt, source: m.source, glucoseContext: m.glucoseContext };
  }
  return best;
}

export const checkInOn = (record, crewId, day) => record.checkIns.find((c) => c.crewId === crewId && c.date === day);
export const cabinOn = (record, day) => record.cabinEnvironment.find((c) => c.takenAt.startsWith(day));

export function activeProfile(record) {
  const code = record.settings?.profileCode ?? record.mission.profileCode;
  return record.missionProfiles.find((p) => p.code === code);
}

/** Derived values for one day (README: "Derived values for the engine"). */
export function derivedValues(record, crewId, day) {
  const profile = activeProfile(record);
  const missionDay = daysBetween(record.mission.startDate, day) + 1;
  const dose = missionDay * profile.dailyDoseMSv;
  const careerLimit = record.environmentLimits.radiation.careerLimitMSv.value;
  return {
    missionDay,
    cumulativeDoseMSv: dose,
    careerLimitPct: (dose / careerLimit) * 100,
    estimatedBoneLossPct: profile.boneLossPctPerMonth ? (missionDay / 30) * profile.boneLossPctPerMonth.max : 0,
    solarEventActive: Boolean(record.settings?.solarEventActive),
    cabinPpCO2mmHg: cabinOn(record, day)?.ppCO2mmHg,
    headacheToday: Boolean(checkInOn(record, crewId, day)?.symptoms.includes('headache')),
  };
}

/** Personal baseline for a metric on `days[i]`: the previous 7 days (needs ≥ 3 readings). */
export function baselineAt(record, crewId, days, i, metric) {
  const values = days
    .slice(Math.max(0, i - BASELINE_WINDOW_DAYS), i)
    .map((d) => readingOn(record, crewId, d, metric.code)?.value)
    .filter((v) => v !== undefined);
  if (values.length < BASELINE_MIN_DAYS) return null;
  const sd = Math.max(sampleSd(values), metric.sdFloor);
  return { mean: mean(values), sd, n: values.length };
}

/** Human-readable trigger condition, e.g. "Resting heart rate > 130 bpm". */
export function thresholdText(rule, metrics) {
  const p = rule.params;
  const metric = p.metric && metrics.find((m) => m.code === p.metric);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  switch (rule.kind) {
    case 'threshold':
      return `${metric.label} ${OP_SYMBOL[p.op]} ${p.value} ${metric.unit}`;
    case 'baseline':
      return p.zMin !== undefined
        ? `${metric.label} ≥ ${p.zMin} SD above your 7-day mean, ${plural(p.consecutiveDays, 'day')} in a row`
        : `${metric.label} ≥ ${p.deltaMin} ${metric.unit} above your 7-day mean, ${plural(p.consecutiveDays, 'day')} in a row`;
    case 'streak': {
      const f = FIELD_INFO[p.field];
      return `${f.label} ${OP_SYMBOL[p.op]} ${p.value}${f.unit === '/5' ? '/5' : ` ${f.unit}`} for ${plural(p.days, 'day')}`;
    }
    case 'derived': {
      const f = FIELD_INFO[p.field];
      if (typeof p.value === 'boolean') return p.value ? f.label : `No ${f.label.toLowerCase()}`;
      return `${f.label} ${OP_SYMBOL[p.op]} ${p.value} ${f.unit}`.trim();
    }
    case 'combo':
      return `Open together: ${p.allOf.join(' + ')}`;
    default:
      return '';
  }
}

const fmt = (v, digits) => (typeof v === 'number' ? String(round(v, digits)) : String(v));

/** Fill {value} {mean} {sd} {days} {delta} {pct} in a rule's reasonTemplate. */
export function fillReason(template, values) {
  return template.replace(/\{(\w+)\}/g, (all, key) => (values[key] === undefined ? all : values[key]));
}

/**
 * Replay every rule for one crew member up to `until` (inclusive, 'YYYY-MM-DD').
 * Returns { days, alerts } with alerts in the order they first fired.
 */
export function evaluateCrew(record, crewId, { until } = {}) {
  const days = crewDays(record, crewId, until);
  const ordered = [...record.rules.filter((r) => r.kind !== 'combo'), ...record.rules.filter((r) => r.kind === 'combo')];
  const metricByCode = Object.fromEntries(record.metrics.map((m) => [m.code, m]));
  const fired = new Map();
  const streaks = {};

  days.forEach((day, i) => {
    const derived = derivedValues(record, crewId, day);
    const checkIn = checkInOn(record, crewId, day);
    for (const rule of ordered) {
      const p = rule.params;
      let hit = false;
      let values = {};

      if (rule.kind === 'threshold') {
        const v = readingOn(record, crewId, day, p.metric)?.value;
        hit = v !== undefined && OPS[p.op](v, p.value);
        values = { value: fmt(v, 1) };
      } else if (rule.kind === 'baseline') {
        const metric = metricByCode[p.metric];
        const v = readingOn(record, crewId, day, p.metric)?.value;
        const base = v === undefined ? null : baselineAt(record, crewId, days, i, metric);
        let ok = false;
        if (base) ok = p.zMin !== undefined ? (v - base.mean) / base.sd >= p.zMin : v - base.mean >= p.deltaMin;
        streaks[rule.code] = ok ? (streaks[rule.code] ?? 0) + 1 : 0;
        hit = streaks[rule.code] >= p.consecutiveDays;
        if (base) values = { value: fmt(v, 1), mean: fmt(base.mean, 1), sd: fmt(base.sd, 1), delta: fmt(v - base.mean, 1), days: streaks[rule.code] };
      } else if (rule.kind === 'streak') {
        const v = checkIn?.[p.field];
        const ok = v !== undefined && OPS[p.op](v, p.value);
        streaks[rule.code] = ok ? (streaks[rule.code] ?? 0) + 1 : 0;
        hit = streaks[rule.code] >= p.days;
        values = { value: fmt(v, 1), days: streaks[rule.code] };
      } else if (rule.kind === 'derived') {
        const v = derived[p.field];
        hit = v !== undefined && OPS[p.op](v, p.value);
        values = { value: fmt(v, 1), pct: fmt(derived.careerLimitPct, 0), days: derived.missionDay };
      } else if (rule.kind === 'combo') {
        hit = p.allOf.every((code) => fired.has(code));
      }

      if (hit && !fired.has(rule.code)) {
        fired.set(rule.code, {
          code: rule.code,
          kind: rule.kind,
          severity: rule.severity,
          domain: rule.domain,
          bodyPart: record.bodyParts.find((b) => b.domain === rule.domain)?.id,
          firedOn: day,
          seedDay: i + 1,
          missionDay: derived.missionDay,
          reason: fillReason(rule.reasonTemplate, values),
          threshold: thresholdText(rule, record.metrics),
          thresholdSource: rule.thresholdSource,
          action: rule.action,
          notifyEarth: rule.notifyEarth,
          suggestEmergency: rule.suggestEmergency,
          refs: rule.refs,
          parts: rule.kind === 'combo' ? p.allOf : undefined,
        });
      }
    }
  });

  return { days, alerts: [...fired.values()] };
}
