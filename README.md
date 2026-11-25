# SNF Transaction Workbench (Stage 2 demonstrator)

A working demonstrator of a legal operating system for California skilled nursing facility transactions, built from the product thesis of Oct 29, 2026. It runs entirely in the browser on a **synthetic** three-facility buyer-side deal. No real client, firm, facility, or identifier is used; synthetic identifiers carry a `SYN-` prefix.

## What it shows

Three destinations, as the thesis recommends:

- **My Work**: a role-specific exception and decision queue (partner, associate, paralegal). Evidence and options open inline, so routine reviews happen without leaving the queue.
- **Matters**: status statement, decisions, issues, path to closing, classification matrix, ownership, dates and agency correspondence, work products, documents, parties.
- **Facilities**: a dated facility record with two clocks (effective date and date learned), separate identities, and proposed changes kept apart from facts.

The scripted scenario covers thesis section 9: representation and scope, imported deal package, identity resolution, cross-document mismatches and missing-evidence findings, regime-by-regime classification, the schedule challenge against the 120-day framework, one correction propagating to every affected draft (filed and executed records preserved), approval of an incoming CDPH letter with a holiday-aware deadline, explained closing blockers, and a readiness record for counsel.

## Where AI stops and rules begin

| Layer | In this demo | In production |
|---|---|---|
| Document review | Issues are pre-seeded and labelled "Proposed by document review" | Model proposes candidate facts, clauses, and absences with page citations |
| Legal logic | `src/domain/rules.ts`: versioned rules with effective intervals, sources, reviewer | Counsel-approved rule packages with change history |
| Arithmetic | `src/domain/ownership.ts`, `src/domain/dates.ts` | Same: deterministic and tested, never model-computed |
| Decisions | Recorded with who and when; some options are disabled without evidence | Same, plus permissions and audit |

Unresolved stays unresolved: OHCA applicability never clears on its own, no countdown is shown for it, and an exceptional CDPH pathway cannot be selected without an agency document in the record.

## Transaction compiler (Stage 3)

The **Compiler** tab works one acquisition (fictional: Cedar Hollow Care Center, counsel Thornwood Garza LLP) through three agency views from a single ownership record:

- **Ownership**: exact decimal arithmetic on BigInt rationals. Every path multiplies the percentage at each tier, owners of every entity must add to exactly 100%, and unnamed holders (a fund's other limited partners) stay unresolved, with the share that would push one of them over a threshold.
- **CDPH (AB 1502)**, **CMS-855A** (owners, managing control, SNF organizational structure including 0% LLC managers, additional disclosable parties) and **OHCA** (filer thresholds, material change circumstances, control test, noticing entities). OHCA never clears on its own.
- **Dates** counted back from the closing date (CDPH T-120, OHCA T-90, and so on), with weekend and holiday moves.
- **Document check**: a model read the synthetic deal documents once and proposed facts with page and quote. Code accepts a fact only when the quote appears word for word, the parties are named, and the quote states the percentage. The recorded run is in `src/compiler/extraction.recorded.json`; `scripts/extract.ts` re-runs it.
- **Rules**: every threshold and day count is an editable parameter with its source and status. See `src/compiler/VERIFICATION.md` for what was and was not checked against primary sources.
- **Exports**: an Excel workbook whose paths, totals, threshold tests and dates are live formulas over the Edges and Parameters sheets, and a Word memo with the views, dates, open items, extraction log and rule register. `npx vite-node scripts/write-exports.ts out/` writes both.

```
src/compiler/decimal.ts   exact rational arithmetic
src/compiler/graph.ts     validation, indirect holdings, unnamed-pool crossing
src/compiler/params.ts    every legal number, with source and verification status
src/compiler/views.ts     CDPH, CMS-855A and OHCA views
src/compiler/schedule.ts  dates counted from closing
src/compiler/extract.ts   quote verification for model-proposed facts
src/compiler/exports.ts   xlsx and docx builders (xlsx.ts, docx.ts)
```

This is a demonstration on fictional data. It is not cleared for firm use, and the rules need attorney verification.

## MSO and friendly-PC audit

The **MSO audit** tab (`#mso`) extends the Cedar Hollow deal. Ridgeline Care Management, the SNF's management company, also manages Alder Springs Medical Group, a fictional friendly professional medical corporation that staffs the facility. The tab checks that arrangement against SB 351 (Health & Saf. Code §§ 1190–1192), Corp. Code § 13401.5 and the nurse practitioner statutes:

- **Who is covered**: whether each contract involves a physician or dental practice and a private equity group or an entity it controls. Ridgeline's ownership is read from the Compiler's record, so the 70/30 vs. 65/35 choice carries over. The SNF's own management agreement is outside SB 351.
- **Clauses** and **Trace matrix**: hand-coded clauses, each quote checked word for word against its page, then classified (void, void in part, allowed under § 1191(h), unresolved, attorney review, outside SB 351).
- **Cap table**: the § 13401.5 share cap and headcount tests, with a proposed fix.
- **Nurse practitioners**: transition to practice and § 2837.104 dates.
- **Rules**: every number with its source and status. `src/mso/VERIFICATION.md` lists what was read and where the research report differs.

```
src/mso/params.ts   numbers and dates, with source and status
src/mso/rules.ts    the SB 351 items traced
src/mso/deal.ts     fictional practice, contracts, clauses, cap table, NPs
src/mso/audit.ts    applicability, clause findings, trace matrix, cap table, NP status
```

## Run it

```bash
npm install
npm run dev          # local dev server
npm test             # domain tests (dates, ownership, rules, closing logic, propagation)
npm run build:single # one self-contained HTML file in dist-single/
node scripts/artifact.mjs  # body-only variant for hosted preview
```

## Layout

```
src/data/seed.ts        synthetic matter: parties, facilities, documents, issues, decisions
src/domain/types.ts     legal model (assertions, edges, conditions, clocks, work products)
src/domain/rules.ts     regime classification rules, versioned by effective date
src/domain/derive.ts    clocks, path to closing, work queue, impact analysis, readiness record
src/domain/ownership.ts indirect ownership with unknown portions and voting vs economic
src/state/store.tsx     reducer: resolutions, decisions, corrections, approvals
src/ui/                 screens
```

Demo rules are illustrative and have not been reviewed by practice counsel.

## Peer review clock

The **Peer review** tab (`#peer`) follows four fictional medical staff matters at Alder Springs District Hospital, the acute care hospital near Cedar Hollow, run by a public health care district. Each matter is a list of dated events; code counts the clocks under Bus. & Prof. Code §§ 805–809.5, 45 CFR Part 60 (NPDB) and the hospital's bylaws.

- **What is due**: every running clock across matters, soonest first, with weekend and holiday moves.
- **Matters**: the events and clocks for one matter. The planted cases are a governing-body suspension whose two-working-day ratification window spans Thanksgiving; three short restrictions that add up to 30 days for the state report while the federal clock has not started; an 805.01 report filed the Monday after a Saturday deadline and a hearing set 64 days out against a 60-day limit; and a nurse practitioner's resignation under investigation, which is reportable under § 805 but outside the § 809 hearing rights and the mandatory NPDB rule.
- **Bylaws**: hand-coded bylaw intervals, each quote checked against its page, then compared with the statute (the bylaws' 90 days to start a hearing conflicts with § 809.2(h)).
- **Committee records**: where each record is kept and who a draft would send it to (Evid. Code § 1157). It flags; it does not decide privilege.
- **District board**: closed-session agenda wording (Health & Saf. Code § 32155, Gov. Code § 54954.5(h)).
- **Rules**: every day count with its source and status, the counting method, and where the research report differs. `src/peer/VERIFICATION.md` has the full list.

```
src/peer/params.ts    day counts, thresholds and fines, with source and status
src/peer/hospital.ts  the fictional hospital, matters, bylaws, records, drafts and agenda
src/peer/clock.ts     the clocks
src/peer/checks.ts    bylaw, record, draft and agenda checks
```
