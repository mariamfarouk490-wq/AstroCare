import { z } from 'zod';
import { zProtocolCode, zRefs } from './common.js';

const stepCode = z.string().regex(/^[A-Z_]+$/);
// `next` is a step code in the same protocol, or "PROTOCOL:STEP" to jump to another protocol
const nextRef = z.string().regex(/^([A-Z_]+:)?[A-Z_]+$/);

export const StepSchema = z
  .object({
    code: stepCode,
    type: z.enum(['question', 'instruction', 'cpr-timer', 'measure', 'end']),
    text: z.string().min(1),
    next: nextRef.optional(),
    options: z.array(z.object({ label: z.string().min(1), next: nextRef })).min(2).max(4).optional(),
    cprRate: z.number().int().min(100).max(120).optional(),
  })
  .superRefine((s, ctx) => {
    if (s.type === 'question' && !s.options) ctx.addIssue({ code: 'custom', message: `${s.code}: question needs options` });
    if (!['question', 'end'].includes(s.type) && !s.next) ctx.addIssue({ code: 'custom', message: `${s.code}: needs next` });
    if (s.type === 'cpr-timer' && s.cprRate === undefined) ctx.addIssue({ code: 'custom', message: `${s.code}: cpr-timer needs cprRate` });
  });

export const ProtocolSchema = z
  .object({ code: zProtocolCode, title: z.string().min(1), startStep: stepCode, steps: z.array(StepSchema).min(1), sources: zRefs.default([]) })
  .refine((p) => new Set(p.steps.map((s) => s.code)).size === p.steps.length, 'step codes must be unique in a protocol')
  .refine((p) => p.steps.some((s) => s.code === p.startStep), 'startStep must exist');

export const ProtocolsSchema = z.array(ProtocolSchema);
