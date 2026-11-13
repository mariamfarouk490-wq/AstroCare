import { z } from 'zod';
import { zProfileCode, zIsoDate } from './common.js';

export const MissionSchema = z.object({
  name: z.string().min(1),
  profileCode: zProfileCode,
  startDate: zIsoDate,
});
