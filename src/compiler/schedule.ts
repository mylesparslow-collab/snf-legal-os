import { addDays, daysBetween, holidayOrWeekend } from '../domain/dates';
import type { ParamValues } from './params';

export interface ScheduleItem {
  id: string;
  label: string;
  /** Statutory date counted from closing, before any weekend or holiday move. */
  counted: string;
  /** Date to act by. For a "before" deadline, moved earlier off weekends and holidays. */
  actBy: string;
  moved?: string;
  offsetDays: number;
  kind: 'deadline' | 'planning' | 'after-closing';
  paramIds: string[];
  note: string;
  daysFromToday: number;
}

/**
 * Count back (or forward) from the closing date. When a "file before" date
 * lands on a weekend or holiday, the act-by date moves to the previous business
 * day. That is the cautious choice; whether an agency rolls a deadline forward
 * instead is an attorney question. The holiday list is a demo calendar.
 */
export function schedule(closing: string, today: string, p: ParamValues): ScheduleItem[] {
  const n = (id: string) => Number(p[id]);
  const prevBusiness = (d: string) => {
    let x = d;
    let why = holidayOrWeekend(x);
    const reasons: string[] = [];
    while (why) {
      reasons.push(`${x} is ${why}`);
      x = addDays(x, -1);
      why = holidayOrWeekend(x);
    }
    return { date: x, moved: reasons.length ? reasons.join('; ') : undefined };
  };
  const item = (id: string, label: string, offset: number, kind: ScheduleItem['kind'], paramIds: string[], note: string): ScheduleItem => {
    const counted = addDays(closing, offset);
    const adj = kind === 'after-closing' ? { date: counted, moved: undefined } : prevBusiness(counted);
    return { id, label, counted, actBy: adj.date, moved: adj.moved, offsetDays: offset, kind, paramIds, note, daysFromToday: daysBetween(today, adj.date) };
  };

  const items: ScheduleItem[] = [
    item('cdph-plan', 'Planning date: file CDPH application with room for the review extension', -(n('cdph.review') + n('cdph.reviewExt')), 'planning', ['cdph.review', 'cdph.reviewExt'],
      'CDPH has 120 days to decide on a complete application and may extend by 60. Filing on the statutory date leaves no room if it extends or finds the application incomplete.'),
    item('cdph-app', 'CDPH: buyer files the change of ownership application', -n('cdph.file'), 'deadline', ['cdph.file'], 'At least 120 calendar days before acquiring or operating.'),
    item('cdph-seller', 'CDPH: current licensee reports the planned change', -n('cdph.sellerNotice'), 'deadline', ['cdph.sellerNotice'], 'On the department\'s form, 120 calendar days before the change.'),
    item('cdph-window', 'CDPH: earliest approval that keeps closing inside the transfer window', -n('cdph.transfer'), 'planning', ['cdph.transfer'],
      'The transfer must happen within 120 days of approval (one 60-day extension available). An earlier approval starts that clock sooner.'),
    item('ohca', 'OHCA: material change notice filed', -n('ohca.notice'), 'deadline', ['ohca.notice'], 'At least 90 days before closing, if notice is required (see the OHCA view).'),
    item('cdph-post', 'CDPH: notice of the final transaction', n('cdph.postClose'), 'after-closing', ['cdph.postClose'], 'Within 10 days of the final transactions.'),
    item('cms-chow', 'CMS: report the change of ownership (CMS-855A)', n('cms.chowReport'), 'after-closing', ['cms.chowReport'], 'Window not confirmed in the primary text. Confirm before relying on it.'),
  ];
  return items.sort((a, b) => a.actBy.localeCompare(b.actBy));
}
