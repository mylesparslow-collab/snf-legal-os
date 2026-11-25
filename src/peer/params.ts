/**
 * Every day count, threshold and fine the peer review clock uses, as data,
 * with its source and status. Same status meanings as src/compiler/params.ts.
 * All of it still needs attorney verification before anyone relies on it.
 *
 * Hospital bylaw intervals are not here. They are read from the (fictional)
 * bylaws in hospital.ts, each with a page and a quote.
 */
import type { ParamStatus } from '../compiler/params';

export interface PeerParam {
  id: string;
  label: string;
  value: string;
  unit: 'days' | 'working days' | 'months' | 'USD';
  regime: 'State report' | 'Summary suspension' | 'Hearing' | 'Federal report';
  source: string;
  url?: string;
  status: ParamStatus;
  checkedOn?: string;
  note?: string;
}

const CHECKED = '2026-11-25';
const BPC = (s: string) => `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=${s}`;
export const LEG = (code: string, s: string) => `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=${code}&sectionNum=${s}`;
const ECFR = (s: string) => `https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-60/subpart-B/section-${s}`;

export const PEER_PARAMS: PeerParam[] = [
  // Bus. & Prof. Code § 805
  { id: 's805.reportDays', label: '805 report: days to file after the trigger', value: '15', unit: 'days', regime: 'State report',
    source: 'Bus. & Prof. Code § 805(b), (c), (e)', url: BPC('805'), status: 'text-checked', checkedOn: CHECKED,
    note: 'The text says "15 days". It does not say calendar days or how a weekend deadline is treated. (b) counts from the effective date of the action, (c) from the day the licentiate resigns or withdraws, (e) from the day a summary suspension is imposed.' },
  { id: 's805.cumulativeDays', label: '805 report: cumulative days of restriction that trigger a report', value: '30', unit: 'days', regime: 'State report',
    source: 'Bus. & Prof. Code § 805(b)(3)', url: BPC('805'), status: 'text-checked', checkedOn: CHECKED,
    note: '"A cumulative total of 30 days or more for any 12-month period." Counting each calendar day a restriction is in place, first and last day included, is our reading.' },
  { id: 's805.windowMonths', label: '805 report: period over which restriction days are added up', value: '12', unit: 'months', regime: 'State report',
    source: 'Bus. & Prof. Code § 805(b)(3)', url: BPC('805'), status: 'interpretation', checkedOn: CHECKED,
    note: 'The text says "any 12-month period". Treating that as a rolling window is our reading.' },
  { id: 's805.summaryDays', label: '805 report: a summary suspension is reported once in effect longer than', value: '14', unit: 'days', regime: 'State report',
    source: 'Bus. & Prof. Code § 805(e)', url: BPC('805'), status: 'text-checked', checkedOn: CHECKED,
    note: 'The report is due within 15 days following the imposition, so it comes due about a day after the suspension passes 14 days.' },
  { id: 's80501.reportDays', label: '805.01 report: days to file after the final decision or recommendation', value: '15', unit: 'days', regime: 'State report',
    source: 'Bus. & Prof. Code § 805.01(b)', url: BPC('805.01'), status: 'text-checked', checkedOn: CHECKED,
    note: 'Only for the four kinds of conduct in § 805.01(b)(1)–(4), after a formal investigation. Due whether or not a hearing is held. In addition to any 805 report (§ 805.01(e)).' },
  { id: 's805.fineWillful', label: 'Fine for a willful failure to file, up to', value: '100000', unit: 'USD', regime: 'State report',
    source: 'Bus. & Prof. Code § 805(k); § 805.01(g)', url: BPC('805'), status: 'text-checked', checkedOn: CHECKED, note: 'Per violation.' },
  { id: 's805.fineOther', label: 'Fine for any other failure to file, up to', value: '50000', unit: 'USD', regime: 'State report',
    source: 'Bus. & Prof. Code § 805(l); § 805.01(h)', url: BPC('805'), status: 'text-checked', checkedOn: CHECKED, note: 'Per violation. The research report gave only the $100,000 figure.' },

  // § 809.5
  { id: 's8095.ratifyDays', label: 'Governing-body summary suspension ends unless the peer review body ratifies it within', value: '2', unit: 'working days', regime: 'Summary suspension',
    source: 'Bus. & Prof. Code § 809.5(b)', url: BPC('809.5'), status: 'text-checked', checkedOn: CHECKED,
    note: '"Two working days, excluding weekends and holidays." Which holidays count is not defined; the demo calendar is used. Applies only when the governing body suspends because no one authorized by the peer review body was available.' },

  // § 809.2
  { id: 's8092.hearingStartDays', label: 'Hearing must start within, after the request is received', value: '60', unit: 'days', regime: 'Hearing',
    source: 'Bus. & Prof. Code § 809.2(h)', url: BPC('809.2'), status: 'text-checked', checkedOn: CHECKED,
    note: 'Unless the arbitrator or presiding officer finds in writing that the licentiate did not comply with (d) and (e) in time, or the licentiate consented to the delay. The research report did not mention this clock.' },
  { id: 's8092.documentDays', label: 'Access to documents: a party who gets it later than this many days before the hearing has good cause for a continuance', value: '30', unit: 'days', regime: 'Hearing',
    source: 'Bus. & Prof. Code § 809.2(d)', url: BPC('809.2'), status: 'text-checked', checkedOn: CHECKED },
  { id: 's8092.witnessDays', label: 'Witness lists and exhibits: exchanged at least this many days before the hearing, or good cause for a continuance', value: '10', unit: 'days', regime: 'Hearing',
    source: 'Bus. & Prof. Code § 809.2(f)', url: BPC('809.2'), status: 'text-checked', checkedOn: CHECKED,
    note: 'The research report gave 30 days for witnesses. The text says 10 days for witness lists and exhibits, and 30 days for document access under (d).' },

  // 45 CFR Part 60
  { id: 'npdb.reportDays', label: 'NPDB report: days to submit after the action', value: '30', unit: 'days', regime: 'Federal report',
    source: '45 CFR § 60.5', url: ECFR('60.5'), status: 'text-checked', checkedOn: CHECKED,
    note: '"Within 30 days following the action to be reported."' },
  { id: 'npdb.durationDays', label: 'NPDB report: a professional review action is reported if it affects privileges for longer than', value: '30', unit: 'days', regime: 'Federal report',
    source: '45 CFR § 60.12(a)(1)(i)', url: ECFR('60.12'), status: 'interpretation', checkedOn: CHECKED,
    note: 'The number is in the text. The regulation does not mention summary suspensions or add up separate restrictions; applying it to each action on its own is our reading. The NPDB Guidebook, which covers summary suspensions, was not read.' },
];

export type PeerValues = Record<string, string>;
export const peerDefaults = (): PeerValues => Object.fromEntries(PEER_PARAMS.map((p) => [p.id, p.value]));

/**
 * Which rules reach which license type. § 805(a)(2) lists the licentiates
 * whose discipline is reported; § 809(b) has a shorter list for the hearing
 * rights in §§ 809.1–809.4; 45 CFR § 60.12(a)(1) requires reports on
 * physicians and dentists and makes others voluntary ((a)(2)).
 * Read 2026-11-25. Only the types the demo uses are listed.
 */
export interface LicenseRule {
  kind: 'physician' | 'dentist' | 'nurse practitioner';
  label: string;
  agency: string;
  in805: boolean;
  in809: boolean;
  npdbRequired: boolean;
}

export const LICENSE_RULES: LicenseRule[] = [
  { kind: 'physician', label: 'Physician and surgeon', agency: 'Medical Board of California', in805: true, in809: true, npdbRequired: true },
  { kind: 'dentist', label: 'Dentist', agency: 'Dental Board of California', in805: true, in809: true, npdbRequired: true },
  { kind: 'nurse practitioner', label: 'Nurse practitioner (§ 2837.103 or § 2837.104)', agency: 'Board of Registered Nursing', in805: true, in809: false, npdbRequired: false },
];

/** The four kinds of conduct that call for an 805.01 report (§ 805.01(b)(1)–(4)), paraphrased. */
export const ACTS_80501: Record<string, string> = {
  '1': 'Incompetence, or gross or repeated deviation from the standard of care involving death or serious bodily injury',
  '2': 'Use of a controlled substance, dangerous drug or alcohol in a way that is dangerous or impairs safe practice',
  '3': 'Repeated acts of clearly excessive prescribing, or prescribing without a good-faith prior examination',
  '4': 'Sexual misconduct with a patient during treatment or an examination',
};
