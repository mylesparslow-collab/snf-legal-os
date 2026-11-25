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
