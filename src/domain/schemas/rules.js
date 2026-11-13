import { z } from 'zod';
import { zDomain, zSeverity, zMetricCode, zProtocolCode, zRefs } from './common.js';

const zOp = z.enum(['lt', 'lte', 'gt', 'gte', 'eq']);
const base = {
  code: z.string().regex(/^[A-Z0-9_]+$/),
  domain: zDomain,
  severity: zSeverity,
  reasonTemplate: z.string().min(1), // placeholders: {value} {mean} {sd} {days} {delta} {pct}
  action: z.string().min(1),
  notifyEarth: z.boolean(),
  suggestEmergency: zProtocolCode.optional(),
  thresholdSource: z.string().optional(), // "app" when the limit is a team choice
  refs: zRefs.default([]),
};

export const ThresholdRuleSchema = z.object({ ...base, kind: z.literal('threshold'), params: z.object({ metric: zMetricCode, op: zOp, value: z.number() }) });
export const BaselineRuleSchema = z.object({
  ...base,
  kind: z.literal('baseline'),
  params: z
    .object({ metric: zMetricCode, zMin: z.number().positive().optional(), deltaMin: z.number().positive().optional(), consecutiveDays: z.number().int().min(1) })
    .refine((p) => (p.zMin === undefined) !== (p.deltaMin === undefined), 'baseline rule needs exactly one of zMin or deltaMin'),
});
export const StreakRuleSchema = z.object({
  ...base,
  kind: z.literal('streak'),
  params: z.object({ field: z.enum(['sleepHours', 'mood', 'stress', 'exerciseMin']), op: zOp, value: z.number(), days: z.number().int().min(1) }),
});
export const ComboRuleSchema = z.object({ ...base, kind: z.literal('combo'), params: z.object({ allOf: z.array(z.string()).min(2) }) });
export const DerivedRuleSchema = z.object({
  ...base,
  kind: z.literal('derived'),
  params: z.object({ field: z.enum(['cumulativeDoseMSv', 'estimatedBoneLossPct', 'careerLimitPct', 'solarEventActive', 'cabinPpCO2mmHg', 'headacheToday']), op: zOp, value: z.union([z.number(), z.boolean()]) }),
});

export const RuleSchema = z.discriminatedUnion('kind', [ThresholdRuleSchema, BaselineRuleSchema, StreakRuleSchema, ComboRuleSchema, DerivedRuleSchema]);

export const RulesSchema = z
  .array(RuleSchema)
  .refine((a) => new Set(a.map((r) => r.code)).size === a.length, 'rule codes must be unique');
