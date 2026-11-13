import { z } from 'zod';
import { zIsoDate } from './common.js';

export const CheckInSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().regex(/^cm-\d{2}$/),
  date: zIsoDate,
  sleepHours: z.number().min(0).max(24).multipleOf(0.5),
  mood: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  symptoms: z.array(z.string()).refine((s) => new Set(s).size === s.length, 'symptoms must not repeat'),
  exerciseMin: z.number().int().min(0).max(600).optional(), // NASA target ~90 min/day (bone & muscle countermeasure)
  source: z.enum(['seed', 'manual', 'watch-sim']),
});

export const CheckInsSchema = z
  .array(CheckInSchema)
  .refine((a) => new Set(a.map((c) => c.id)).size === a.length, 'check-in ids must be unique')
  .refine((a) => new Set(a.map((c) => `${c.crewId}|${c.date}`)).size === a.length, 'one check-in per crew member per day');
