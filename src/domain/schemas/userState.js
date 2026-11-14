import { z } from 'zod';
import { MeasurementsSchema } from './measurements.js';
import { CheckInsSchema } from './checkins.js';
import { zIsoDateTime, zProtocolCode, zOutcome } from './common.js';

export const EmergencySessionSchema = z.object({
  id: z.string().min(1),
  protocol: zProtocolCode,
  patientId: z.string().regex(/^cm-\d{2}$/),
  startedAt: zIsoDateTime,
  endedAt: zIsoDateTime.optional(),
  outcome: zOutcome.optional(),
  log: z.array(z.object({ at: zIsoDateTime, step: z.string(), answer: z.string().optional() })).default([]),
});

/** LocalStorage key "astrocare:v1": only what the user changed; merged over the seed on load. */
export const UserStateSchema = z.object({
  schemaVersion: z.literal(1),
  selectedCrewId: z.string().regex(/^cm-\d{2}$/),
  measurements: MeasurementsSchema.default([]),
  checkIns: CheckInsSchema.default([]),
  alertStates: z.record(z.string(), z.object({ status: z.literal('acknowledged'), at: zIsoDateTime })).default({}),
  emergencySessions: z.array(EmergencySessionSchema).default([]),
  /** "Request private conference with ground" (Mind support): shown in the Earth report. */
  supportRequests: z
    .array(z.object({ id: z.string().min(1), crewId: z.string().regex(/^cm-\d{2}$/), at: zIsoDateTime, alerts: z.array(z.string()).default([]) }))
    .default([]),
  settings: z
    .object({
      watchIntervalSec: z.number().int().min(1).default(5),
      scenario: z.enum(['normal', 'risingHr', 'lowSpo2']).default('normal'),
      reducedMotion: z.boolean().default(false),
      profileCode: z.enum(['ISS', 'MOON', 'MARS_TRANSIT', 'MARS_SURFACE']).optional(),
      solarEventActive: z.boolean().default(false),
    })
    .default({}),
});
