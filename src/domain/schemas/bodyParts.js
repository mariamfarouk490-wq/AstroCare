import { z } from 'zod';
import { zBodyPartId, zDomain, zMetricCode, zHazardCode, zVec3, zRefs } from './common.js';

/**
 * Hotspot coordinates are in BODY SPACE (see src/ui/three/bodyFrame.js):
 * metres, feet at y = 0, body height 1.80, facing +z (toward the camera), crew member's left = +x.
 * A glTF model must be scaled/positioned into the same frame (BodyModel does that).
 */
export const BodyPartSchema = z.object({
  id: zBodyPartId,
  domain: zDomain,
  label: z.string().min(1),
  functionText: z.string().min(1),
  spaceEffectText: z.string().min(1),
  position: zVec3,
  radius: z.number().positive(),
  cameraTarget: z.object({ position: zVec3, lookAt: zVec3 }),
  metrics: z.array(zMetricCode), // may be empty: bone & radiation are derived
  checkinFields: z.array(z.enum(['sleepHours', 'mood', 'stress', 'exerciseMin', 'waterL', 'mealsCompleted'])).optional(),
  derived: z.array(z.enum(['cumulativeDoseMSv', 'careerLimitPct', 'estimatedBoneLossPct'])).optional(),
  hazards: z.array(zHazardCode).default([]),
  nasaRisks: z.array(z.string()).default([]),
  refs: zRefs.default([]),
});

export const BodyPartsSchema = z
  .array(BodyPartSchema)
  .length(5)
  .refine((a) => new Set(a.map((b) => b.domain)).size === 5, 'exactly one body part per domain')
  .refine((a) => new Set(a.map((b) => b.id)).size === 5, 'body part ids must be unique');
