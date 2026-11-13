import { z } from 'zod';
import { zRole } from './common.js';

export const CrewMemberSchema = z.object({
  id: z.string().regex(/^cm-\d{2}$/),
  name: z.string().min(1).max(60),
  role: zRole,
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isDemoSubject: z.boolean(),
});

export const CrewSchema = z
  .array(CrewMemberSchema)
  .min(1)
  .refine((a) => new Set(a.map((c) => c.id)).size === a.length, 'crew ids must be unique')
  .refine((a) => a.filter((c) => c.isDemoSubject).length === 1, 'exactly one crew member must have isDemoSubject: true');
