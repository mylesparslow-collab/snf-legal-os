import { DOCS, FACILITIES, TEAM } from '../data/seed';
import { addDays, daysBetween, fmt, holidayOrWeekend } from './dates';
import type { Clock, Condition, ConditionStatus, EvidenceRef, Link, Role, State, WorkProduct } from './types';

const issue = (s: State, id: string) => s.issues.find((i) => i.id === id)!;
const decision = (s: State, id: string) => s.decisions.find((d) => d.id === id)!;
const open = (s: State, id: string) => issue(s, id).status === 'open';

export const target = (s: State) => s.facts['target.handover'].value;

// ---------------------------------------------------------------- clocks

export function computeClocks(s: State): Clock[] {
  const t = target(s);
  const outside = s.facts['contract.outside'].value;
  const corr = s.correspondence[0];
  const cdphLatest = addDays(t, -120);
  const sellerEarliest = addDays('2026-09-30', 120);
  const lenderDate = addDays(t, -60);

  const clocks: Clock[] = [
    {
      id: 'k-cdph-advance', label: 'Complete CDPH applications on file', basis: 'Regulatory guidance',
      rule: 'At least 120 days before the intended transaction', trigger: 'Agency-confirmed complete application',
      triggerEvidence: null, date: cdphLatest, sources: [3],
      state: cdphLatest < s.today ? 'missed' : 'ok',
      note: cdphLatest < s.today
        ? `For a ${fmt(t)} transaction the complete application was due ${fmt(cdphLatest)}. Uploads on Sep 30 are not agency-confirmed as complete.`
        : `File complete applications for all three facilities by ${fmt(cdphLatest)}. Uploading is not the same as completeness.`,
    },
    {
      id: 'k-9167', label: "Seller's advance notice to CDPH", basis: 'Regulatory guidance',
      rule: 'At least 120 calendar days before the anticipated change', trigger: 'Seller filed CDPH 9167 on Sep 30, 2026',
      triggerEvidence: { docId: 'n9167', page: 1, quote: 'Notice of anticipated change of ownership.' }, date: sellerEarliest, sources: [4],
      state: t < sellerEarliest ? 'conflict' : 'ok',
      note: t < sellerEarliest
        ? `The seller's notice supports a change no earlier than ${fmt(sellerEarliest)}, ${daysBetween(t, sellerEarliest)} days after the target.`
        : `Notice period ends ${fmt(sellerEarliest)}, before the target.`,
    },
    {
      id: 'k-lender', label: 'HUD operator change package to lender (Larkspur)', basis: 'Lender correspondence',
      rule: '60 days before anticipated closing', trigger: 'Lender letter of Oct 1, 2026',
      triggerEvidence: { docId: 'hud-letter', page: 1, quote: 'no later than 60 days before the anticipated closing date' }, date: lenderDate,
      state: lenderDate < s.today ? 'missed' : 'ok',
      note: lenderDate < s.today ? 'Already past for this target.' : `${daysBetween(s.today, lenderDate)} days from today. Package needs the corrected operator lease.`,
    },
    corr.status === 'approved'
      ? (() => {
          const due = addDays(corr.dated, corr.proposedDeadline.days);
          const hol = holidayOrWeekend(due);
          return {
            id: 'k-cdph-resp', label: 'Respond to CDPH request (Mission Hills)', basis: 'Agency correspondence' as const,
            rule: `${corr.proposedDeadline.days} ${corr.proposedDeadline.convention.toLowerCase()}`, trigger: `CDPH letter dated ${fmt(corr.dated)}, approved by ${corr.approvedBy}`,
            triggerEvidence: { docId: corr.docId, page: 1, quote: corr.proposedDeadline.quote }, date: due,
            state: 'ok' as const,
            note: hol
              ? `Due date falls on ${hol}. The letter does not say whether it rolls forward, so the team treats ${fmt(addDays(due, -1))} as the working deadline.`
              : `${daysBetween(s.today, due)} days from today.`,
          };
        })()
      : {
          id: 'k-cdph-resp', label: 'Respond to CDPH request (Mission Hills)', basis: 'Agency correspondence',
          rule: 'Proposed: 30 calendar days from letter date', trigger: 'CDPH letter dated Oct 27, 2026 (awaiting reviewer approval)',
          triggerEvidence: { docId: corr.docId, page: 1, quote: corr.proposedDeadline.quote }, date: null, state: 'pending-trigger',
          note: 'Deadline is not counted until a reviewer approves the event and its date basis.',
        },
    {
      id: 'k-target', label: 'Target closing and handover', basis: 'Contract', rule: 'APA §2.3', trigger: 'Negotiated date',
      triggerEvidence: s.facts['target.handover'].evidence ?? null, date: t,
      state: t < sellerEarliest || cdphLatest < s.today ? 'conflict' : 'ok',
      note: `${daysBetween(s.today, t)} days from today. A contract date is not an approval date.`,
    },
    {
      id: 'k-outside', label: 'Outside date', basis: 'Contract', rule: 'APA §9.1(b)', trigger: 'Negotiated date',
      triggerEvidence: s.facts['contract.outside'].evidence ?? null, date: outside,
      state: t > outside ? 'conflict' : 'ok',
      note: t > outside ? 'Target is after the outside date. An extension is required.' : daysBetween(t, outside) < 14 ? `Only ${daysBetween(t, outside)} days of cushion after the target. Consider negotiating an extension.` : `${daysBetween(t, outside)} days after the target.`,
    },
    {
      id: 'k-ohca', label: 'OHCA notice', basis: 'Regulatory guidance', rule: 'Depends on filer and transaction criteria',
      trigger: 'Applicability unresolved', triggerEvidence: null, date: null, state: 'not-computed', sources: [16, 17],
      note: 'Not computed. A countdown here would imply a conclusion the record does not support.',
    },
    {
      id: 'k-post-notify', label: 'Notify CDPH of final transfer', basis: 'Regulatory guidance', rule: 'Within 10 days after the final transfer',
      trigger: 'Closing (not yet occurred)', triggerEvidence: null, date: null, state: 'pending-trigger', sources: [5],
      note: 'Becomes a dated obligation when a reviewer records the closing event.',
    },
    {
      id: 'k-post-complete', label: 'Complete transfer after CDPH approval', basis: 'Regulatory guidance', rule: 'Ordinarily within 120 days after approval',
      trigger: 'CDPH approval (not yet received)', triggerEvidence: null, date: null, state: 'pending-trigger', sources: [5],
      note: 'Starts from the approval notice, not from the application date.',
    },
  ];
  return clocks;
}

// ---------------------------------------------------------------- path to closing

const who = (role: Role) => TEAM.find((t) => t.role === role)!.name;

export function computeConditions(s: State): Condition[] {
  const t = target(s);
  const sched = decision(s, 'd-schedule');
  const pa = decision(s, 'd-pa');
  const corr = s.correspondence[0];
  const ohcaReq = s.requests.find((r) => r.id === 'req-ohca')!;
  const sellerEarliest = addDays('2026-09-30', 120);
  const linkIssue = (id: string): Link => ({ tab: 'issues', id });

  const schedStatus = (): [ConditionStatus, string, string?] => {
    if (sched.status === 'open') return ['decision-required', 'The target is 75 days away; the ordinary framework expects complete applications 120 days ahead. No exceptional pathway is in the record.', 'Partner decides how to treat the target date'];
    if (sched.resolution?.optionId === 'keep') return ['blocked', `Partner kept ${fmt(t)} with the risk reported. No evidence supports closing on that date.`];
    const latest = addDays(t, -120);
    if (latest < s.today) return ['blocked', `Even the revised target of ${fmt(t)} needed complete applications by ${fmt(latest)}.`];
    if (t < sellerEarliest) return ['blocked', `Revised target is before the seller's notice period ends (${fmt(sellerEarliest)}).`];
    return ['prepare-now', `Revised target ${fmt(t)} works if complete applications for all three facilities are on file by ${fmt(latest)}.`, `File complete applications by ${fmt(latest)}`];
  };
  const [ss, sr, sn] = schedStatus();

  const mhResp = (): [ConditionStatus, string, string?] => {
    if (corr.status === 'pending-review') return ['decision-required', 'CDPH asked for three items. The event and its deadline need reviewer approval before the clock is counted.', 'Approve the correspondence event'];
    const blockers = corr.items.filter((i) => i.issueId && open(s, i.issueId));
    if (blockers.length) return ['blocked', `Response cannot be assembled until ${blockers.map((b) => issue(s, b.issueId!).code).join(', ')} ${blockers.length > 1 ? 'are' : 'is'} resolved.`];
    return ['prepare-now', 'All three requested items now have a supported answer. Assemble and release the response.', 'Assemble the response for review'];
  };
  const [ms, mr, mn] = mhResp();

  const ownershipStatus = (): [ConditionStatus, string] => {
    if (open(s, 'i-tamarack') || open(s, 'i-sideletter')) return ['decision-required', 'Org chart v3 and the side letter conflict with the questionnaire. Resolve ISS-02 and ISS-04 first.'];
    return ['waiting-client', 'Working structure accepted. The 10% of Tamarack held by unnamed co-investors is still unknown and is shown as unknown, not as zero.'];
  };
  const [os, or] = ownershipStatus();

  const conds: Condition[] = [
    { id: 'c-sched', title: 'Schedule supports the intended closing', source: 'CDPH AB 1502 guidance [3]; CDPH 9167 [4]', sourceKind: 'authority', facilityIds: ['lk', 'mh', 'bv'], responsible: who('partner'), status: ss, reason: sr, next: sn, dependsOn: [], external: false, link: { tab: 'overview', id: 'd-schedule' } },
    { id: 'c-lessee', title: 'Lease names the licensed operator as tenant', source: 'Lease draft v4; CDPH applications', sourceKind: 'contract', facilityIds: ['lk', 'mh'], responsible: who('associate'), status: open(s, 'i-lessee') ? 'decision-required' : 'complete', reason: open(s, 'i-lessee') ? 'Lease tenant does not exist in the record and does not match the proposed licensees.' : 'Tenant corrected; revisions proposed to every affected draft.', evidence: issue(s, 'i-lessee').evidence.slice(0, 1), dependsOn: [], external: false, link: linkIssue('i-lessee') },
    { id: 'c-mgmt', title: 'Management arrangement structured for review', source: 'Management Agreement §2.1, §4.2; CDPH guidance [3]', sourceKind: 'authority', facilityIds: ['lk', 'mh', 'bv'], responsible: who('partner'), status: open(s, 'i-mgmt') ? 'decision-required' : issue(s, 'i-mgmt').resolution?.optionId === 'seek-approval' ? 'waiting-external' : 'complete', reason: open(s, 'i-mgmt') ? 'Manager authority would begin before CDPH approval.' : issue(s, 'i-mgmt').resolution?.optionId === 'seek-approval' ? 'Separate prior approval requested for interim management.' : 'Authority now begins at closing; pre-closing work is consulting only.', dependsOn: [], external: false, link: linkIssue('i-mgmt') },
    { id: 'c-owners', title: 'Ownership and control disclosures reconciled', source: '42 CFR 424.516 [10]; CMS SNF attachment guidance [11]', sourceKind: 'authority', facilityIds: ['lk', 'mh', 'bv'], responsible: who('associate'), status: os, reason: or, dependsOn: [], external: false, link: { tab: 'ownership' } },
    { id: 'c-cdph-lk', title: 'CDPH approval — Larkspur', source: 'CDPH CHOW process [5, 8]', sourceKind: 'authority', facilityIds: ['lk'], responsible: 'CDPH', status: 'waiting-external', reason: 'Uploaded Sep 30. Completeness not confirmed by CDPH. Elapsed time is not approval.', evidence: [{ docId: 'cdph-lk', page: 2, quote: 'Applicant (proposed licensee): Larkspur Opco LLC.' }], dependsOn: ['c-owners', 'c-mgmt'], external: true },
    { id: 'c-cdph-mh', title: 'CDPH approval — Mission Hills', source: 'CDPH request dated Oct 27, 2026', sourceKind: 'authority', facilityIds: ['mh'], responsible: corr.status === 'approved' ? who('associate') : who('associate'), status: ms, reason: mr, next: mn, dependsOn: ['c-owners', 'c-mgmt', 'c-lessee'], external: true, link: { tab: 'clocks' } },
    { id: 'c-cdph-bv', title: 'CDPH application — Bayview', source: 'CDPH CHOW process [5, 6]', sourceKind: 'authority', facilityIds: ['bv'], responsible: who('paralegal'), status: open(s, 'i-tamarack') ? 'blocked' : 'prepare-now', reason: open(s, 'i-tamarack') ? 'Not submitted. The ownership section depends on ISS-02.' : 'Ownership section can now be completed. Assemble the packet for review.', dependsOn: ['c-owners'], external: false, link: { tab: 'work', id: 'index-bv' } },
    { id: 'c-medicare', title: 'Medicare CHOW and provider agreement', source: '42 CFR 489.18 [9]; CMS CHOW guidance [39]', sourceKind: 'authority', facilityIds: ['lk', 'mh', 'bv'], responsible: pa.status === 'open' ? who('partner') : who('associate'), status: pa.status === 'open' ? 'decision-required' : open(s, 'i-tamarack') ? 'blocked' : 'prepare-now', reason: pa.status === 'open' ? 'Accepting or rejecting assignment changes liability allocation and billing continuity.' : open(s, 'i-tamarack') ? 'CMS-855A ownership sections wait on ISS-02.' : 'Prepare CMS-855A CHOW package with the SNF attachment.', dependsOn: ['c-owners'], external: true, link: { tab: 'overview', id: 'd-pa' } },
    { id: 'c-ohca', title: 'OHCA applicability determined', source: 'HCAI regulations effective Nov 2, 2026 [16, 17]', sourceKind: 'authority', facilityIds: ['lk', 'mh', 'bv'], responsible: ohcaReq.status === 'draft' ? who('paralegal') : 'Client', status: ohcaReq.status === 'draft' ? 'prepare-now' : 'waiting-client', reason: ohcaReq.status === 'draft' ? 'Three facts are missing. The filer questions are drafted and ready to send.' : `Questions sent ${fmt(ohcaReq.sentAt)}. This stays unresolved until counsel reviews the answers.`, next: ohcaReq.status === 'draft' ? 'Send OHCA questions to client' : undefined, dependsOn: [], external: false, link: { tab: 'classification' } },
    { id: 'c-hud', title: 'HUD operator change approval — Larkspur', source: 'HUD Handbook 4232.1 [19]; lender letter', sourceKind: 'authority', facilityIds: ['lk'], responsible: 'Cascade Federal Mortgage / HUD', status: open(s, 'i-lessee') ? 'blocked' : 'prepare-now', reason: open(s, 'i-lessee') ? 'Package needs the operator lease, which names the wrong tenant.' : `Package can be assembled; lender wants it by ${fmt(addDays(t, -60))}.`, evidence: [{ docId: 'hud-letter', page: 1, quote: 'no later than 60 days before the anticipated closing date' }], dependsOn: ['c-lessee', 'c-mgmt'], external: true },
    { id: 'c-hollis', title: 'Ground lessor consent — Bayview', source: 'Ground lease §14.1', sourceKind: 'contract', facilityIds: ['bv'], responsible: open(s, 'i-schedule2') ? 'Seller' : who('associate'), status: open(s, 'i-schedule2') ? 'waiting-client' : 'prepare-now', reason: open(s, 'i-schedule2') ? 'Rent schedule is missing. Get it before asking Hollis Point for consent.' : 'Schedule 2 requested; draft the consent request now.', evidence: [{ docId: 'bv-gl', page: 22, quote: "without Landlord's prior written consent" }], dependsOn: [], external: true, link: linkIssue('i-schedule2') },
    { id: 'c-payoff', title: 'Payoff letter — Pacific Ledger Bank', source: 'Seller debt schedule', sourceKind: 'contract', facilityIds: ['mh'], responsible: who('paralegal'), status: 'prepare-now', reason: 'Request a payoff letter dated for the closing date.', dependsOn: ['c-sched'], external: false },
    { id: 'c-citation', title: 'Regulatory history diligence — Mission Hills', source: 'Seller disclosure schedule 4.12', sourceKind: 'contract', facilityIds: ['mh'], responsible: open(s, 'i-citation') ? who('paralegal') : 'Seller', status: open(s, 'i-citation') ? 'prepare-now' : 'waiting-client', reason: open(s, 'i-citation') ? 'Citation disclosed without the order or its disposition.' : 'Requested from seller in list #4.', dependsOn: [], external: false, link: linkIssue('i-citation') },
    { id: 'c-ag', title: 'Attorney General nonprofit consent', source: 'Cal. AG nonprofit health facility review [18]', sourceKind: 'authority', facilityIds: ['lk', 'mh', 'bv'], responsible: who('associate'), status: 'not-applicable', reason: 'Seller is a for-profit corporation (Statement of Information). Rationale approved by Jordan Lee.', evidence: [{ docId: 'sos', page: 1, quote: 'Type: Stock corporation (for-profit).' }], dependsOn: [], external: false },
  ];
  return conds;
}

export const STATUS_META: Record<ConditionStatus, { label: string; tone: string; order: number }> = {
  'decision-required': { label: 'Decision required', tone: 'decide', order: 0 },
  blocked: { label: 'Blocked', tone: 'bad', order: 1 },
  'prepare-now': { label: 'Can be prepared now', tone: 'go', order: 2 },
  'waiting-client': { label: 'Waiting on client or seller', tone: 'wait', order: 3 },
  'waiting-external': { label: 'Waiting on agency or third party', tone: 'wait', order: 4 },
  complete: { label: 'Supported as complete', tone: 'done', order: 5 },
  'not-applicable': { label: 'Not applicable, rationale approved', tone: 'na', order: 6 },
};

// ---------------------------------------------------------------- my work

export interface WorkItem {
  id: string;
  role: Role;
  verb: string;
  title: string;
  why: string;
  tag: 'Decision' | 'Issue' | 'Agency' | 'Client request' | 'Revisions' | 'Missing evidence';
  weight: number;
  link: Link;
  due?: string;
}

export function workQueue(s: State): WorkItem[] {
  const items: WorkItem[] = [];
  for (const d of s.decisions.filter((d) => d.status === 'open'))
    items.push({ id: d.id, role: d.owner, verb: 'Decide', title: d.title, why: d.question, tag: 'Decision', weight: d.id === 'd-schedule' ? 100 : 80, link: { tab: 'overview', id: d.id } });
  for (const i of s.issues.filter((i) => i.status === 'open'))
    items.push({
      id: i.id, role: i.owner,
      verb: i.kind === 'absence' ? 'Request' : 'Review',
      title: i.title, why: i.summary, tag: i.kind === 'absence' ? 'Missing evidence' : 'Issue',
      weight: i.severity === 'critical' ? 90 : i.severity === 'high' ? 70 : 40, link: { tab: 'issues', id: i.id },
    });
  for (const c of s.correspondence.filter((c) => c.status === 'pending-review'))
    items.push({ id: c.id, role: 'associate', verb: 'Approve', title: `CDPH letter and deadline — ${FACILITIES.find((f) => f.id === c.facilityId)!.shortName}`, why: `Proposed deadline: ${c.proposedDeadline.days} ${c.proposedDeadline.convention.toLowerCase()}. Not counted until approved.`, tag: 'Agency', weight: 95, link: { tab: 'clocks', id: c.id }, due: 'Received Oct 28' });
  for (const r of s.requests.filter((r) => r.status === 'draft'))
    items.push({ id: r.id, role: r.owner, verb: 'Send', title: r.title, why: `${r.questions.length} questions drafted. ${r.origin}.`, tag: 'Client request', weight: 60, link: { tab: 'classification' } });
  const pending = s.workProducts.flatMap((w) => w.revisions.filter((r) => r.state === 'proposed').map(() => w));
  if (pending.length)
    items.push({ id: 'rev', role: 'associate', verb: 'Review', title: `Revision batch: ${pending.length} change${pending.length > 1 ? 's' : ''} across ${new Set(pending.map((w) => w.id)).size} drafts`, why: 'Proposed after a verified fact changed. Each change shows the old and new value.', tag: 'Revisions', weight: 75, link: { tab: 'work' } });
  const amend = s.workProducts.filter((w) => w.revisions.some((r) => r.state === 'amendment-required'));
  if (amend.length)
    items.push({ id: 'amend', role: 'partner', verb: 'Approve', title: `Supplements for ${amend.length} filed or executed record${amend.length > 1 ? 's' : ''}`, why: 'Filed and executed versions were preserved. Decide which need a supplement, amendment, or no action.', tag: 'Revisions', weight: 65, link: { tab: 'work' } });
  if (corrReadyToAssemble(s))
    items.push({ id: 'assemble', role: 'paralegal', verb: 'Assemble', title: 'CDPH response packet — Mission Hills', why: 'All three requested items have a supported answer.', tag: 'Agency', weight: 85, link: { tab: 'work', id: 'wp-cdph-resp' } });
  return items.sort((a, b) => b.weight - a.weight);
}

function corrReadyToAssemble(s: State) {
  const c = s.correspondence[0];
  return c.status === 'approved' && c.items.every((i) => !i.issueId || !open(s, i.issueId));
}

// ---------------------------------------------------------------- corrections

export interface Impact {
  wp: WorkProduct;
  where: string;
  mode: 'revise' | 'preserve';
}

export function impactOf(s: State, factKey: string): Impact[] {
  return s.workProducts.flatMap((wp) =>
    wp.factRefs
      .filter((r) => r.key === factKey)
      .map((r) => ({ wp, where: r.where, mode: wp.status === 'executed' || wp.status === 'filed' ? ('preserve' as const) : ('revise' as const) })),
  );
}

// ---------------------------------------------------------------- summaries

export function statusStatement(s: State): string {
  const t = target(s);
  const conds = computeConditions(s);
  const decide = conds.filter((c) => c.status === 'decision-required').length;
  const blocked = conds.filter((c) => c.status === 'blocked').length;
  const openIssues = s.issues.filter((i) => i.status === 'open').length;
  const sched = decision(s, 'd-schedule');
  const lead =
    sched.status === 'open' || sched.resolution?.optionId === 'keep'
      ? `The ${fmt(t)} target is not supported: no CDPH application is confirmed complete, and the seller's notice period runs past it.`
      : `Target moved to ${fmt(t)}. It holds if complete applications are on file by ${fmt(addDays(t, -120))}.`;
  return `${lead} ${openIssues} open issue${openIssues === 1 ? '' : 's'}, ${decide} item${decide === 1 ? "" : "s"} awaiting a decision, ${blocked} item${blocked === 1 ? '' : 's'} blocked.`;
}

export interface IndexItem {
  label: string;
  status: 'present' | 'conflict' | 'missing' | 'filed';
  docId?: string;
  note: string;
}

/** Packet structure is illustrative; confirm against CDPH's current checklist [6]. */
export function applicationIndex(s: State, facilityId: string): IndexItem[] {
  const filed = facilityId !== 'bv';
  const appDoc = facilityId === 'lk' ? 'cdph-lk' : facilityId === 'mh' ? 'cdph-mh' : undefined;
  return [
    { label: 'Application forms for proposed licensee', status: filed ? 'filed' : 'missing', docId: appDoc, note: filed ? 'Uploaded Sep 30; completeness not confirmed' : 'Not started' },
    { label: 'Current licensee notice (seller)', status: 'filed', docId: 'n9167', note: 'Filed by seller Sep 30' },
    { label: 'Organizational chart, direct and indirect owners', status: open(s, 'i-tamarack') ? 'conflict' : 'present', docId: 'org3', note: open(s, 'i-tamarack') ? 'v2 and v3 conflict (ISS-02)' : 'v3 accepted; 10% co-investor portion unknown' },
    { label: 'Investor control rights disclosure', status: open(s, 'i-sideletter') ? 'conflict' : 'present', docId: 'side', note: open(s, 'i-sideletter') ? 'Questionnaire contradicts side letter (ISS-04)' : 'Side letter rights disclosed' },
    { label: 'Management agreement', status: open(s, 'i-mgmt') ? 'conflict' : 'present', docId: 'mgmt', note: open(s, 'i-mgmt') ? 'Pre-closing authority under review (ISS-03)' : 'Revised: authority begins at closing' },
    { label: 'Right to possession (lease)', status: facilityId === 'bv' ? (open(s, 'i-schedule2') ? 'conflict' : 'present') : open(s, 'i-lessee') ? 'conflict' : 'present', docId: facilityId === 'bv' ? 'bv-gl' : 'lease', note: facilityId === 'bv' ? (open(s, 'i-schedule2') ? 'Assignment needs consent; Schedule 2 missing' : 'Assignment and consent in progress') : open(s, 'i-lessee') ? 'Tenant does not match applicant (ISS-01)' : 'Tenant corrected to Opco' },
    { label: 'Purchase agreement', status: 'present', docId: 'apa', note: 'Draft v6; executed version required at final review' },
    { label: 'Financial and operational information for applicant', status: 'missing', note: 'Request from client' },
  ];
}

export function evidenceDoc(e: EvidenceRef) {
  return DOCS.find((d) => d.id === e.docId);
}

export function readinessMemo(s: State): string {
  const conds = computeConditions(s);
  const by = (st: ConditionStatus) => conds.filter((c) => c.status === st);
  const line = (c: Condition) => `- ${c.title}: ${c.reason} (Source: ${c.source}. Responsible: ${c.responsible}.)`;
  const parts = [
    `CLOSING READINESS RECORD: ${'Juniper / Sierra Crest'}`,
    `Prepared ${fmt(s.today)} for counsel's review. This record organizes evidence for counsel's decision. It is not a legal opinion or a certificate of compliance.`,
    '',
    `Target closing: ${fmt(target(s))}. Outside date: ${fmt(s.facts['contract.outside'].value)}.`,
    '',
    'DECISIONS REQUIRED',
    ...by('decision-required').map(line),
    '',
    'BLOCKED',
    ...by('blocked').map(line),
    '',
    'CAN BE PREPARED NOW',
    ...by('prepare-now').map(line),
    '',
    'EXTERNAL DEPENDENCIES (timing not controlled by the team)',
    ...[...by('waiting-external'), ...by('waiting-client')].map(line),
    '',
    'SUPPORTED AS COMPLETE',
    ...by('complete').map(line),
    '',
    'NOT APPLICABLE (approved rationale)',
    ...by('not-applicable').map(line),
    '',
    'ASSUMPTIONS',
    '- Agency review periods are shown as unknowns, not as dates.',
    '- OHCA applicability is unresolved and has no computed deadline.',
    '- Rules used are demonstration rules and have not been approved by practice counsel.',
  ];
  return parts.join('\n');
}
