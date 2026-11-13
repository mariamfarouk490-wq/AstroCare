// One schema per file in src/data. seedLoader validates every file with these.
import { CrewSchema } from './crew.js';
import { MissionSchema } from './mission.js';
import { MissionProfilesSchema } from './missionProfiles.js';
import { MetricsSchema } from './metrics.js';
import { MeasurementsSeedSchema } from './measurements.js';
import { CheckInsSchema } from './checkins.js';
import { RulesSchema } from './rules.js';
import { GuidesSchema } from './guides.js';
import { ProtocolsSchema } from './protocols.js';
import { BodyPartsSchema } from './bodyParts.js';
import { SymptomsSchema } from './symptoms.js';
import { HazardsSchema, NasaRisksSchema, HrpResearchSchema, EnvironmentLimitsSchema, CabinEnvironmentSeedSchema, SourcesSchema, RemindersSchema, ChallengeObjectivesSchema, ImpactSchema, DemoScriptSchema } from './resources.js';

export { CrewSchema } from './crew.js';
export { MissionSchema } from './mission.js';
export { MissionProfilesSchema } from './missionProfiles.js';
export { MetricsSchema } from './metrics.js';
export { MeasurementsSchema, MeasurementsSeedSchema } from './measurements.js';
export { CheckInsSchema } from './checkins.js';
export { RulesSchema } from './rules.js';
export { GuidesSchema } from './guides.js';
export { ProtocolsSchema } from './protocols.js';
export { BodyPartsSchema } from './bodyParts.js';
export { SymptomsSchema } from './symptoms.js';
export { UserStateSchema, EmergencySessionSchema } from './userState.js';
export { HazardsSchema, NasaRisksSchema, HrpResearchSchema, EnvironmentLimitsSchema, CabinEnvironmentSeedSchema, SourcesSchema, RemindersSchema, ChallengeObjectivesSchema, ImpactSchema, DemoScriptSchema } from './resources.js';


/** file name in src/data → schema */
export const SEED_FILE_SCHEMAS = {
  'crew.json': CrewSchema,
  'mission.json': MissionSchema,
  'mission-profiles.json': MissionProfilesSchema,
  'metrics.json': MetricsSchema,
  'measurements.seed.json': MeasurementsSeedSchema,
  'checkins.seed.json': CheckInsSchema,
  'rules.json': RulesSchema,
  'guides.json': GuidesSchema,
  'protocols.json': ProtocolsSchema,
  'body-parts.json': BodyPartsSchema,
  'symptoms.json': SymptomsSchema,
  'hazards.json': HazardsSchema,
  'nasa-risks.json': NasaRisksSchema,
  'hrp-research.json': HrpResearchSchema,
  'environment-limits.json': EnvironmentLimitsSchema,
  'cabin-environment.seed.json': CabinEnvironmentSeedSchema,
  'sources.json': SourcesSchema,
  'reminders.json': RemindersSchema,
  'challenge-objectives.json': ChallengeObjectivesSchema,
  'impact.json': ImpactSchema,
  'demo-script.json': DemoScriptSchema,
};
