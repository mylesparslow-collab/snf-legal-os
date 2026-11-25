import { describe, expect, it } from 'vitest';
import { FACTS } from '../../compiler/deal';
import { format } from '../../compiler/decimal';
import { addYears, audit, capTable, gate, npStatuses, quoteCheck, traceMatrix } from '../audit';
import { ARRANGEMENTS, CAP_TABLE, CLAUSES } from '../deal';
import { msoDefaults } from '../params';
import { SB351_ITEMS } from '../rules';

const P = msoDefaults();
const a = audit(P);
const outcome = (id: string, x = a) => x.findings.find((f) => f.clause.id === id)!.outcome;
const g = (id: string, x = a) => x.gates.find((y) => y.arrangement.id === id)!;

describe('quotes', () => {
  it('every coded clause quotes its page word for word', () => {
    for (const c of CLAUSES) expect(quoteCheck(c), c.id).toBe(true);
  });
  it('rejects a clause whose quote is not on the page', () => {
    const bad = { ...CLAUSES[0], quote: 'Manager shall set all payer rates.' };
    expect(quoteCheck(bad)).toBe(false);
  });
  it('every clause names a known SB 351 item', () => {
    const ids = new Set(SB351_ITEMS.map((i) => i.id));
    for (const c of CLAUSES) for (const i of c.items) expect(ids.has(i), `${c.id} ${i}`).toBe(true);
  });
});

describe('who SB 351 reaches', () => {
  it('treats Ridgeline as controlled by the fund on either Ridgeline figure', () => {
    expect(g('msa').counterparty).toBe('controlled');
    expect(format(g('msa').peHoldings[0].pct)).toBe('70');
    const doc = audit(P, { e9: 'document', e10: 'document' });
    expect(g('msa', doc).counterparty).toBe('controlled');
    expect(format(g('msa', doc).peHoldings[0].pct)).toBe('65');
  });
  it('goes unresolved when the control setting is above the holding', () => {
    const x = gate(ARRANGEMENTS[0], { ...P, 'sb351.control': '75' });
    expect(x.counterparty).toBe('partial');
    expect(x.powers).toBe('unresolved');
  });
  it('does not reach the SNF management agreement', () => {
    expect(g('snf').practiceCovered).toBe(false);
    expect(outcome('snf-2.1')).toBe('outside');
  });
  it('does not apply (d) to the practice\'s own employment agreement', () => {
    expect(g('emp').covenants).toBe('no');
    expect(outcome('emp-8')).toBe('outside');
  });
});

describe('clause findings', () => {
  it('voids powers the manager holds outright', () => {
    expect(outcome('msa-3.2')).toBe('void'); // payers
    expect(outcome('msa-4.1')).toBe('void'); // encounters per hour
  });
  it('reads a manager tie-break as control, and says it is our reading', () => {
    const f = a.findings.find((x) => x.clause.id === 'joc-3')!;
    expect(f.outcome).toBe('void');
    expect(f.interpretation).toBe(true);
    expect(outcome('joc-4')).toBe('void');
  });
  it('keeps the recommend-and-approve equipment clause under § 1191(h)', () => {
    expect(outcome('msa-3.4')).toBe('safe-harbor');
  });
  it('passes a records clause that leaves ownership with the group', () => {
    expect(outcome('msa-4.3')).toBe('ok');
  });
  it('handles the covenants', () => {
    expect(outcome('msa-9.2')).toBe('void');
    expect(outcome('msa-11.3')).toBe('void');
    expect(outcome('msa-11.1')).toBe('void-in-part');
    expect(outcome('apa-7')).toBe('ok'); // sale-of-business noncompete
  });
  it('leaves the percentage fee and the share designee for review', () => {
    expect(outcome('msa-5.1')).toBe('unresolved');
    expect(outcome('str-2')).toBe('review');
  });
  it('builds the trace matrix', () => {
    const m = traceMatrix(a.findings);
    const coding = m.rows.find((r) => r.item.id === 'a2E')!;
    expect(coding.cells['asmg-joc'].map((f) => f.outcome)).toEqual(['void']);
    expect(m.docIds).toContain('mgmt');
  });
});

describe('cap table (Corp. Code § 13401.5)', () => {
  it('passes the 49% share cap but fails the headcount test', () => {
    const c = capTable(CAP_TABLE.current, P);
    expect(format(c.listedPct)).toBe('40');
    expect(c.tests.find((t) => t.id === 'share')!.ok).toBe(true);
    expect(c.tests.find((t) => t.id === 'headcount')!.ok).toBe(false);
    expect(c.ok).toBe(false);
  });
  it('the proposed fix passes both', () => {
    const c = capTable(CAP_TABLE.proposed, P);
    expect(c.ok).toBe(true);
  });
  it('fails the share cap when listed licensees pass 49%', () => {
    const c = capTable([{ partyId: 'al', shares: '50' }, { partyId: 'jp', shares: '50' }], P);
    expect(c.tests.find((t) => t.id === 'share')!.ok).toBe(false);
    expect(c.tests.find((t) => t.id === 'headcount')!.ok).toBe(true);
  });
});

describe('nurse practitioners', () => {
  it('counts the 104 date from the end of the transition', () => {
    expect(addYears('2024-09-16', 3)).toBe('2027-09-16');
    const [pike, ruiz] = npStatuses(FACTS.today, P);
    expect(pike.roleOk).toBe(true);
    expect(pike.eligible104).toBe(true);
    expect(ruiz.roleOk).toBe(false);
    expect(ruiz.eligible104On).toBe('2027-09-16');
  });
  it('re-runs from the parameter', () => {
    const [, ruiz] = npStatuses(FACTS.today, { ...P, 'np.104Years': '2' });
    expect(ruiz.roleOk).toBe(true);
  });
});
