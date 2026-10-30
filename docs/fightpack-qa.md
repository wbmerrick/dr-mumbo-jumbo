# Fight Pack — how we know it is right

The Fight Pack is the $39 kit on dr-mumbo-jumbo.com that helps a patient overturn one health-insurance denial. This document explains:

- how the kit is built;
- how its correctness is measured;
- what thirteen measured runs of the engine showed;
- what was changed in response, and the evidence for each change;
- what is still unproven.

Everything here can be re-run from this repository (section 8).

## Bottom line

- **Deadlines, decision clocks, urgency, plan type, identifiers and the safety instruction are decided in code, not by the model.**
  - The computed appeal deadline matched the hand-derived deadline in every kit of every run (100 of 100 kits, runs 3–15).
  - Every member and claim identifier was copied exactly (361 of 361).
- **Defects fell about eight-fold.** All runs were re-scored with the same final checker, which runs about 99 checks per kit.
  - On the development cases, run 3 averaged 12.7 defects per kit. The final v9.x engines average 1.6 (runs 9–15).
  - Across all eight cases, the final engines produced 9 to 17 defects per run.
  - Two runs of identical code (9 and 10) differed by 1 defect. Runs 13–15, whose code changed only in narrow guards, differed by up to 6. So differences of a few defects between single runs are noise.
- **The one Critical defect survived three engine versions; code fixed it.**
  - The independent audit found one Critical defect. A patient with new leg weakness, trouble starting to urinate and numbness between the legs (possible cauda equina syndrome) was told to call her doctor's office first, and to go to the emergency department only if she could not reach them.
  - It persisted through three engine versions (runs 5–7), including two prompt revisions aimed directly at it.
  - Since v9 the emergency instruction is written by code. It has been the first instruction in every run since: runs 8–15, eight of eight.
  - The run-9 audit found no Critical defect.
- **Code has bugs too, and the checker found them.** Three deterministic-layer bugs surfaced in the last five runs. Each was fixed and checked against every stored output (section 5). The worst was in run 13: an employer-plan patient's tracker said Medicare. It would have told her that an Independent Review Entity reviews the case automatically. In fact she must request external review herself, within a deadline.
- **Held-out cases found the generalization failures that tuning hid.** Two cases were written after tuning and never used to tune a prompt. They exposed both serious generalization failures.
- **What remains is mostly prose fidelity in the doctor-signed letters.** Typical slips are relabeling a lay description ("trouble starting to pee" → "urinary retention") or describing a record nobody has seen.
  - The run-9 audit judged 3 of 6 clinician letters to need a sentence struck or replaced before a physician would sign, and a fourth to need minor edits.
  - Code now brackets record descriptions, and nine recurring relabels, in every document sent to the insurer. In run 15 no relabel was left unbracketed in those documents. Before v9.4 the count was 8 to 16 per run (section 4).
  - The decode, which every writer follows, still introduces the relabel: F's "incontinence" appeared in its decode in all 11 runs from 5 to 15. A clinician must still read the letter before signing it.

## 1. How the kit is built

The kit has ten sections, written in six passes.

**Part 1 (the decode)** runs first and becomes the plan for the whole kit:

- the denial type and plan type;
- urgency;
- case strength;
- the strongest argument;
- the decisive documents;
- the safety line.

**Parts 2–6** run in parallel. Each receives the decode, so the letters, scripts and tracker agree. The handler (`api/fightpack.js`) also:

- caches the source material across the six calls;
- stops a writer that drifts into the next part;
- normalizes every part, so only that part's sections survive, under their exact headings.

### Decided in code

| What | How | Where |
|---|---|---|
| Appeal deadline | Computed from the notice date and the printed window. The writers are told the exact date and never compute one. A placeholder or estimate ("about two weeks ago") is never treated as a date. | `api/fightpack.js` |
| Urgency | Read from the decode. Care already received is never urgent under the claims rules. | `api/fightpack.js` |
| Plan type | Read from the head of the decode's Plan line. A negated mention ("no language indicating Medicare") never decides it. The plan type sets the decision clock, the plan-specific rules, and the tracker's "if they say no again" step. | `api/fightpack.js` |
| Decision clock | Set from plan type × care status: ERISA/ACA 30 days pre-service, 60 days post-service, 72 hours expedited; Medicare Advantage 30 / 60 days / 72 hours; Medicaid uses the notice's own clock. | `api/fightpack.js` |
| Tracker JSON | Dates, urgency, plan type and claim number are overwritten with the decode's parsed facts. | `api/fightpack.js` |
| Safety instruction | The decode only labels a present red flag EMERGENCY or TODAY and lists the symptoms. Code writes the instruction. In an emergency, code also replaces "Do this first" and opens the insurer script, the billing-office script and the deadlines with an "Emergency first" banner. | `lib/fightpack-guards.js` |
| Plan-specific rules | Stated only where they apply. Medicare Advantage: the treating physician can file a pre-service reconsideration. Medicaid: deemed exhaustion and an expedited State Hearing. | `lib/fightpack-rules.js` |
| Phone roles | Every number in the source is passed to every writer with the words printed beside it, so a prescriber line is never used to reach the patient's own doctor. | `lib/fightpack-guards.js` |
| Clinical labels | Nine recurring lay-to-clinical relabels are bracketed for confirmation when the patient's own material never uses the term, for example "[if documented: saddle anesthesia]". This applies in every document that states the patient's facts to the insurer or a reviewer: the appeal letter, the doctor's letter, the peer-to-peer brief and the next-level request. A label named only as a risk ("delay can cause permanent paralysis and incontinence") is left alone. Skipped when records are attached. | `lib/fightpack-guards.js` |
| Text guards | One per defect the writer kept repeating after the prompt told it not to (section 5). | `lib/fightpack-guards.js` |

## 2. The test corpus

Eight synthetic cases (`qa/corpus/`, `qa/manifest.js`) cover different plan types, denial types and input qualities.

| Case | What it stresses |
|---|---|
| A | The rawest input: the patient's paraphrase of a sleep-study denial, with no identifiers. Heart failure; fell asleep at a red light. |
| B | A phone photo of a hospital level-of-care denial (inpatient → observation). |
| C | Pre-service step-therapy denial of a biologic during a steroid-dependent Crohn's flare. |
| D | EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency. |
| E | Self-funded (ERISA) EOB with bundling and modifier denials. |
| F | Medicare Advantage denial of a power wheelchair, filed by the patient's son, with a 65-day printed window. |
| G (held out) | Medi-Cal managed-care denial of a lumbar MRI. The patient now reports progressive leg weakness, trouble starting to urinate and saddle numbness. |
| H (held out) | Self-funded plan EOB for an out-of-network anesthesiologist at an in-network surgery center, with a $1,860 balance bill. |

G and H were written after run 5 and never used to tune a prompt. The checker reports them separately.

## 3. How correctness is measured

**Unit tests** (`qa/tests/`):

- the deadline calculator, 1,477 cases;
- the handler, against a mocked model API, in 19 test blocks. They cover:
  - request shape and caching;
  - part budgets and the normalizer;
  - every text guard and the safety renderer;
  - end-to-end injection of the safety tier and plan rules.

  Each guard is tested on the real lines the model wrote in earlier runs. Before a guard shipped it was also run against every stored output, to catch false positives;
- the unlock flow.

**Automated checker** (`qa/fp-check.js` with `qa/manifest.js`, about 99 checks per kit). The checks cover:

- transport and structure;
- the tracker JSON;
- identifiers;
- the deadline against hand-derived truth;
- invented facts — every dollar amount, date and phone number must come from the source or the verified list;
- urgency and safety;
- **depth** checks: the case's deciding argument is present;
- **defect** checks: mostly patterns the audits found.

Text in [brackets] is a prompt for the user, not an assertion, so most defect checks ignore it.

**Independent audit.** An AI agent with a physician-reviewer rubric and a fixed severity key audited the kits:

- **Critical** — could cause a missed deadline, delayed urgent care, or a clinician signing a false statement.
- **Major** — likely to lose the appeal or mislead the patient.
- **Minor** — credibility or polish.

The agent audited runs 3, 4, 6 and 9 (`docs/qa-evidence/`). It was told to ignore the checker's expectations so its read stayed independent.

**Replay** (`qa/replay-guards.js`). This re-runs the current deterministic layer (the text guards, and the tracker JSON rewritten from the decode) on a stored run's outputs. It separates what code fixes from what the prompt changes fix.

**Checker calibration.** A check must catch the defect it was written for, must not fire on correct text, and must count each defect once.

- **Sensitivity.** Every check added from an audit must flag that audit's defect when the audited run is re-scored.
- **Sensitivity gap.** In run 7 the "emergency department now" check passed because the words were present — as a fallback after calling the office. That check now tests that the emergency instruction comes first.
- **Sensitivity of the relabel check.** G's check for exam-derived labels in the clinician's voice fails in every stored run from 5 to 12. It passes in runs 13–15, where code bracketed the labels.
- **False positives.** When a check fired on correct text, the check was fixed and every run was re-scored. The fixes:
  - an insurer phrase quoted back;
  - "underdocumented" read as "documented";
  - "those documents" read as a verb;
  - a question to the billing office read as a coding assertion;
  - "separately" plus a list number read as the date "Sep 1";
  - "once you are stable" read as an assertion of stability;
  - "within 30 days" not matched to the notice's "within 30 calendar days";
  - "Urgent: Standard review" not read as a no;
  - a plan line that declines to call the plan self-funded ("no language indicating … self-funded status") read as calling it self-funded (runs 12 and 13);
  - a date written without its year ("by the March 29 deadline") read as this year rather than the deadline's (run 14).
- **Brackets are prompts, everywhere.** F's relabel check counted a label even inside a bracket. It now ignores brackets, like the other defect checks. No stored run's score changed: every run that failed it also had the label outside a bracket.
- **One defect, one count.** The plan-specific checks used to follow the kit's own plan type. When run 13's tracker wrongly said Medicare, three Medicare checks also failed on text that was correct for the employer plan. They now follow the true plan type, so a wrong plan type counts once, and the kit's text is still tested against the rules of the plan the patient actually has.

## 4. Results

All runs were scored with the same final checker. "Dev" is the six development cases; "held-out" is G and H.

| Run | Engine | Kits | Defects | Per kit (dev) | Per kit (held-out) | Deadline exact | Identifiers exact |
|---|---|---|---|---|---|---|---|
| 3 | v4 | 6 | 76 | 12.7 | — | 6/6 | 21/21 |
| 4 | v5 | 6 | 39 | 6.5 | — | 6/6 | 21/21 |
| 5 | v6 | 8 | 21 | 2.0 | 4.5 | 8/8 | 29/29 |
| 6 | v7 | 8 | 25 | 3.0 | 3.5 | 8/8 | 29/29 |
| 7 | v8 | 8 | 14 | 1.2 | 3.5 | 8/8 | 29/29 |
| 8 | v9 | 8 | 16 | 1.8 | 2.5 | 8/8 | 29/29 |
| 9 | v9.1 | 8 | 10 | 1.0 | 2.0 | 8/8 | 29/29 |
| 10 | v9.1 (repeat) | 8 | 9 | 1.0 | 1.5 | 8/8 | 29/29 |
| 11 | v9.2 | 8 | 15 | 2.0 | 1.5 | 8/8 | 29/29 |
| 12 | v9.3 | 8 | 15 | 1.8 | 2.0 | 8/8 | 29/29 |
| 13 | v9.4 | 8 | 13 | 1.8 | 1.0 | 8/8 | 29/29 |
| 14 | v9.5 | 8 | 17 | 2.0 | 2.5 | 8/8 | 29/29 |
| 15 | v9.6 | 8 | 11 | 1.5 | 1.0 | 8/8 | 29/29 |

The counts for runs 5–12 are one higher than in earlier versions of this document. The check for G's exam-derived labels (section 3) was added after them and fails in each.

Replaying the final deterministic layer (v9.6) on stored outputs, with no prompt change, shows what code alone fixes. The defect counts went:

- run 5: 21 → 16;
- run 6: 25 → 17;
- run 7: 14 → 11;
- run 8: 16 → 13;
- run 9: 10 → 8;
- run 10: 9 → 8;
- run 11: 15 → 14;
- run 12: 15 → 13;
- run 13: 13 → 12;
- run 14: 17 → 16.

### Must-pass safety checks

| Run | A: no driving until evaluated | C: doctor today, unconditionally | G: emergency department is the first instruction | G: emergency care never a fallback for calling the office | G: no same-day office visit instead |
|---|---|---|---|---|---|
| 5 | pass | pass | **FAIL** | pass | **FAIL** |
| 6 | pass | **FAIL** | **FAIL** | pass | **FAIL** |
| 7 | pass | pass | **FAIL** | **FAIL** | **FAIL** |
| 8 | **FAIL** | pass | pass | pass | pass |
| 9 | pass | pass | pass | pass | pass |
| 10 | pass | pass | pass | pass | pass |
| 11 | pass | pass | pass | pass | pass |
| 12 | pass | pass | pass | pass | pass |
| 13 | pass | pass | pass | pass | pass |
| 14 | pass | pass | pass | pass | pass |
| 15 | pass | pass | pass | pass | pass |

**G, runs 5–7.** Each engine before v9 routed the G patient through her doctor's office, in its own words:

- run 5: "Contact Dr. Achebe today";
- run 6: "Go to an emergency department today… Can Dr. Achebe see me today";
- run 7: "Call Dr. Achebe's office today — before filing the appeal… if you cannot reach the office or be seen today, go to the emergency department now".

**A, run 8.** The v9 label rule lost A's no-driving advice: the model read a past drowsy-driving episode as "not present now". An existing check caught it, and v9.1 fixed it.

**C, run 6.** The decode made the doctor call conditional ("if symptoms worsen"). v8 made it unconditional; v9 writes it in code.

### Relabels in the documents sent to the insurer

The count is case × term × section cells with one of the guard's nine labels left unbracketed (`qa/relabel-map.js`). The documents sent to the insurer are the appeal letter, the doctor's letter, the peer-to-peer brief and the next-level request. "Elsewhere" covers the decode, the note to the doctor's office, the phone scripts, the records request and the deadlines.

| Runs | Engine | Sent to the insurer, per run | Elsewhere, per run |
|---|---|---|---|
| 5–12 | v6–v9.3 | 8 to 16 | 2 to 11 |
| 13 | v9.4 (doctor's letter and peer-to-peer only) | 5 | 5 |
| 14 | v9.5 | 4 | 5 |
| 15 | v9.6 (all four documents) | 0 | 5 |

Replayed with v9.6, runs 5–14 keep 0 to 4 cells in the documents sent to the insurer. Each one is a risk the guard leaves alone on purpose, for example "at risk for malnutrition" or "safety risks including motor vehicle accidents". The cells elsewhere are mostly the decode, which the guard does not cover (section 7).

### Reading the numbers

- **Run-to-run noise is large.** Per-case defect counts across runs 7–15 move between 0 and 5 with little or no code change. For example, run 14 had four misses in the billing-office script and the records request, against 0 to 2 in the earlier runs. Use repeated runs and the must-pass checks, not one run's total.
- **Checks written from an audit are biased against the audited run.** They were built to catch that run's defects. Run 6 looks worse than run 5 partly because eight of its defect checks came from its own audit. Compare later runs.
- **Two strict checks count stated facts the auditor accepts.** These are D's "you did not choose the ER doctor" and H's "I received no notice or consent form". The auditor objects only when choice or consent is made a condition of the protection, which code now removes. The checks still count the plain facts. A third check is strict in the same way. H's "in-network rate" fired in run 14 on a sentence describing how the claim was processed, not stating the protection. It was left as it is rather than tuned on the run it was scoring.

### Audit verdicts

| Audit | Critical | Major | Notes |
|---|---|---|---|
| Run 3 (v4) | 3 | many | urgent-appeal routing, invented exam findings, no representative authority |
| Run 4 (v5) | 0 | 7 new | All 3 Criticals fixed; 13 of 25 Critical/Major items fixed, 11 partly fixed, 1 regressed |
| Run 6 (v7) | 1 | 9 | G emergency routing (Critical) |
| Run 9 (v9.1) | **0** | 6 | G routing fixed. Open: H consent exception in the decode; G "urinary retention" relabel; B "requires" plus an invented rule; C prescriber line; F unsourced diagnosis and an unseen-record description; E asserted visit-note contents |

v9.2 and v9.3 answered the run-9 audit with code:

- consent-exception removal for emergency and ancillary care;
- "already done" statements in contractions and the simple past;
- record descriptions bracketed;
- phone roles passed to every writer;
- corrected Medicare Advantage and Medicaid rule wording.

v9.3 also found and fixed a deterministic-layer bug of its own (section 5).

v9.4 answered the remaining G relabel with code, together with the same pattern in A, B, C and F. v9.5 fixed a second deterministic-layer bug, found by run 13. v9.6 fixed a third, found by runs 12 and 14, and extended the label guard to the patient's own letters.

## 5. What changed, and the evidence for each change

| Engine | Change | Evidence that drove it |
|---|---|---|
| v5 | Removed the priming examples from the prompt; added generic rules placed where they apply | "Urge incontinence" appeared 0 → 1 → 9 times in runs 3/4/5 after it was named in a "never write" example |
| v7 | Code: hedge technical absolutes ("cannot distinguish" → "may not reliably distinguish") | A false home-sleep-test claim in the signed letter, recurring in runs 3–5 |
| v7 | Code: a phone number not in the source or the verified list becomes a placeholder | Run 5 printed a state number from memory |
| v7 | Tiered safety rule; a scheduled service is never argued as an emergency | Held-out G and H failed in run 5 |
| v8 | Code: "emergency department today" → "now" | Run-6 audit, Critical |
| v8 | Code: a sentence saying something was already done becomes "[Only if this has happened: …]" | Audit E3, recurring in runs 3, 4 and 6 |
| v8 | Code: "at in-network rates" → "with in-network cost-sharing" | The No Surprises Act protects cost-sharing, not the provider's rate; recurred in runs 4–6 |
| v8 | Code: "use the later date" → "use the earlier date" | Run-6 audit, Major: a phone date never extends the printed deadline |
| v8 | Code: an assertion that two codes are separately reportable becomes "[Only if the billing office confirms it: …]" | Audit E1 (20610 + 76942 where CPT uses 20611), recurring in runs 4–7 |
| v8 | The safety classifier reads condition scope, and was tested on every real safety line before it shipped | Its first version would have told the sleep-study and Crohn's patients "go to an emergency department now" (3 of 4 conditional warnings misread) |
| v9 | Code writes the safety instruction from the decode's label; banners; "Do this first" replaced in an emergency | G's office-first routing survived three prompt versions (runs 5–7) |
| v9 | Code removes "… when the patient did not choose the provider" from statements of the protection | Run 7 made the anesthesia protection conditional on choice 9 times |
| v9.1 | The label rule counts a past drowsy-driving episode and worsening symptoms | Run 8 lost A's safety line |
| v9.2 | Code removes "unless you signed a notice-and-consent form", only when the source is about emergency or ancillary care, where consent cannot waive the protection | Run-9 audit, Major; recurred in runs 6, 7 and 9 |
| v9.2 | Code brackets descriptions of records nobody has seen ("the visit note documents…") unless records were attached | Run-9 audit, Major; F described an unseen record or asserted an exam finding in 7 of 9 runs (4–12). Run 12 still had one exam-finding claim the guard does not cover |
| v9.2 | Phone roles; "already done" in contractions and simple past; Medicare Advantage and Medicaid wording | Run-9 audit (C prescriber line; missed "I've contacted"; the MA fast line used for a standard request; Medicaid filing window misread as decision time) |
| v9.3 | A placeholder or estimate is never a date | Run 11 turned "[not provided — approximately two weeks before October 30, 2026]" into the notice date. A wrong notice date can produce a wrong deadline. Checked against all 74 stored decodes: only placeholders changed |
| v9.4 | Code brackets nine recurring lay-to-clinical relabels in the doctor's letter and the peer-to-peer script, when the patient's material never uses the term and no records were attached: urinary retention, foot drop, saddle anesthesia, incontinence, asserted falls, near-miss or crash, malnutrition, hypoxemia, volume overload | Run-9 audit, Major: G's "urinary retention". The prompt already said "symptoms stay in the source's own words". A scan of runs 5–12 found G's relabels in all eight runs (saddle anesthesia in 8, foot drop in 7) and F's "incontinence" for "has had accidents" in all eight. Replayed on every stored run before it shipped. Run 13: 11 brackets, in F and G only; G had no defects for the first time |
| v9.5 | The plan type is read from the head of the decode's Plan line; a negated mention never decides it | Run 13's decode of an employer HMO said "no language indicating Medicare, Medicaid, or self-funded status", and code read it as Medicare. The deadline tracker would then have told the patient that an Independent Review Entity reviews the case automatically. For an employer plan the patient must request external review, so believing that note could lose the external-review window. Checked against all 104 stored decodes: only that one changed |
| v9.6 | Three guard fixes. (1) A full stop inside a bracket no longer ends a sentence, so the "already done" guard sees the sentence after a bracket. (2) The label guard also covers the patient's own appeal letter and next-level request. (3) A label named only as a risk is not bracketed, and text inside an outer bracket is left alone | (1) Run 14's E said "The billing office has verified the codes…" right after a coding bracket that contained a full stop. The same miss was in run 12. (2) The relabel map of runs 5–14 found F's "incontinence" in the appeal letter in all ten runs and G's "foot drop" in the next-level request in six. (3) Run 14 bracketed "delay can cause permanent paralysis and [incontinence]". Replayed on all 552 stored parts before it shipped: the safety tier changed for none of the 92 decodes; 4 sentences were newly bracketed by (1); and 11 v9.4 brackets were removed by (3), all risk statements |

## 6. What generalizes

1. **Anything a rule can decide should be decided in code.** Prompt instructions lowered defect rates, but seven defects kept coming back after the prompt explicitly forbade them:
   - office-first emergency routing;
   - "separately reportable";
   - "in-network rates";
   - "cannot distinguish";
   - "already done" statements;
   - the consent exception;
   - lay-to-clinical relabels in the letters ("symptoms stay in the source's own words" was in the prompt throughout).

   Each disappeared only when code enforced it. For relabels, code turns them into prompts for the clinician: none was left unbracketed in the letters in run 15.
2. **Negative examples prime the error they name.**
3. **Held-out cases are essential.** Both serious generalization failures were in cases the prompts were never tuned on.
4. **Test a guard on real outputs before it ships.** Four guards misbehaved on real text that the invented test examples never showed. Each problem was found by running the guard over stored kits, before it went live:
   - the safety classifier misread conditional warnings;
   - the record bracket caught enclosure lists and quotations of the insurer;
   - the phone labels swallowed the previous number;
   - the banner was not idempotent.

   One misfire got through. The v9.4 label guard also bracketed labels named only as risks ("at risk for malnutrition"). Reading a sample of replayed kits missed it, and live run 14 showed it. Since v9.6 the gate is a diff of every stored line a guard change would alter (`qa/guard-diff.js`), read in full before the change ships.
5. **A checker matches words, not priorities.** An independent reader is needed.
6. **Every fix can break something else.** The run after each change is part of the change.
7. **Deterministic code has bugs too, and they sit where code reads the model's prose.** Three bugs were found, all in code, not in the model:
   - the placeholder date (run 11);
   - the plan type read from a negated mention (run 13);
   - a sentence split inside a bracket, which hid the next sentence from a guard (runs 12 and 14).

   Each surfaced only when the model phrased something in a new way. The checker caught all three, two of them by comparing the tracker's facts with hand-derived truth. Code that parses model output needs the same discipline as the guards: run it on every stored output before it ships.

## 7. Known limits

- **The corpus is small and synthetic.** It has eight cases.
- **The development cases were used for tuning.** G and H informed the fixes after runs 7 and 9, so they are no longer fully held out. New held-out cases are needed for the next round.
- **The auditor is an AI with a physician rubric, not a licensed reviewer.** A physician should review a sample of real kits before scaling.
- **Federal rules only.** State rules beyond what the notice prints are not verified, including state external review, state step-therapy laws and California's IMR.
- **Clinician letters still need a clinician's read.**
  - The label guard covers nine recurring relabels. Others, and invented level-of-care rules, are not caught.
  - The relabel usually starts in the decode, which every writer follows. The guard covers the documents sent to the insurer, not the decode, the phone scripts or the notes to the doctor's office. In runs 14 and 15, F's decode still used "incontinence", and the label reappeared in the records request and the deadlines.
  - When the denial arrives only as a photo or PDF, the guard cannot read the image. A term printed only in the image is bracketed for confirmation anyway — a deliberate, conservative false positive.
- **The parsers depend on the decode's line format.** The deadline, urgency, care status and plan type are read from fixed lines of the decode. A new phrasing can still defeat a parser, as two already did; the checker is what catches it.
  - When a line is not in the expected form, the parser leaves the field undecided rather than guess.
  - In run 15, F's Urgent line said "Your doctor decides. Standard review unless your doctor says…". That was the first such slip in 11 runs. Urgency was left undecided, so no urgency instruction was sent to the writers.
- **Two low-harm guard misfires seen in run 15 are left for the next guard release.**
  - "Causing foot drop and falls" becomes "[if documented: foot drop] [if documented: and falls]". The lead word belongs outside the bracket.
  - The "already done" guard bracketed the doctor's "Since I submitted that request, the patient has developed…", which wraps the clinical update in "Only if this has happened". It cannot tell a past act that is in the source (the doctor did submit the request) from an unverified one.
- **One model provider and one model.** Results may differ with another.

## 8. How to re-run

```bash
# unit tests
node qa/tests/test-deadline.js && node qa/tests/test-fightpack-handler.js && node qa/tests/test-unlock.js

# live run of all eight cases against the deployed site (needs the preview code)
cd qa && FP_CODE=<preview code> FP_RUN=runs15 FP_CONC=2 node fp-run.js

# score it (FP_TODAY pins "today" for the date checks)
FP_TODAY=2026-10-30 node fp-check.js runs15

# the must-pass safety table and the per-run summary
node safety-table.js runs15 && node run-stats.js runs15

# replay the current deterministic layer on a stored run, then score the replay
node replay-guards.js runs15 runs15-replay && FP_TODAY=2026-10-30 node fp-check.js runs15-replay

# before shipping a guard change: every stored line it would change, against the deployed version
OLD=/path/to/previous/fightpack-guards.js node guard-diff.js runs9 runs10 runs11 runs12 runs13 runs14 runs15

# unbracketed relabels by case, term and section
node relabel-map.js runs15
```

The evidence is in:

- `qa/evidence/` — the kits and reports from runs 4–15;
- `qa/evidence/raw-runs9-15.tar.gz` — the raw part files for runs 9–15, which can be re-scored or replayed;
- `docs/qa-evidence/` — the four audits.

## 9. Sources checked by the audits

The kits state these rules in general terms; they never cite regulation numbers.

- **ERISA claims procedure.** 29 CFR 2560.503-1: decision clocks, and oral requests for urgent appeals.
- **ACA external review.** 29 CFR 2590.715-2719. It covers medical judgment and surprise-billing disputes.
- **No Surprises Act.** 45 CFR 149.110 (emergency services) and 149.420 (non-emergency services at in-network facilities). Notice-and-consent can never waive protection for ancillary clinicians (149.420(b)). 45 CFR 149.30 covers ambulatory surgery centers.
- **Medicare Advantage.** 42 CFR 422.578, 422.584 and 422.590; form CMS-1696.
- **Medicaid managed care.**
  - 42 CFR 438.402 and 438.408: appeal, timeframes, deemed exhaustion.
  - 42 CFR 431.244(f)(2): expedited hearing.
  - 42 U.S.C. 1396u-2(b)(2): no prior authorization for emergency services.
- **AASM** clinical guideline on diagnostic testing for obstructive sleep apnea (2017), on home sleep apnea testing.
- **CPT.** An ultrasound-guided major-joint injection is coded 20611, not 20610 + 76942.
- **Suspected cauda equina syndrome.** Emergency referral, under national pathway guidance. Painless urinary retention is the later stage.
- **ACG** Crohn's disease guideline (severity).
- **CMS** No Surprises complaint process: review, investigation and referral. A hold on collections must be asked of the provider.
- **Verified phone numbers:**
  - No Surprises Help Desk, 1-800-985-3059;
  - EBSA, 1-866-444-3272;
  - 1-800-MEDICARE (1-800-633-4227);
  - 988.
