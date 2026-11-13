// Pure date helpers. All dates are UTC: days are 'YYYY-MM-DD', times are ISO 8601 with Z.
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' of a Date (UTC). */
export const toIsoDay = (date) => date.toISOString().slice(0, 10);

/** Whole days from day `a` to day `b` ('YYYY-MM-DD'). */
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

/** Shift a 'YYYY-MM-DD' by n days. */
export const addDays = (day, n) => toIsoDay(new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS));

/** Shift an ISO datetime by n days, keeping the time of day. */
export const shiftDateTime = (iso, n) => new Date(Date.parse(iso) + n * DAY_MS).toISOString().replace('.000Z', 'Z');

/** Mission day number (start day = day 1). */
export const missionDay = (startDate, today) => daysBetween(startDate, today) + 1;
