// Display formatting only. No medical numbers here: values and limits come from src/data.

const decimals = (step) => (step && step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0);

export const formatValue = (metric, value) => (value === undefined || value === null ? '–' : Number(value).toFixed(decimals(metric?.step)));

export const formatNumber = (value, digits = 0) => (value === undefined || value === null || Number.isNaN(value) ? '–' : Number(value).toFixed(digits));

const DAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const SHORT_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export const formatDay = (day) => DAY_FMT.format(new Date(`${day}T00:00:00Z`));
export const formatShortDay = (day) => SHORT_FMT.format(new Date(`${day}T00:00:00Z`));
export const formatTime = (iso) => TIME_FMT.format(new Date(iso));

export function formatDuration(sec) {
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

export const formatClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const ROLE_LABEL = { Commander: 'Commander', FlightEngineer: 'Flight engineer', MissionSpecialist: 'Mission specialist' };

export const DOMAIN_LABEL = {
  Cardiovascular: 'Heart & circulation',
  MindSleep: 'Mind & sleep',
  BoneMuscle: 'Bone & muscle',
  Radiation: 'Radiation',
  MetabolicImmune: 'Metabolism & immunity',
};

export const SOURCE_LABEL = { seed: 'Morning log', manual: 'Manual entry', 'watch-sim': 'Watch (simulated)', ocr: 'Photo' };

export const initials = (name) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

/** "60–100", "≤ 79" or "≥ 95" for a band with an open end. */
export function formatRange(metric, range) {
  if (!range) return '';
  const lo = Number.isFinite(range.min);
  const hi = Number.isFinite(range.max);
  if (lo && hi) return `${formatValue(metric, range.min)}–${formatValue(metric, range.max)}`;
  if (hi) return `≤ ${formatValue(metric, range.max)}`;
  if (lo) return `≥ ${formatValue(metric, range.min)}`;
  return '';
}

/** Short metric label for tabs: "Resting heart rate" → "Heart rate", "Body temperature (oral)" → "Temperature". */
export function shortLabel(label) {
  const t = label.replace(/^(Resting|Blood|Body)\s+/i, '').replace(/\s*\(.*\)$/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** True when the field is listed in the mission profile's estimates[] (shown with an "est." marker). */
export const isEstimate = (profile, field) => Boolean(profile?.estimates?.includes(field));
