import { z } from 'zod';
import { Domain, MetricCode, Status, Severity, Source, GlucoseContext, Role, ProfileCode, ProtocolCode, Outcome, HazardCode, BodyPartId } from '../types/enums.js';

const values = (o) => Object.values(o);
export const zDomain = z.enum(values(Domain));
export const zMetricCode = z.enum(values(MetricCode));
export const zStatus = z.enum(values(Status));
export const zSeverity = z.enum(values(Severity));
export const zSource = z.enum(values(Source));
export const zGlucoseContext = z.enum(values(GlucoseContext));
export const zRole = z.enum(values(Role));
export const zProfileCode = z.enum(values(ProfileCode));
export const zProtocolCode = z.enum(values(ProtocolCode));
export const zOutcome = z.enum(values(Outcome));
export const zHazardCode = z.enum(values(HazardCode));
export const zBodyPartId = z.enum(values(BodyPartId));

/** A cited source: every content entry carries `refs`. */
// url is optional: a team threshold has no published source and is shown as plain text.
export const zRef = z.object({ label: z.string().min(1), url: z.url().optional() });
export const zRefs = z.array(zRef);

export const zIsoDate = z.iso.date(); // YYYY-MM-DD
export const zIsoDateTime = z.iso.datetime(); // 2026-11-13T07:30:00Z
export const zVec3 = z.tuple([z.number(), z.number(), z.number()]);
export const zRange = z.object({ min: z.number(), max: z.number() }).refine((r) => r.min <= r.max, 'min must be <= max');
