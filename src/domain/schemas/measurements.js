import { z } from 'zod';
import { zMetricCode, zSource, zGlucoseContext, zIsoDateTime } from './common.js';

export const ReadingSchema = z.object({ metric: zMetricCode, value: z.number() });

export const MeasurementSchema = z
  .object({
    id: z.string().min(1),
    crewId: z.string().regex(/^cm-\d{2}$/),
    takenAt: zIsoDateTime,
    source: zSource,
    readings: z.array(ReadingSchema).min(1).max(6),
    glucoseContext: zGlucoseContext.optional(),
    emergencySessionId: z.string().optional(),
    ocr: z
      .object({ rawText: z.string(), confidence: z.number().min(0).max(100), corrected: z.boolean().optional() })
      .optional(),
    note: z.string().max(280).optional(),
  })
  .superRefine((m, ctx) => {
    const codes = m.readings.map((r) => r.metric);
    if (new Set(codes).size !== codes.length) ctx.addIssue({ code: 'custom', message: 'a metric appears twice in readings' });
    const hasGlucose = codes.includes('GLUCOSE');
    if (hasGlucose && !m.glucoseContext) ctx.addIssue({ code: 'custom', message: 'glucoseContext is required with GLUCOSE' });
    if (!hasGlucose && m.glucoseContext) ctx.addIssue({ code: 'custom', message: 'glucoseContext only allowed with GLUCOSE' });
    const sys = m.readings.find((r) => r.metric === 'BP_SYSTOLIC');
    const dia = m.readings.find((r) => r.metric === 'BP_DIASTOLIC');
    if (Boolean(sys) !== Boolean(dia)) ctx.addIssue({ code: 'custom', message: 'BP_SYSTOLIC and BP_DIASTOLIC go together' });
    if (sys && dia && dia.value >= sys.value) ctx.addIssue({ code: 'custom', message: 'diastolic must be lower than systolic' });
    if (m.source === 'ocr' && !m.ocr) ctx.addIssue({ code: 'custom', message: 'ocr metadata required when source is ocr' });
  });

export const MeasurementsSchema = z
  .array(MeasurementSchema)
  .refine((a) => new Set(a.map((m) => m.id)).size === a.length, 'measurement ids must be unique');

/** Seed files must use source "seed". */
export const MeasurementsSeedSchema = MeasurementsSchema.refine((a) => a.every((m) => m.source === 'seed'), 'seed measurements must have source "seed"');
