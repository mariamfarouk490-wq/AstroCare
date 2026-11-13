// Pure health snapshot for one crew member on one day: metrics vs bands and baseline,
// open alerts, body-part statuses, trends. Built on the rules engine.
import { evaluateCrew, readingOn, baselineAt, crewDays, checkInOn, cabinOn, derivedValues } from './engine.js';
import { statusOf, normalRange, worstStatus } from './metricStatus.js';

/** Latest reading of each metric on or before `day`, with its band status and personal baseline. */
export function metricSnapshot(record, crewId, day) {
  const days = crewDays(record, crewId, day);
  return record.metrics.map((metric) => {
    for (let i = days.length - 1; i >= 0; i--) {
      const r = readingOn(record, crewId, days[i], metric.code);
      if (!r) continue;
      return {
        metric,
        value: r.value,
        takenAt: r.takenAt,
        source: r.source,
        glucoseContext: r.glucoseContext,
        isToday: days[i] === day,
        status: statusOf(metric, r.value, r.glucoseContext),
        range: normalRange(metric, r.glucoseContext),
        baseline: baselineAt(record, crewId, days, i, metric),
      };
    }
    return { metric, value: undefined, status: 'NoData', range: normalRange(metric) };
  });
}

/** Status of every body part: the worst of its metric bands and its domain's open alerts. */
export function bodyPartStatuses(record, metrics, alerts) {
  return record.bodyParts.map((part) => {
    const partAlerts = alerts.filter((a) => a.bodyPart === part.id);
    const metricStatuses = metrics.filter((m) => part.metrics.includes(m.metric.code)).map((m) => m.status);
    const alertStatuses = partAlerts.map((a) => a.severity);
    let status = worstStatus([...metricStatuses, ...alertStatuses]);
    if (status === 'NoData') status = 'Normal'; // parts without own metrics (brain, bones, radiation) are normal unless an alert fires
    return { part, status, alerts: partAlerts };
  });
}

/** Full snapshot used by the body map, alerts and emergency screens. */
export function healthSnapshot(record, crewId, day) {
  const { days, alerts } = evaluateCrew(record, crewId, { until: day });
  const metrics = metricSnapshot(record, crewId, day);
  return {
    crewId,
    day,
    days,
    alerts,
    metrics,
    parts: bodyPartStatuses(record, metrics, alerts),
    checkIn: checkInOn(record, crewId, day),
    cabin: cabinOn(record, day),
    derived: derivedValues(record, crewId, day),
    status: worstStatus([...alerts.map((a) => a.severity), ...metrics.map((m) => m.status)]),
  };
}

/** Daily series for one metric with the generic Normal band and the rolling personal baseline. */
export function metricTrend(record, crewId, metricCode, until) {
  const metric = record.metrics.find((m) => m.code === metricCode);
  const days = crewDays(record, crewId, until);
  const points = days.map((day, i) => {
    const r = readingOn(record, crewId, day, metricCode);
    const base = baselineAt(record, crewId, days, i, metric);
    return {
      day,
      value: r?.value,
      status: r ? statusOf(metric, r.value, r.glucoseContext) : 'NoData',
      baseline: base && { mean: base.mean, low: base.mean - base.sd, high: base.mean + base.sd },
    };
  });
  const lastContext = [...points].reverse().find((p) => p.value !== undefined);
  return { metric, points, range: normalRange(metric, lastContext && readingOn(record, crewId, lastContext.day, metricCode)?.glucoseContext) };
}

/** Daily series for a check-in field (sleepHours, exerciseMin, mood, stress). */
export function checkInTrend(record, crewId, field, until) {
  return crewDays(record, crewId, until).map((day) => ({ day, value: checkInOn(record, crewId, day)?.[field] }));
}
