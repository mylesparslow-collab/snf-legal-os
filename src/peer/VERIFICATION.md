# Peer review clock: which rules were checked

Read in the primary text on 2026-11-25 (leginfo.legislature.ca.gov and ecfr.gov). This is not attorney verification. Every rule, and the way days are counted, still needs an attorney before anyone relies on it. Numbers live in `params.ts` with a status; bylaw intervals live in `hospital.ts` with a page and a quote.

## Read in the primary text

| Source | What it confirmed |
|---|---|
| Bus. & Prof. Code § 805 (as amended by Stats. 2020, ch. 265) | 805 report within 15 days after the effective date of a denial, a termination, or restrictions totaling 30 days or more in any 12-month period ((b)); within 15 days after a resignation, leave or withdrawal that follows notice of an investigation ((c)); within 15 days following a summary suspension that stays in effect more than 14 days ((e)). Licentiates include nurse practitioners practicing under § 2837.103 or § 2837.104 ((a)(2)). Reporting does not waive confidentiality ((g)). Fines up to $100,000 for a willful failure ((k)) and up to $50,000 otherwise ((l)). |
| Bus. & Prof. Code § 805.01 | A separate report within 15 days after a final decision or recommendation, following a formal investigation, that one of four listed kinds of conduct may have occurred, whether or not a hearing is held ((b)). In addition to any 805 report ((e)). |
| Bus. & Prof. Code § 809 | For §§ 809.1–809.8, "licentiate" is a shorter list than § 805's: physician, podiatrist, clinical psychologist, marriage and family therapist, clinical social worker, professional clinical counselor, dentist ((b)). |
| Bus. & Prof. Code § 809.05 | The governing body gives great weight to the peer review body and may act only in limited cases. |
| Bus. & Prof. Code § 809.1 | Written notice of the final proposed action, which must state the right to a hearing and "the time limit, within which to request such a hearing" ((b)). No number of days. |
| Bus. & Prof. Code § 809.2 | Document access: failure to provide it at least 30 days before the hearing is good cause for a continuance ((d)). Witness lists and exhibits: at least 10 days before ((f)). Hearing commenced within 60 days after receipt of the request, with two exceptions ((h)). |
| Bus. & Prof. Code §§ 809.3, 809.4 | Hearing rights, burdens, written decision, and minimum appeal rights if an appeal exists. No day counts. |
| Bus. & Prof. Code § 809.5 | Immediate suspension where failure to act may result in imminent danger, with notice and hearing rights afterward ((a)). A governing-body suspension, allowed only when no one authorized by the peer review body is available, ends automatically unless ratified "within two working days, excluding weekends and holidays" ((b)). |
| Bus. & Prof. Code §§ 809.6–809.9 | Bylaw provisions bind where not inconsistent with §§ 809.1–809.4 and those sections cannot be waived (§ 809.6). Exemptions for state, county and University of California hospitals (§ 809.7). § 1157 is unaffected (§ 809.8). Fee shifting (§ 809.9). |
| Evid. Code § 1157 (as amended by Stats. 2024, ch. 329) | Proceedings and records of organized medical staff committees and peer review bodies responsible for evaluating and improving quality of care are not subject to discovery ((a)). Exceptions in (c)–(e). Nothing about waiver, folders or recipients. |
| Health & Saf. Code § 32155 | A district board may hold privilege hearings and hearings on medical audit or quality assurance committee reports in closed session, unless the member whose privileges are the subject asks for a public hearing. |
| Gov. Code § 54954.5(h) | Agenda wording for closed sessions under § 32155: "HEARINGS", with the subject matter stated. Substantial compliance is the standard. |
| 45 CFR § 60.5 | NPDB reports within 30 days following the action to be reported. |
| 45 CFR § 60.12(a) | Report a professional review action that adversely affects the clinical privileges of a physician or dentist for longer than 30 days, and the acceptance of a surrender while under investigation. Reports on other practitioners are voluntary ((a)(2)). |

## Where the research report differs

- It puts the 14-day rule in § 809.5(b) and says passing 14 days "triggers full § 809.1 notice/hearing rights". The 14 days is in § 805(e) and triggers an 805 report. Hearing rights follow any summary suspension under § 809.5(a).
- It states the two-working-day ratification rule without its condition: it applies only when the governing body suspends because no one authorized by the peer review body is available.
- It says the physician has "at least 30 days" to demand a hearing under § 809.1(b). The statute sets no number. The notice states the time limit; the bylaws set it.
- It says "witness/document discovery locks 30 days prior to hearing" under § 809.2(d), (f). Subdivision (d) is 30 days for document access and (f) is 10 days for witness lists and exhibits, and both are grounds for a continuance, not a cutoff.
- It leaves out § 809.2(h), the 60 days to start the hearing.
- It calls the § 805 period "15 calendar days". The text says "15 days".
- It cites "Cal. AG Op. 15-301" for the § 805.01 deadline. The 15 days is in § 805.01(b). The opinion was not read. It also does not say that § 805.01 is limited to four kinds of conduct after a formal investigation.
- It gives only the $100,000 fine in § 805(k). § 805(l) adds up to $50,000 for other failures.
- It says the NPDB "mandates reporting within 30 days of a summary suspension lasting > 30 days even while internal JRC hearings are still pending". §§ 60.5 and 60.12 have both 30-day figures but do not mention summary suspensions or pending hearings. That comes, if anywhere, from the NPDB Guidebook, which was not read.
- It says commingling committee files into HR or administration folders "waives Evid. Code § 1157 discovery immunity under Santa Rosa Memorial Hospital". § 1157 has no waiver language and the case was not read. The app flags location and recipients and leaves the conclusion to counsel.
- "Judicial Review Committee (JRC)" is not a statutory term. § 809.2(a) speaks of an arbitrator or a panel.
- It does not mention that § 809(b) covers fewer license types than § 805.

## Not checked

- NPDB Guidebook (summary suspensions, what counts as the date of "the action").
- Case law on § 1157, including Santa Rosa Memorial Hospital v. Superior Court.
- Attorney General Opinion 15-301.
- How days are computed and whether a weekend or holiday deadline rolls forward (Code Civ. Proc. §§ 12–12a, Gov. Code § 6800 and following). Which days are "holidays" under § 809.5(b).
- § 805(f)(3) supplemental reports, § 805.5, § 805.8 and the rest of Article 11.
- Whether § 809.7 or any other exemption applies to a district hospital.
- The Brown Act beyond § 54954.5(h), including posting times.
- 42 U.S.C. § 11101 and following (HCQIA) and the rest of 45 CFR Part 60.
- When a proposed action becomes "effective" for § 805(b) while a hearing is pending.

## Not built

- Reading bylaws from an uploaded PDF with a model. Bylaw terms are entered by hand and quote-checked by code.
- The report's document-management folder enforcement and its conflict screen for a named firm. Both are specific to one firm's systems and people; this demo uses no firm data.

## Readings an attorney should confirm

Marked "Our reading" in the app:

- "Within N days after" an event is the event date plus N calendar days.
- Duration counts the first day, so a suspension imposed Nov. 24 is "in effect for a period in excess of 14 days" on Dec. 8.
- § 805(b)(3) is a rolling 12-month window, each calendar day under restriction counts, and the 15 days run from the day the total reaches 30. If a single restriction is imposed for a fixed 30 days or more, the count may run from its first day.
- A summary suspension is counted for the NPDB from the day it was imposed, and each restriction is tested on its own for the "longer than 30 days" rule.
- A resignation date is the date of the "surrender" for 45 CFR § 60.12(a)(1)(ii).
- A hearing date beyond 60 days is flagged even though the bylaws allow 90.
- A committee record is flagged when it sits outside the committee folder or is sent to someone not on the committee, its staff or its counsel. The governing body goes to attorney review.
