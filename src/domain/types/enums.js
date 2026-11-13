// Enums shared by the seed JSON (src/data) and the domain layer.
// Keep in sync with src/data/README.md.

/** @typedef {'Cardiovascular'|'MindSleep'|'BoneMuscle'|'Radiation'|'MetabolicImmune'} Domain */
export const Domain = Object.freeze({
  Cardiovascular: 'Cardiovascular',
  MindSleep: 'MindSleep',
  BoneMuscle: 'BoneMuscle',
  Radiation: 'Radiation',
  MetabolicImmune: 'MetabolicImmune',
});

export const MetricCode = Object.freeze({
  HEART_RATE: 'HEART_RATE',
  BP_SYSTOLIC: 'BP_SYSTOLIC',
  BP_DIASTOLIC: 'BP_DIASTOLIC',
  SPO2: 'SPO2',
  GLUCOSE: 'GLUCOSE',
  TEMPERATURE: 'TEMPERATURE',
});

export const Status = Object.freeze({ Normal: 'Normal', Watch: 'Watch', Critical: 'Critical', NoData: 'NoData' });
export const Severity = Object.freeze({ Watch: 'Watch', Critical: 'Critical' });
export const Source = Object.freeze({ seed: 'seed', manual: 'manual', watchSim: 'watch-sim', ocr: 'ocr' });
export const GlucoseContext = Object.freeze({ Fasting: 'Fasting', PostMeal2h: 'PostMeal2h', Random: 'Random' });
export const Role = Object.freeze({ Commander: 'Commander', FlightEngineer: 'FlightEngineer', MissionSpecialist: 'MissionSpecialist' });
export const ProfileCode = Object.freeze({ ISS: 'ISS', MOON: 'MOON', MARS_TRANSIT: 'MARS_TRANSIT', MARS_SURFACE: 'MARS_SURFACE' });
export const ProtocolCode = Object.freeze({ UNRESPONSIVE: 'UNRESPONSIVE', CHEST_PAIN: 'CHEST_PAIN' });
export const Outcome = Object.freeze({ Stabilized: 'Stabilized', HandedToEarth: 'HandedToEarth', Ongoing: 'Ongoing' });

/** Rule kinds. `derived` reads computed values (cumulativeDoseMSv, estimatedBoneLossPct, solarEventActive). */
export const RuleKind = Object.freeze({ threshold: 'threshold', baseline: 'baseline', streak: 'streak', combo: 'combo', derived: 'derived' });
export const Op = Object.freeze({ lt: 'lt', lte: 'lte', gt: 'gt', gte: 'gte', eq: 'eq' });
export const StepType = Object.freeze({ question: 'question', instruction: 'instruction', cprTimer: 'cpr-timer', measure: 'measure', end: 'end' });

/** NASA HRP "RIDGE" hazards (https://www.nasa.gov/hrp/hazards/). */
export const HazardCode = Object.freeze({ R: 'R', I: 'I', D: 'D', G: 'G', E: 'E' });

export const BodyPartId = Object.freeze({ heart: 'heart', brain: 'brain', skeleton: 'skeleton', abdomen: 'abdomen', aura: 'aura' });
