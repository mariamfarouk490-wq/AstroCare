import { z } from 'zod';
import { zMetricCode, zRefs } from './common.js';

export const GuideSchema = z.object({
  metric: zMetricCode, // blood pressure has one guide, on BP_SYSTOLIC
  title: z.string().min(1),
  why: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1).max(6),
  ifWatch: z.string().min(1),
  ifCritical: z.string().min(1),
  sources: zRefs.min(1),
});

export const GuidesSchema = z
  .array(GuideSchema)
  .refine((a) => new Set(a.map((g) => g.metric)).size === a.length, 'one guide per metric');
