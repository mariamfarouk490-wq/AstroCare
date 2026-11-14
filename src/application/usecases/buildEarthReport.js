import { getCrewHealth } from './getCrewHealth.js';
import { activeProfile } from '../../domain/analysis/engine.js';
import { earthRoundTripSec } from '../../domain/emergency/protocolMachine.js';
import { FIELD_INFO } from '../../domain/analysis/fields.js';
import { buildRecord } from './record.js';
import { DISCLAIMER } from '../../domain/disclaimer.js';

const r1 = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const minutes = (sec) => (sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec} s`);

/**
 * Report structure, shared by the on-screen preview and the .txt file:
 * sections: [{ title?, empty?, blocks: [{ heading?, rows: [[label, value]], links: [{ label, url? }] }] }]
 */
function toText(sections, notes) {
  const L = [];
  for (const s of sections) {
    if (s.title) L.push(s.title.toUpperCase());
    if (s.empty) L.push(`  ${s.empty}`);
    for (const b of s.blocks) {
      if (b.heading) L.push(`- ${b.heading}`);
      const pad = b.heading || s.title ? '  ' : '';
      for (const [k, v] of b.rows) L.push(`${pad}${k}: ${v}`);
      if (b.links?.length) L.push(`${pad}Sources: ${b.links.map((r) => r.url ?? r.label).join(' ; ')}`);
    }
    L.push('');
  }
  return [...L, ...notes].join('\n');
}

/**
 * A concise flight-surgeon report for one crew member, ready to send to Earth.
 * Pure: everything comes from the seed, the user state and `now`.
 * "Needs action" uses the same rule as the alert badge: open = not acknowledged.
 * @returns {{ title, sections, notes, text, filename, roundTripSec, oneWaySec, expectedReplyAt, notifyEarth: string[] }}
 */
export function buildEarthReport(ctx, state, { crewId, day, now }) {
  const seed = ctx.seed;
  const health = getCrewHealth(ctx, state, { crewId, day });
  const profile = activeProfile(buildRecord(seed, state));
  const oneWaySec = profile.oneWayDelaySec;
  const roundTripSec = earthRoundTripSec(profile);
  const expectedReplyAt = new Date(now.getTime() + roundTripSec * 1000);
  const est = (field) => (profile.estimates?.includes(field) ? ' (est.)' : '');
  const crew = health.crew;
  const sections = [];

  sections.push({
    title: 'AstroCare flight-surgeon report',
    blocks: [
      {
        rows: [
          ['Crew member', `${crew.name} (${crew.id}, ${crew.role.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()})`],
          ['Mission', `${seed.mission.name} · mission day ${health.derived.missionDay} · ${day}`],
          ['Profile', `${profile.name} · one-way delay ${minutes(oneWaySec)}${est('oneWayDelaySec')} · expected reply in ~${minutes(roundTripSec)} (round trip)`],
          ['Generated', `${now.toISOString()} · overall status: ${health.status}`],
        ],
      },
    ],
  });

  const alertBlock = (a) => ({
    heading: `[${a.severity}] ${a.code}${a.notifyEarth ? ' · flight surgeon review requested' : ''} · since mission day ${a.missionDay}`,
    rows: [
      ['Reason', a.reason],
      ['Threshold', `${a.threshold}${a.thresholdSource ? ` (${a.thresholdSource === 'app' ? 'team threshold' : a.thresholdSource})` : ''}`],
      ['Action taken / advised', a.action],
      ...(a.acknowledgedAt ? [['Acknowledged by crew', a.acknowledgedAt]] : []),
    ],
    links: a.refs ?? [],
  });
  const open = health.alerts.filter((a) => !a.acknowledgedAt);
  const acknowledged = health.alerts.filter((a) => a.acknowledgedAt);
  sections.push({ title: `Open alerts, need action (${open.length})`, empty: open.length ? undefined : 'None.', blocks: open.map(alertBlock) });
  if (acknowledged.length) sections.push({ title: `Acknowledged by crew, still active (${acknowledged.length})`, blocks: acknowledged.map(alertBlock) });

  sections.push({
    title: 'Latest vitals (value · generic normal range · personal baseline)',
    blocks: [
      {
        rows: health.metrics.map((m) => {
          if (m.value === undefined) return [m.metric.label, 'no reading'];
          const lo = Number.isFinite(m.range?.min);
          const hi = Number.isFinite(m.range?.max);
          const range = !m.range ? '–' : lo && hi ? `${m.range.min}–${m.range.max}` : hi ? `≤ ${m.range.max}` : lo ? `≥ ${m.range.min}` : '–';
          const base = m.baseline ? `${r1(m.baseline.mean)} ± ${r1(m.baseline.sd)}` : 'n/a';
          return [m.metric.label, `${m.value} ${m.metric.unit} [${m.status}] · normal ${range} · baseline ${base}${m.takenAt ? ` · ${m.takenAt}` : ''}`];
        }),
      },
    ],
  });

  const c = health.checkIn;
  const unit = (f) => (FIELD_INFO[f].unit.startsWith('/') ? FIELD_INFO[f].unit : ` ${FIELD_INFO[f].unit}`);
  sections.push({
    title: 'Daily check-in',
    empty: c ? undefined : 'Not logged for this day.',
    blocks: c
      ? [
          {
            rows: [
              ...['sleepHours', 'mood', 'stress', 'exerciseMin', 'waterL', 'mealsCompleted'].filter((f) => c[f] !== undefined).map((f) => [FIELD_INFO[f].label, `${c[f]}${unit(f)}`]),
              ['Symptoms', c.symptoms.length ? c.symptoms.map((s) => seed.symptoms.find((x) => x.code === s)?.label ?? s).join(', ') : 'none'],
            ],
          },
        ]
      : [],
  });

  const co2Limit = seed.environmentLimits.cabinAir.ppCO2MaxMmHg1h;
  const d = health.derived;
  sections.push({
    title: 'Environment and exposure',
    blocks: [
      {
        rows: [
          ...(health.cabin
            ? [
                ['Cabin ppCO2', `${health.cabin.ppCO2mmHg} mmHg (limit ${co2Limit.value}, ${co2Limit.source})`],
                ['Cabin air', `O2 ${health.cabin.ppO2mmHg} mmHg · ${health.cabin.temperatureC} °C`],
              ]
            : []),
          ['Cumulative dose', `${r1(d.cumulativeDoseMSv)} mSv${est('dailyDoseMSv')} (${r1(d.careerLimitPct)}% of career limit)`],
          ['Estimated bone loss', `${r1(d.estimatedBoneLossPct)}%${est('boneLossPctPerMonth')}`],
        ],
      },
    ],
  });

  const requests = (state.supportRequests ?? []).filter((r) => r.crewId === crewId);
  if (requests.length)
    sections.push({
      title: `Psychological support requested (${requests.length})`,
      blocks: requests.map((r) => ({
        heading: `Private psychological conference requested ${r.at}`,
        rows: [
          ['Open alerts at the time', r.alerts.length ? r.alerts.join(', ') : 'none'],
          ['Earliest reply', roundTripSec ? `~${minutes(roundTripSec)} after the request (round trip)` : 'live link'],
        ],
      })),
    });

  const sessions = state.emergencySessions.filter((s) => s.patientId === crewId);
  sections.push({
    title: `Emergency log (${sessions.length} session${sessions.length === 1 ? '' : 's'})`,
    empty: sessions.length ? undefined : 'None.',
    blocks: sessions.map((s) => ({
      heading: `${seed.protocols.find((p) => p.code === s.protocol)?.title ?? s.protocol}: started ${s.startedAt}${s.endedAt ? `, ended ${s.endedAt} · outcome ${s.outcome}` : ' · ongoing'}`,
      rows: s.log.map((e) => [e.at, `${e.step}${e.answer ? ` · ${e.answer}` : ''}`]),
    })),
  });

  const notes = ['Generated on board by AstroCare (offline). Values come from the crew log; thresholds and sources from NASA / CSA / medical guidelines.', DISCLAIMER];
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return {
    title: `Report for Earth · ${crew.name}`,
    sections,
    notes,
    text: toText(sections, notes),
    filename: `astrocare-report-${crew.id}-${stamp}.txt`,
    oneWaySec,
    roundTripSec,
    expectedReplyAt,
    notifyEarth: health.alerts.filter((a) => a.notifyEarth).map((a) => a.code),
  };
}
