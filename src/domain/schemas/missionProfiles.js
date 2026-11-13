import { z } from 'zod';
import { zProfileCode, zRange, zRefs } from './common.js';

export const MissionProfileSchema = z.object({
  code: zProfileCode,
  name: z.string().min(1),
  oneWayDelaySec: z.number().int().min(0),
  dailyDoseMSv: z.number().min(0),
  gravityG: z.number().min(0).max(1),
  // extras used by the Radiation / BoneMuscle domains and the Earth-delay counter
  oneWayDelayRangeSec: zRange.optional(),
  distanceKm: z.number().positive().optional(),
  transitDays: z.number().int().min(0).optional(),
  resupply: z.boolean().optional(),
  boneLossPctPerMonth: zRange.nullable().optional(),
  estimates: z.array(z.string()).default([]), // names of fields that are estimates, not sourced
  notes: z.array(z.string()).default([]),
  refs: zRefs.default([]),
});

export const MissionProfilesSchema = z
  .array(MissionProfileSchema)
  .refine((a) => new Set(a.map((p) => p.code)).size === a.length, 'profile codes must be unique');
