import type { CellStatus, Facility, ISODate, RegimeCell, RegimeId, State } from './types';

/**
 * Reviewed legal logic. Each rule is plain code with metadata: source, effective
 * interval, and reviewer. A language model may help read documents upstream, but
 * it never decides these outcomes. The demo rules are illustrative and were
 * written for a synthetic matter; they are not counsel-approved rules.
 */
export interface RuleVersion {
  ruleId: string;
  regime: RegimeId;
  version: string;
  effectiveFrom: ISODate;
  effectiveTo: ISODate | null;
  sources: number[];
  reviewer: string;
  note: string;
  evaluate: (f: Facility, s: State) => Omit<RegimeCell, 'regime' | 'facilityId' | 'ruleId' | 'ruleVersion' | 'sources'>;
}

export const REGIMES: { id: RegimeId; label: string; short: string }[] = [
  { id: 'ca-licensing', label: 'California licensing (CDPH)', short: 'CA licensing' },
  { id: 'medicare', label: 'Medicare CHOW (42 CFR 489.18)', short: 'Medicare' },
  { id: 'medi-cal', label: 'Medi-Cal enrollment routing', short: 'Medi-Cal' },
  { id: 'ohca', label: 'OHCA notice and review (HCAI)', short: 'OHCA' },
  { id: 'hud', label: 'HUD Section 232', short: 'HUD 232' },
  { id: 'nonprofit', label: 'Attorney General nonprofit review', short: 'Nonprofit' },
  { id: 'consents', label: 'Contractual consents', short: 'Consents' },
];

const issueResolved = (s: State, id: string) => s.issues.find((i) => i.id === id)?.status === 'resolved';
const issueChoice = (s: State, id: string) => s.issues.find((i) => i.id === id)?.resolution?.optionId;
const decisionChoice = (s: State, id: string) => s.decisions.find((d) => d.id === id)?.resolution?.optionId;

export const RULES: RuleVersion[] = [
  {
    ruleId: 'CA-LIC-CHOW', regime: 'ca-licensing', version: '2026.1', effectiveFrom: '2024-01-01', effectiveTo: null,
    sources: [3, 4, 5, 8], reviewer: 'Demo rule, not counsel-approved',
    note: 'License is not transferable; successor applicant needs approval. Management changes that transfer operational responsibility are evaluated separately.',
    evaluate: (f, s) => {
      const mgmt = issueChoice(s, 'i-mgmt');
      const mgmtLine =
        mgmt === 'defer-start'
          ? 'Management begins at closing, so the management change is reviewed with the ownership application.'
          : mgmt === 'seek-approval'
            ? 'Interim management requires its own prior approval before the Interim Period starts.'
            : 'Whether pre-closing management authority needs its own prior approval is open (ISS-03).';
      return {
        status: 'applicable',
        headline: f.id === 'bv' ? 'Successor application required; not yet submitted' : 'Successor application uploaded; completeness not confirmed',
        rationale: `Asset purchase by a new operating company. The current license is not transferable, so ${f.shortName} needs a successor license after approval and a final-transaction review. ${mgmtLine}`,
        evidence: [{ docId: f.id === 'lk' ? 'cdph-lk' : f.id === 'mh' ? 'cdph-mh' : 'apa', page: f.id === 'bv' ? 27 : 2, quote: f.id === 'bv' ? 'Each Buyer Operating Company shall have received from CDPH approval' : 'Applicant (proposed licensee)' }],
      };
    },
  },
  {
    ruleId: 'MCR-CHOW', regime: 'medicare', version: '2026.1', effectiveFrom: '2024-01-01', effectiveTo: null,
    sources: [9, 39], reviewer: 'Demo rule, not counsel-approved',
    note: 'An asset transfer to a new operator is a CHOW; a corporate stock transfer is not a CHOW under §489.18.',
    evaluate: (_f, s) => {
      const pa = decisionChoice(s, 'd-pa');
      if (!pa)
        return {
          status: 'unresolved',
          headline: 'CHOW applies; provider agreement posture undecided',
          rationale: 'Asset purchase by a new operating entity is a Medicare change of ownership. Whether the buyer accepts assignment of the provider agreement is a partner decision that changes liability allocation.',
          questions: ['Accept or reject assignment of the existing provider agreement?'],
        };
      return {
        status: 'applicable',
        headline: pa === 'accept' ? 'CHOW; buyer accepts assignment' : 'CHOW; buyer rejects assignment (new applicant)',
        rationale:
          pa === 'accept'
            ? 'Provider agreement assigned with its conditions and outstanding Medicare debt. Recoupment diligence, indemnity, and escrow terms added to the APA issues list.'
            : 'Buyer proceeds as a new applicant. Model the reimbursement gap and certification timing before relying on any handover date.',
      };
    },
  },
  {
    ruleId: 'MCAL-ROUTE', regime: 'medi-cal', version: '2026.1', effectiveFrom: '2025-01-01', effectiveTo: null,
    sources: [13], reviewer: 'Demo rule, not counsel-approved',
    note: 'SNFs enroll in Medi-Cal through CDPH, not PAVE.',
    evaluate: () => ({
      status: 'applicable',
      headline: 'Route through CDPH, not PAVE',
      rationale: 'Facility type is SNF, which DHCS lists among facility types enrolling through CDPH. Confirm transaction-specific instructions before submitting.',
      route: 'Agency: CDPH · Program: Medi-Cal · Provider type: SNF',
    }),
  },
  {
    ruleId: 'OHCA-MCN', regime: 'ohca', version: '2026.1 (AB 1415)', effectiveFrom: '2026-01-01', effectiveTo: '2026-11-01',
    sources: [14, 15, 17], reviewer: 'Demo rule, not counsel-approved',
    note: 'Expanded noticing entities effective Jan 1, 2026.',
    evaluate: () => ({ status: 'unresolved', headline: 'Superseded for this transaction date', rationale: '' }),
  },
  {
    ruleId: 'OHCA-MCN', regime: 'ohca', version: '2026.2 (amended regulations)', effectiveFrom: '2026-11-02', effectiveTo: null,
    sources: [14, 16, 17], reviewer: 'Demo rule, not counsel-approved',
    note: 'Amended regulations effective Nov 2, 2026 add filer criteria and transaction circumstances, including certain investor and management-services arrangements.',
    evaluate: (_f, s) => {
      const req = s.requests.find((r) => r.id === 'req-ohca');
      return {
        status: 'unresolved',
        headline: req?.status === 'sent' ? 'Waiting on client answers' : 'Filer status unknown',
        rationale:
          'The transaction would occur after the amended regulations take effect, so this version applies. Filer criteria, revenue thresholds, and the investor and management-services circumstances cannot be evaluated from the record. No notice date is computed, and no countdown implies clearance.',
        questions: req?.questions,
      };
    },
  },
  {
    ruleId: 'HUD-232-OP', regime: 'hud', version: '2026.1', effectiveFrom: '2024-01-01', effectiveTo: null,
    sources: [19], reviewer: 'Demo rule, not counsel-approved',
    note: 'Applies when a facility has Section 232 insured financing that remains in place.',
    evaluate: (f) =>
      f.hudInsured
        ? {
            status: 'applicable',
            headline: 'Operator and management agent change needs HUD review',
            rationale: 'The Section 232 insured mortgage stays in place, so the new operator, the operator lease, and the management agent go through the lender to HUD.',
            evidence: [
              { docId: 'debt', page: 1, quote: 'Larkspur: HUD Section 232 insured mortgage, Cascade Federal Mortgage, to remain in place.' },
              { docId: 'hud-letter', page: 1, quote: 'no later than 60 days before the anticipated closing date' },
            ],
          }
        : {
            status: 'not-applicable',
            headline: 'No HUD-insured financing',
            rationale: f.id === 'mh' ? 'Debt schedule shows a conventional loan paid off at closing.' : 'Debt schedule shows no mortgage debt; the facility is on a ground lease.',
            evidence: [{ docId: 'debt', page: 1, quote: f.id === 'mh' ? 'Mission Hills: term loan, Pacific Ledger Bank, payoff at closing.' : 'Bayview: no mortgage debt (ground lease).' }],
          },
  },
  {
    ruleId: 'AG-NONPROFIT', regime: 'nonprofit', version: '2026.1', effectiveFrom: '2024-01-01', effectiveTo: null,
    sources: [18], reviewer: 'Demo rule, not counsel-approved',
    note: 'Applies to sales by nonprofit owners or operators of health facilities, including SNFs.',
    evaluate: () => ({
      status: 'not-applicable',
      headline: 'Seller is a for-profit corporation',
      rationale: 'Seller parent and operating companies are for-profit. Reassess if any seller entity is a nonprofit.',
      evidence: [{ docId: 'sos', page: 1, quote: 'Type: Stock corporation (for-profit).' }],
    }),
  },
  {
    ruleId: 'CONSENTS', regime: 'consents', version: '2026.1', effectiveFrom: '2024-01-01', effectiveTo: null,
    sources: [], reviewer: 'Demo rule, not counsel-approved',
    note: 'Derived from extracted assignment and change-of-control clauses.',
    evaluate: (f, s) => {
      if (f.thirdPartyLandlord)
        return {
          status: 'applicable',
          headline: 'Ground lessor consent to assignment',
          rationale: 'Hollis Point is not selling and its ground lease prohibits assignment without prior written consent. Rent terms are incomplete until Schedule 2 arrives.',
          evidence: [{ docId: 'bv-gl', page: 22, quote: "without Landlord's prior written consent" }],
        };
      if (f.hudInsured)
        return {
          status: 'applicable',
          headline: 'Lender consent; new master lease',
          rationale: `Lender consent runs through the HUD package. The new master lease ${issueResolved(s, 'i-lessee') ? 'now names the correct tenant' : 'names a tenant that does not match the proposed licensee (ISS-01)'}.`,
        };
      return {
        status: 'applicable',
        headline: 'Lender payoff letter; new master lease',
        rationale: `Conventional loan is paid off at closing, so a payoff letter replaces a consent. The new master lease ${issueResolved(s, 'i-lessee') ? 'now names the correct tenant' : 'names a tenant that does not match the proposed licensee (ISS-01)'}.`,
      };
    },
  },
];

/** Pick the rule version in force on the transaction date. */
export function ruleFor(regime: RegimeId, onDate: ISODate): RuleVersion | undefined {
  return RULES.find(
    (r) => r.regime === regime && r.effectiveFrom <= onDate && (r.effectiveTo == null || onDate <= r.effectiveTo),
  );
}

export function classify(f: Facility, s: State): RegimeCell[] {
  const onDate = s.facts['target.handover'].value;
  return REGIMES.map(({ id }) => {
    const rule = ruleFor(id, onDate);
    if (!rule)
      return {
        regime: id, facilityId: f.id, status: 'unresolved' as CellStatus, headline: 'No rule in force for this date',
        rationale: 'No reviewed rule version covers the transaction date.', ruleId: '—', ruleVersion: '—', sources: [],
      };
    return { regime: id, facilityId: f.id, ruleId: rule.ruleId, ruleVersion: rule.version, sources: rule.sources, ...rule.evaluate(f, s) };
  });
}
