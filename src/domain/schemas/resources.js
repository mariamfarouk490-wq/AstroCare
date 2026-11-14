// Schemas for the challenge-resource files (NASA HRP + CSA). Read-only reference content.
import { z } from 'zod';
import { zDomain, zHazardCode, zBodyPartId, zRefs, zIsoDateTime } from './common.js';

export const HazardsSchema = z.array(
  z.object({
    code: zHazardCode,
    name: z.string().min(1),
    domains: z.array(zDomain).min(1),
    bodyParts: z.array(zBodyPartId),
    effects: z.array(z.string()).min(1),
    countermeasures: z.array(z.string()).min(1),
    appCoverage: z.string(),
    refs: zRefs.min(1),
  }),
).length(5);

export const NasaRisksSchema = z
  .array(
    z.object({
      code: z.string().regex(/^[A-Z0-9_]+$/),
      name: z.string().min(1),
      domain: zDomain,
      bodyPart: zBodyPartId,
      hazard: zHazardCode,
      appCoverage: z.string(),
      refs: zRefs.min(1),
    }),
  )
  .refine((a) => new Set(a.map((r) => r.code)).size === a.length, 'risk codes must be unique');

export const HrpResearchSchema = z.array(
  z.object({
    name: z.string().min(1),
    group: z.enum(['Artemis II', 'LEO', 'Past']),
    measures: z.string(),
    domain: z.union([zDomain, z.literal('All')]),
    bodyPart: z.union([zBodyPartId, z.literal('')]),
    appLink: z.string(),
    url: z.url(),
    listedOn: z.url(),
  }),
);

// limits are nested objects of { value | min/max, source }; kept loose on purpose
export const EnvironmentLimitsSchema = z.object({
  radiation: z.looseObject({ careerLimitMSv: z.object({ value: z.number(), source: z.string() }) }),
  cabinAir: z.looseObject({ ppCO2MaxMmHg1h: z.object({ value: z.number(), source: z.string() }) }),
  dailyNeeds: z.looseObject({}),
  physiologyRates: z.looseObject({}),
});

export const CabinEnvironmentSeedSchema = z.array(
  z.object({
    id: z.string().min(1),
    module: z.string().min(1),
    takenAt: zIsoDateTime,
    source: z.literal('seed'),
    ppCO2mmHg: z.number().min(0).max(20),
    ppO2mmHg: z.number().min(0).max(800),
    temperatureC: z.number().min(0).max(50),
    relativeHumidityPct: z.number().min(0).max(100),
  }),
);

export const SourcesSchema = z
  .array(z.object({ key: z.string().min(1), label: z.string().min(1), url: z.url().optional(), publisher: z.enum(['NASA', 'CSA', 'Peer-reviewed', 'Medical guideline', 'Team']) }))
  .refine((a) => new Set(a.map((s) => s.key)).size === a.length, 'source keys must be unique');

const zLocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const RemindersSchema = z
  .array(
    z.object({
      id: z.string().regex(/^rem-[a-z-]+$/),
      title: z.string().min(1),
      what: z.string().min(1),
      schedule: z.discriminatedUnion('type', [
        z.object({ type: z.literal('daily'), localTime: zLocalTime }),
        z.object({ type: z.literal('weekly'), weekday: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']), localTime: zLocalTime }),
        z.object({ type: z.literal('interval'), everyHours: z.number().positive(), from: zLocalTime, to: zLocalTime }),
      ]),
      opens: z.string().nullable(), // screen to open: measure | checkin | cabin | body:<bodyPartId>
      target: z.object({ field: z.string(), value: z.number() }).optional(),
      why: z.string().min(1),
      refs: zRefs.min(1),
    }),
  )
  .refine((a) => new Set(a.map((r) => r.id)).size === a.length, 'reminder ids must be unique');

export const ChallengeObjectivesSchema = z.array(
  z.object({
    code: z.string().regex(/^OBJ_[A-Z_]+$/),
    objective: z.string().min(1),
    feature: z.string().min(1),
    dataFiles: z.array(z.string().regex(/\.json$/)).min(1),
    dataStatus: z.enum(['ready', 'partial', 'missing']),
    uiStatus: z.enum(['to-build', 'in-progress', 'done']),
    note: z.string().optional(),
  }),
);

export const ImpactSchema = z.object({
  problem: z.string().min(1),
  beneficiaries: z.array(z.object({ group: z.string().min(1), how: z.string().min(1), refs: zRefs.min(1) })).min(1),
  spaceExploration: z.string().min(1),
  refs: zRefs.min(1),
});

export const DemoScriptSchema = z.object({
  subject: z.string().regex(/^cm-\d{2}$/),
  steps: z.array(z.object({ day: z.number().int().min(1), say: z.string().min(1), expectFirstAlerts: z.array(z.string()).optional() })).min(1),
  otherCrewExpectedAlerts: z.array(z.string()),
  note: z.string().optional(),
});
