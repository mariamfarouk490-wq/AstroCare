// Labels and units for the non-metric fields the rules read (check-in and derived values).
// Text only: every threshold number lives in src/data.

export const OPS = {
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  eq: (a, b) => a === b,
};

export const OP_SYMBOL = { lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=' };

export const FIELD_INFO = {
  sleepHours: { label: 'Sleep', unit: 'h' },
  mood: { label: 'Mood', unit: '/5' },
  stress: { label: 'Stress', unit: '/5' },
  exerciseMin: { label: 'Exercise', unit: 'min' },
  waterL: { label: 'Water', unit: 'L' },
  mealsCompleted: { label: 'Meals completed', unit: '/3' },
  cumulativeDoseMSv: { label: 'Cumulative dose', unit: 'mSv' },
  careerLimitPct: { label: 'Career dose limit used', unit: '%' },
  estimatedBoneLossPct: { label: 'Estimated bone loss', unit: '%' },
  solarEventActive: { label: 'Solar particle event', unit: '' },
  cabinPpCO2mmHg: { label: 'Cabin ppCO2', unit: 'mmHg' },
  headacheToday: { label: 'Headache in today’s check-in', unit: '' },
};
