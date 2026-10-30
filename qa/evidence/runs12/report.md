# Fight Pack automated checks — run "runs12" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**89 pass · 3 fail · 2 warn** · 3717 words · 109 placeholders · wall 52s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ never asserts a stability nobody reported — - **"The patient is stable enough for home testing":** T
- ❌ never: (audit) falling asleep at a red light is reported, not upgraded to a near accident — near-miss
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 674 words (target 560)
- ⚠️ §10 long — 337 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**103 pass · 0 fail · 4 warn** · 4470 words · 59 placeholders · wall 88s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

WARN:
- ⚠️ §1 long — 861 words (target 560)
- ⚠️ §5 long — 567 words (target 420)
- ⚠️ §6 long — 459 words (target 450)
- ⚠️ §10 long — 398 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**101 pass · 3 fail · 5 warn** · 4231 words · 53 placeholders · wall 59s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time
- ❌ depth: (audit) the urgent insurer call uses the printed expedited-appeal line — /855-555-0190/ in §6
- ❌ never: (audit) the notice lists no exceptions — none is attributed to RX-ST-114 — the policy itself allows exception

WARN:
- ⚠️ §1 long — 786 words (target 560)
- ⚠️ §3 long — 522 words (target 520)
- ⚠️ §5 long — 477 words (target 420)
- ⚠️ §9 long — 421 words (target 400)
- ⚠️ §10 long — 311 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**96 pass · 1 fail · 2 warn** · 3823 words · 41 placeholders · wall 54s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — I did not choose

WARN:
- ⚠️ §1 long — 662 words (target 560)
- ⚠️ §10 long — 275 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**93 pass · 3 fail · 1 warn** · 3844 words · 28 placeholders · wall 56s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00, $646

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ never: (audit) nothing is written as done that has not happened — billing office has verified

WARN:
- ⚠️ §1 long — 773 words (target 560)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**104 pass · 2 fail · 6 warn** · 4492 words · 56 placeholders · wall 60s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ never: (audit) the family reported "accidents"; never upgraded to documented incontinence — documented incontinence
- ❌ never: (audit) no exam findings asserted in the clinician's voice — demonstrated safe

WARN:
- ⚠️ §1 long — 890 words (target 560)
- ⚠️ §2 long — 549 words (target 500)
- ⚠️ §3 long — 605 words (target 520)
- ⚠️ §5 long — 474 words (target 420)
- ⚠️ §8 long — 292 words (target 290)
- ⚠️ §10 long — 280 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**102 pass · 2 fail · 2 warn** · 3921 words · 47 placeholders · wall 51s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ no "plan-preferred equivalent" when the notice names no preferred product
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — causing falls

WARN:
- ⚠️ §1 long — 746 words (target 560)
- ⚠️ §10 long — 273 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**90 pass · 2 fail · 0 warn** · 3373 words · 35 placeholders · wall 45s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — did not receive or sign any notice-and-consent

**TOTAL: 778 pass · 16 fail across 8 cases** (development set 586 pass · 12 fail; held-out 192 pass · 4 fail)

