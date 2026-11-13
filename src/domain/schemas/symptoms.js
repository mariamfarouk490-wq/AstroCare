import { z } from 'zod';
import { zRefs } from './common.js';

export const SymptomSchema = z.object({
  code: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(1),
  redFlag: z.boolean(), // true → show the Emergency button immediately in the check-in
  refs: zRefs.default([]),
});

export const SymptomsSchema = z
  .array(SymptomSchema)
  .refine((a) => new Set(a.map((s) => s.code)).size === a.length, 'symptom codes must be unique');
