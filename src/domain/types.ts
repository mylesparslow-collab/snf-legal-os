export type ISODate = string; // YYYY-MM-DD

export type Role = 'partner' | 'associate' | 'paralegal';

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  title: string;
}

export type EntityKind = 'LLC' | 'Corporation' | 'LP' | 'Trust' | 'Individual' | 'Agency';

export type RepresentationStatus =
  | 'client'
  | 'affiliate-separately-represented'
  | 'counterparty'
  | 'third-party'
  | 'agency';

export interface Party {
  id: string;
  name: string;
  kind: EntityKind;
  side: 'buyer' | 'seller' | 'neutral' | 'agency';
  representation: RepresentationStatus;
  roleInDeal: string;
  counsel?: string;
  aliases?: string[];
}

export type DocStatus = 'draft' | 'executed' | 'filed' | 'received';

export interface DocPage {
  n: number;
  text: string;
}

export interface Doc {
  id: string;
  title: string;
  docType: string;
  version: string;
  status: DocStatus;
  date: ISODate;
  /** When the firm received this version (system time). */
  receivedAt: ISODate;
  facilityIds: string[];
  pages: DocPage[];
}

export interface EvidenceRef {
  docId: string;
  page: number;
  quote: string;
  label?: string;
}

export interface Facility {
  id: string;
  tradeName: string;
  shortName: string;
  address: string;
  county: string;
  beds: number;
  services: string[];
  hudInsured: boolean;
  thirdPartyLandlord: boolean;
}

export type AssertionStatus = 'verified' | 'proposed' | 'asserted' | 'contradicted';

/**
 * One dated claim about a facility. Kept separate per source until resolved.
 * validFrom/validTo = legal/factual effective interval; recordedAt = when we learned it.
 */
export interface Assertion {
  id: string;
  facilityId: string;
  field: PassportField;
  value: string;
  status: AssertionStatus;
  validFrom: ISODate | null; // null = effective on closing (not yet known)
  validTo?: ISODate | null;
  recordedAt: ISODate;
  evidence: EvidenceRef;
  dependsOn?: string;
}

export type PassportField =
  | 'licensee'
  | 'propertyOwner'
  | 'operatorManager'
  | 'stateLicense'
  | 'ccn'
  | 'npi'
  | 'mediCalRoute'
  | 'financing';

export interface OwnershipEdge {
  id: string;
  ownerId: string;
  ownedId: string;
  /** Percentage of the owned entity's interests; null when unknown. */
  pct: number | null;
  interestClass: string;
  voting: boolean;
  status: AssertionStatus;
  recordedAt: ISODate;
  evidence: EvidenceRef[];
  /** Which source view asserts this edge. */
  view: 'both' | 'questionnaire' | 'orgchart';
}

export interface ControlRight {
  id: string;
  right: string;
  holderId: string;
  instrument: string;
  effective: string;
  evidence: EvidenceRef;
  flag?: string;
}

export interface Option {
  id: string;
  label: string;
  consequence: string;
  requiresEvidence?: boolean;
  disabledReason?: string;
}

export type IssueKind = 'mismatch' | 'absence' | 'control';
export type Severity = 'critical' | 'high' | 'medium';

export interface Resolution {
  optionId: string;
  by: string;
  at: ISODate;
  note?: string;
}

export interface Issue {
  id: string;
  code: string;
  kind: IssueKind;
  severity: Severity;
  title: string;
  summary: string;
  facilityIds: string[];
  evidence: EvidenceRef[];
  consequence: string;
  affectedWorkProducts: string[];
  options: Option[];
  recommended: string;
  owner: Role;
  status: 'open' | 'resolved';
  resolution?: Resolution;
}

export interface Decision {
  id: string;
  title: string;
  question: string;
  context: string[];
  options: Option[];
  recommended: string;
  reason: string;
  owner: Role;
  status: 'open' | 'decided';
  resolution?: Resolution;
}

export type RegimeId =
  | 'ca-licensing'
  | 'medicare'
  | 'medi-cal'
  | 'ohca'
  | 'hud'
  | 'nonprofit'
  | 'consents';

export type CellStatus = 'applicable' | 'not-applicable' | 'unresolved';

export interface RegimeCell {
  regime: RegimeId;
  facilityId: string;
  status: CellStatus;
  headline: string;
  rationale: string;
  ruleId: string;
  ruleVersion: string;
  sources: number[];
  evidence?: EvidenceRef[];
  questions?: string[];
  route?: string;
}

export type ConditionStatus =
  | 'prepare-now'
  | 'waiting-client'
  | 'waiting-external'
  | 'decision-required'
  | 'complete'
  | 'not-applicable'
  | 'blocked';

export interface Condition {
  id: string;
  title: string;
  source: string;
  sourceKind: 'authority' | 'contract' | 'internal';
  facilityIds: string[];
  responsible: string;
  status: ConditionStatus;
  reason: string;
  evidence?: EvidenceRef[];
  dependsOn: string[];
  external: boolean;
  next?: string;
  link?: Link;
}

export type ClockBasis =
  | 'Regulatory guidance'
  | 'Agency correspondence'
  | 'Contract'
  | 'Lender correspondence'
  | 'Internal target';

export interface Clock {
  id: string;
  label: string;
  basis: ClockBasis;
  rule: string;
  trigger: string;
  triggerEvidence: EvidenceRef | null;
  date: ISODate | null;
  state: 'ok' | 'conflict' | 'missed' | 'pending-trigger' | 'not-computed';
  note: string;
  sources?: number[];
}

export interface Fact {
  key: string;
  label: string;
  value: string;
  kind: 'date' | 'text';
  evidence?: EvidenceRef;
  history: { value: string; at: ISODate; by: string; note: string }[];
}

export type WorkProductStatus = 'draft' | 'in-review' | 'executed' | 'filed';

export interface Revision {
  id: string;
  factKey: string;
  from: string;
  to: string;
  at: ISODate;
  by: string;
  state: 'proposed' | 'approved' | 'amendment-required';
}

export interface WorkProduct {
  id: string;
  title: string;
  kind: string;
  status: WorkProductStatus;
  facilityIds: string[];
  factRefs: { key: string; where: string }[];
  docId?: string;
  revisions: Revision[];
}

export interface Correspondence {
  id: string;
  from: string;
  facilityId: string;
  docId: string;
  dated: ISODate;
  received: ISODate;
  subject: string;
  proposedDeadline: { days: number; convention: string; quote: string };
  items: { id: string; request: string; matchDocIds: string[]; note: string; issueId?: string }[];
  status: 'pending-review' | 'approved';
  approvedBy?: string;
  holidayConfirmed?: boolean;
}

export interface ClientRequest {
  id: string;
  title: string;
  questions: string[];
  owner: Role;
  status: 'draft' | 'sent' | 'answered';
  sentAt?: ISODate;
  origin: string;
}

export interface LogEntry {
  at: string;
  by: string;
  text: string;
}

export type Link =
  | { tab: MatterTab; id?: string }
  | { facility: string };

export type MatterTab =
  | 'overview'
  | 'issues'
  | 'classification'
  | 'closing'
  | 'ownership'
  | 'clocks'
  | 'documents'
  | 'work'
  | 'parties';

export interface State {
  version: number;
  today: ISODate;
  role: Role;
  facts: Record<string, Fact>;
  issues: Issue[];
  decisions: Decision[];
  edges: OwnershipEdge[];
  workProducts: WorkProduct[];
  correspondence: Correspondence[];
  requests: ClientRequest[];
  log: LogEntry[];
}
