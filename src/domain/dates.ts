import type { ISODate } from './types';

const DAY = 86_400_000;

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: ISODate, n: number): ISODate {
  return new Date(toUTC(d) + n * DAY).toISOString().slice(0, 10);
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY);
}

export function fmt(d: ISODate | null | undefined): string {
  if (!d) return '—';
  return new Date(toUTC(d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function weekday(d: ISODate): string {
  return new Date(toUTC(d)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

/**
 * Demo calendar of California state holidays. A real deployment would load a
 * maintained, versioned calendar; this list exists so the counting check runs.
 */
export const CA_HOLIDAYS: Record<ISODate, string> = {
  '2026-11-11': 'Veterans Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-11-27': 'Day after Thanksgiving',
  '2026-12-25': 'Christmas Day',
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'Martin Luther King Jr. Day',
  '2027-02-15': "Presidents' Day",
  '2027-03-31': 'Cesar Chavez Day',
  '2027-05-31': 'Memorial Day',
};

export function holidayOrWeekend(d: ISODate): string | null {
  if (CA_HOLIDAYS[d]) return CA_HOLIDAYS[d];
  const wd = new Date(toUTC(d)).getUTCDay();
  if (wd === 0) return 'Sunday';
  if (wd === 6) return 'Saturday';
  return null;
}
