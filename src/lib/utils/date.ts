/**
 * Tiny date helpers shared by the schedule + calendar surfaces. Kept
 * dependency-free (no date-fns) because the operations here are simple
 * arithmetic and string conversions that benefit from staying small.
 */

/** `YYYY-MM-DD` for the supplied date in the local timezone. */
export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` to a local-midnight Date. Invalid strings → today. */
export function fromIsoDay(iso: string | null | undefined): Date {
  if (!iso) return startOfDay(new Date());
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return startOfDay(new Date());
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return startOfDay(new Date());
  return d;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Sunday-start week containing the supplied date, normalised to midnight. */
export function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

/** First day of the month at midnight. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Last day of the month at 23:59:59.999. */
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Minutes elapsed since the local-day midnight (0–1439). */
export function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "HH:mm" — 24-hour. */
export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Round `minutes` to the nearest `step` minutes (clamped to 0–1439). */
export function snapMinutes(minutes: number, step = 5): number {
  const snapped = Math.round(minutes / step) * step;
  return Math.max(0, Math.min(1439, snapped));
}

/** Build an ISO string for `day` at `minutes` past local midnight. */
export function isoForMinute(day: Date, minutes: number): string {
  const out = startOfDay(day);
  out.setMinutes(minutes);
  return out.toISOString();
}

/** True when two dates share calendar day in the local timezone. */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
