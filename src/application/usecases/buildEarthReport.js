import { getCrewHealth } from './getCrewHealth.js';
import { activeProfile } from '../../domain/analysis/engine.js';
import { earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';
import { FIELD_INFO } from '../../domain/analysis/fields.js';
import { buildRecord } from './record.js';

const r1 = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const minutes = (sec) => (sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec} s`);

/**
 * A concise flight-surgeon report for one crew member, ready to send to Earth.
 * Pure: everything comes from the seed, the user state and `now`.
 * @returns {{ title, text, filename, roundTripSec, oneWaySec, expectedReplyAt, notifyEarth: string[] }}
 */
export function buildEarthReport(ctx, state, { crewId, day, now }) {
  const seed = ctx.seed;
  const health = getCrewHealth(ctx, state, { crewId, day });
  const profile = activeProfile(buildRecord(seed, state));
  const oneWaySec = profile.oneWayDelaySec;
  const roundTripSec = earthRoundTripSec(profile);
  const expectedReplyAt = new Date(now.getTime() + roundTripSec * 1000);
  const crew = health.crew;
  const L = [];

  L.push(`ASTROCARE FLIGHT-SURGEON REPORT`);
  L.push(`Crew member: ${crew.name} (${crew.id}, ${crew.role.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()})`);
  L.push(`Mission: ${seed.mission.name} · mission day ${health.derived.missionDay} · ${day}`);
  L.push(`Profile: ${profile.name} · one-way delay ${minutes(oneWaySec)} · expected reply in ~${minutes(roundTripSec)} (round trip)`);
  L.push(`Generated: ${now.toISOString()} · overall status: ${health.status}`);
  L.push('');

  const open = health.alerts;
  L.push(`OPEN ALERTS (${open.length})`);
  if (!open.length) L.push('  None.');
  for (const a of open) {
    L.push(`- [${a.severity}] ${a.code}${a.notifyEarth ? ' · flight surgeon review requested' : ''} · since mission day ${a.missionDay}`);
    L.push(`  Reason: ${a.reason}`);
    L.push(`  Threshold: ${a.threshold}${a.thresholdSource ? ` (${a.thresholdSource === 'app' ? 'team threshold' : a.thresholdSource})` : ''}`);
    L.push(`  Action taken / advised: ${a.action}`);
    if (a.acknowledgedAt) L.push(`  Acknowledged by crew: ${a.acknowledgedAt}`);
    if (a.refs?.length) L.push(`  Sources: ${a.refs.map((r) => r.url).join(' ; ')}`);
  }
  L.push('');

  L.push('LATEST VITALS (value · generic normal range · personal baseline)');
  for (const m of health.metrics) {
    if (m.value === undefined) {
      L.push(`- ${m.metric.label}: no reading`);
      continue;
    }
    const lo = Number.isFinite(m.range?.min);
    const hi = Number.isFinite(m.range?.max);
    const range = !m.range ? '–' : lo && hi ? `${m.range.min}–${m.range.max}` : hi ? `≤ ${m.range.max}` : lo ? `≥ ${m.range.min}` : '–';
    const base = m.baseline ? `${r1(m.baseline.mean)} ± ${r1(m.baseline.sd)}` : 'n/a';
    L.push(`- ${m.metric.label}: ${m.value} ${m.metric.unit} [${m.status}] · normal ${range} · baseline ${base} · ${m.takenAt ?? ''}`);
  }
  L.push('');

  const c = health.checkIn;
  L.push('DAILY CHECK-IN');
  if (!c) L.push('  Not logged for this day.');
  else {
    const fields = ['sleepHours', 'mood', 'stress', 'exerciseMin', 'waterL', 'mealsCompleted'].filter((f) => c[f] !== undefined);
    L.push(`  ${fields.map((f) => `${FIELD_INFO[f].label} ${c[f]}${FIELD_INFO[f].unit.startsWith('/') ? FIELD_INFO[f].unit : ` ${FIELD_INFO[f].unit}`}`).join(' · ')}`);
    const names = c.symptoms.map((s) => seed.symptoms.find((x) => x.code === s)?.label ?? s);
    L.push(`  Symptoms: ${names.length ? names.join(', ') : 'none'}`);
  }
  L.push('');

  L.push('ENVIRONMENT AND EXPOSURE');
  const co2Limit = seed.environmentLimits.cabinAir.ppCO2MaxMmHg1h;
  if (health.cabin) L.push(`  Cabin ppCO2 ${health.cabin.ppCO2mmHg} mmHg (limit ${co2Limit.value}, ${co2Limit.source}) · O2 ${health.cabin.ppO2mmHg} mmHg · ${health.cabin.temperatureC} °C`);
  L.push(`  Cumulative dose ${r1(health.derived.cumulativeDoseMSv)} mSv (${r1(health.derived.careerLimitPct)}% of career limit) · estimated bone loss ${r1(health.derived.estimatedBoneLossPct)}%`);
  L.push('');

  const sessions = state.emergencySessions.filter((s) => s.patientId === crewId);
  L.push(`EMERGENCY LOG (${sessions.length} session${sessions.length === 1 ? '' : 's'})`);
  if (!sessions.length) L.push('  None.');
  for (const s of sessions) {
    const title = seed.protocols.find((p) => p.code === s.protocol)?.title ?? s.protocol;
    L.push(`- ${title}: started ${s.startedAt}${s.endedAt ? `, ended ${s.endedAt} · outcome ${s.outcome}` : ' · ongoing'}`);
    for (const e of s.log) L.push(`  ${e.at}  ${e.step}${e.answer ? ` · ${e.answer}` : ''}`);
  }
  L.push('');
  L.push('Generated on board by AstroCare (offline). Values come from the crew log; thresholds and sources from NASA / CSA / medical guidelines.');

  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return {
    title: `Report for Earth · ${crew.name}`,
    text: L.join('\n'),
    filename: `astrocare-report-${crew.id}-${stamp}.txt`,
    oneWaySec,
    roundTripSec,
    expectedReplyAt,
    notifyEarth: open.filter((a) => a.notifyEarth).map((a) => a.code),
  };
}
