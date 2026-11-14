import { z } from 'zod';
import { zRef } from './common.js';

const zSec = z.number().int().min(1).max(60);

/** mind-support.json: when to offer the Mind support card, the breathing exercise and the actions. */
export const MindSupportSchema = z.object({
  title: z.string().min(1),
  triggers: z.array(z.string().min(1)).min(1), // rule codes (checked against rules.json)
  checkInTrigger: z.object({ moodAtMost: z.number().int().min(1).max(5), stressAtLeast: z.number().int().min(1).max(5) }),
  escalation: z.object({ rule: z.string().min(1), message: z.string().min(1), refs: z.array(zRef).min(1) }),
  breathing: z.object({
    name: z.string().min(1),
    inhaleSec: zSec,
    exhaleSec: zSec,
    durationSec: z.number().int().min(10).max(600),
    note: z.string().min(1),
    refs: z.array(zRef).min(1),
  }),
  actions: z.array(z.object({ code: z.string().min(1), text: z.string().min(1), refs: z.array(zRef).min(1) })).min(3).max(6),
});
