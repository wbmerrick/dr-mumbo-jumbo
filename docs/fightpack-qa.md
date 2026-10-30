# Fight Pack — how we know it is right

The Fight Pack is the $39 kit on dr-mumbo-jumbo.com that helps a patient overturn one health-insurance denial. This document explains:

- how the kit is built;
- how its correctness is measured;
- what ten measured runs of the engine showed;
- what was changed in response, and the evidence for each change;
- what is still unproven.

Everything here can be re-run from this repository (section 8).

## Bottom line

- **Deadlines, decision clocks, urgency, identifiers and the safety instruction are decided in code, not by the model.**
  - The computed appeal deadline matched the hand-derived deadline in every kit of every run (76 of 76 kits, runs 3–12).
  - Every member and claim identifier was copied exactly (274 of 274).
- **Defects fell about eight-fold.** All runs were re-scored with the same final checker, which runs about 99 checks per kit.
  - On the development cases, run 3 averaged 12.7 defects per kit. The final v9.x engines average 1.5 (runs 9–12).
  - Across all eight cases, the final engines produced 8 to 15 defects per run.
  - Two runs of identical code (9 and 10) differed by 1 defect. Runs of nearly identical code (10–12) differed by up to 7. So differences of a few defects between single runs are noise.
- **The one Critical defect survived three engine versions; code fixed it.**
  - The independent audit found one Critical defect. A patient with new leg weakness, trouble starting to urinate and numbness between the legs (possible cauda equina syndrome) was told to call her doctor's office first, and to go to the emergency department only if she could not reach them.
  - It persisted through three engine versions (runs 5–7), including two prompt revisions aimed directly at it.
  - Since v9 the emergency instruction is written by code. It has been the first instruction in every run since: runs 8–12, five of five.
  - The run-9 audit found no Critical defect.
- **Held-out cases found the generalization failures that tuning hid.** Two cases were written after tuning and never used to tune a prompt. They exposed both serious generalization failures.
- **What remains is mostly prose fidelity in the doctor-signed letters.** Typical slips are relabeling a lay description ("trouble starting to pee" → "urinary retention") or describing a record nobody has seen.
  - The run-9 audit judged 3 of 6 clinician letters to need a sentence struck or replaced before a physician would sign, and a fourth to need minor edits.
  - Code now brackets record descriptions for the clinician to confirm.
  - A clinician must still read the letter before signing it.

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
| Decision clock | Set from plan type × care status: ERISA/ACA 30 days pre-service, 60 days post-service, 72 hours expedited; Medicare Advantage 30 / 60 days / 72 hours; Medicaid uses the notice's own clock. | `api/fightpack.js` |
| Tracker JSON | Dates, urgency, plan type and claim number are overwritten with the decode's parsed facts. | `api/fightpack.js` |
| Safety instruction | The decode only labels a present red flag EMERGENCY or TODAY and lists the symptoms. Code writes the instruction. In an emergency, code also replaces "Do this first" and opens the insurer script, the billing-office script and the deadlines with an "Emergency first" banner. | `lib/fightpack-guards.js` |
| Plan-specific rules | Stated only where they apply. Medicare Advantage: the treating physician can file a pre-service reconsideration. Medicaid: deemed exhaustion and an expedited State Hearing. | `lib/fightpack-rules.js` |
| Phone roles | Every number in the source is passed to every writer with the words printed beside it, so a prescriber line is never used to reach the patient's own doctor. | `lib/fightpack-guards.js` |
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
- the handler, against a mocked model API, in 16 test blocks. They cover:
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

**Replay** (`qa/replay-guards.js`). This re-runs the current code guards on a stored run's outputs. It separates what the deterministic layer fixes from what the prompt changes fix.

**Checker calibration** works in two directions.

- **Sensitivity.** Every check added from an audit must flag that audit's defect when the audited run is re-scored.
- **False positives.** When a check fired on correct text, the check was fixed and every run was re-scored. The fixes:
  - an insurer phrase quoted back;
  - "underdocumented" read as "documented";
  - "those documents" read as a verb;
  - a question to the billing office read as a coding assertion;
  - "separately" plus a list number read as the date "Sep 1";
  - "once you are stable" read as an assertion of stability;
  - "within 30 days" not matched to the notice's "within 30 calendar days";
  - "Urgent: Standard review" not read as a no.
- **Sensitivity gap.** In run 7 the "emergency department now" check passed because the words were present — as a fallback after calling the office. That check now tests that the emergency instruction comes first.

## 4. Results

All runs were scored with the same final checker. "Dev" is the six development cases; "held-out" is G and H.

| Run | Engine | Kits | Defects | Per kit (dev) | Per kit (held-out) | Deadline exact | Identifiers exact |
|---|---|---|---|---|---|---|---|
| 3 | v4 | 6 | 76 | 12.7 | — | 6/6 | 21/21 |
| 4 | v5 | 6 | 39 | 6.5 | — | 6/6 | 21/21 |
| 5 | v6 | 8 | 20 | 2.0 | 4.0 | 8/8 | 29/29 |
| 6 | v7 | 8 | 24 | 3.0 | 3.0 | 8/8 | 29/29 |
| 7 | v8 | 8 | 13 | 1.2 | 3.0 | 8/8 | 29/29 |
| 8 | v9 | 8 | 15 | 1.8 | 2.0 | 8/8 | 29/29 |
| 9 | v9.1 | 8 | 9 | 1.0 | 1.5 | 8/8 | 29/29 |
| 10 | v9.1 (repeat) | 8 | 8 | 1.0 | 1.0 | 8/8 | 29/29 |
| 11 | v9.2 | 8 | 14 | 2.0 | 1.0 | 8/8 | 29/29 |
| 12 | v9.3 | 8 | 15 | 2.0 | 1.5 | 8/8 | 29/29 |

Replaying the final code guards on stored outputs, with no prompt change, shows what code alone fixes. The defect counts went:

- run 6: 24 → 18;
- run 7: 13 → 11;
- run 8: 15 → 14;
- run 9: 9 → 8.

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

**G, runs 5–7.** Each engine before v9 routed the G patient through her doctor's office, in its own words:

- run 5: "Contact Dr. Achebe today";
- run 6: "Go to an emergency department today… Can Dr. Achebe see me today";
- run 7: "Call Dr. Achebe's office today — before filing the appeal… if you cannot reach the office or be seen today, go to the emergency department now".

**A, run 8.** The v9 label rule lost A's no-driving advice: the model read a past drowsy-driving episode as "not present now". An existing check caught it, and v9.1 fixed it.

**C, run 6.** The decode made the doctor call conditional ("if symptoms worsen"). v8 made it unconditional; v9 writes it in code.

### Reading the numbers

- **Run-to-run noise is large.** Per-case defect counts across runs 7–11 move between 0 and 4 with little or no code change. Use repeated runs and the must-pass checks, not one run's total.
- **Checks written from an audit are biased against the audited run.** They were built to catch that run's defects. Run 6 looks worse than run 5 partly because eight of its defect checks came from its own audit. Compare later runs.
- **Two strict checks count stated facts the auditor accepts.** These are D's "you did not choose the ER doctor" and H's "I received no notice or consent form". The auditor objects only when choice or consent is made a condition of the protection, which code now removes. The checks still count the plain facts.

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

## 6. What generalizes

1. **Anything a rule can decide should be decided in code.** Prompt instructions lowered defect rates, but six defects kept coming back after the prompt explicitly forbade them:
   - office-first emergency routing;
   - "separately reportable";
   - "in-network rates";
   - "cannot distinguish";
   - "already done" statements;
   - the consent exception.

   Each disappeared only when code enforced it.
2. **Negative examples prime the error they name.**
3. **Held-out cases are essential.** Both serious generalization failures were in cases the prompts were never tuned on.
4. **Test a guard on real outputs before it ships.** Four guards misbehaved on real text that the invented test examples never showed. Each problem was found by running the guard over stored kits, before it went live:
   - the safety classifier misread conditional warnings;
   - the record bracket caught enclosure lists and quotations of the insurer;
   - the phone labels swallowed the previous number;
   - the banner was not idempotent.
5. **A checker matches words, not priorities.** An independent reader is needed.
6. **Every fix can break something else.** The run after each change is part of the change.
7. **Deterministic code has bugs too.** The placeholder-date bug was in code, not in the model. It surfaced only when the model phrased a placeholder in a new way. The checker caught it because it compares the tracker's facts with hand-derived truth.

## 7. Known limits

- **The corpus is small and synthetic.** It has eight cases.
- **The development cases were used for tuning.** G and H informed the fixes after runs 7 and 9, so they are no longer fully held out. New held-out cases are needed for the next round.
- **The auditor is an AI with a physician rubric, not a licensed reviewer.** A physician should review a sample of real kits before scaling.
- **Federal rules only.** State rules beyond what the notice prints are not verified, including state external review, state step-therapy laws and California's IMR.
- **Clinician letters still need a clinician's read.** Lay-to-clinical relabeling and invented level-of-care rules are prompt-level behaviors that code cannot fully catch.
- **One model provider and one model.** Results may differ with another.

## 8. How to re-run

```bash
# unit tests
node qa/tests/test-deadline.js && node qa/tests/test-fightpack-handler.js && node qa/tests/test-unlock.js

# live run of all eight cases against the deployed site (needs the preview code)
cd qa && FP_CODE=<preview code> FP_RUN=runs13 FP_CONC=2 node fp-run.js

# score it (FP_TODAY pins "today" for the date checks)
FP_TODAY=2026-10-30 node fp-check.js runs13

# the must-pass safety table and the per-run summary
node safety-table.js runs13 && node run-stats.js runs13

# replay the current code guards on a stored run, then score the replay
node replay-guards.js runs13 runs13-replay && node fp-check.js runs13-replay
```

The evidence is in:

- `qa/evidence/` — the kits and reports from runs 4–12;
- `qa/evidence/raw-runs9-12.tar.gz` — the raw part files for runs 9–12, which can be re-scored;
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
