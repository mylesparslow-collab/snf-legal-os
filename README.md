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
