import { z } from 'zod';
import { zDomain, zMetricCode, zGlucoseContext, zRefs } from './common.js';

export const BandSchema = z
  .object({
    status: z.enum(['Normal', 'Watch', 'Critical']),
    min: z.number().optional(),
    max: z.number().optional(),
    context: zGlucoseContext.optional(), // glucose only
    source: z.string().min(1), // citation name, or "app" for a team-chosen limit
  })
  .refine((b) => b.min !== undefined || b.max !== undefined, 'band needs min or max')
  .refine((b) => b.min === undefined || b.max === undefined || b.min <= b.max, 'band min must be <= max');

export const MetricDefinitionSchema = z
  .object({
    code: zMetricCode,
    domain: zDomain,
    label: z.string().min(1),
    unit: z.string().min(1),
    validMin: z.number(),
    validMax: z.number(),
    step: z.number().positive(),
    sdFloor: z.number().positive(),
    bands: z.array(BandSchema).min(1),
    spaceNote: z.string().optional(),
    refs: zRefs.default([]),
  })
  .refine((m) => m.validMin < m.validMax, 'validMin must be < validMax')
  .refine((m) => m.code === 'GLUCOSE' || m.bands.every((b) => !b.context), 'only GLUCOSE bands may have a context');

export const MetricsSchema = z
  .array(MetricDefinitionSchema)
  .refine((a) => new Set(a.map((m) => m.code)).size === a.length, 'metric codes must be unique');
