# Fight Pack automated checks — run "runs14" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**90 pass · 2 fail · 3 warn** · 4033 words · 111 placeholders · wall 53s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ no "plan-preferred equivalent" when the notice names no preferred product
- ❌ never: (audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks — does not monitor

WARN:
- ⚠️ §1 long — 712 words (target 560)
- ⚠️ §5 long — 486 words (target 420)
- ⚠️ §10 long — 309 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**102 pass · 1 fail · 3 warn** · 4220 words · 64 placeholders · wall 78s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never: (audit) never claim a service is available only to inpatients — available only at the inpatient

WARN:
- ⚠️ §1 long — 878 words (target 560)
- ⚠️ §2 long — 505 words (target 500)
- ⚠️ §5 long — 493 words (target 420)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**102 pass · 2 fail · 5 warn** · 4262 words · 47 placeholders · wall 56s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time
- ❌ depth: (audit) the urgent insurer call uses the printed expedited-appeal line — /855-555-0190/ in §6

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — August 1, 2026
- ⚠️ §1 long — 723 words (target 560)
- ⚠️ §5 long — 476 words (target 420)
- ⚠️ §9 long — 407 words (target 400)
- ⚠️ §10 long — 347 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**94 pass · 3 fail · 2 warn** · 3750 words · 39 placeholders · wall 61s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ §8 requests the records and a coded itemized bill
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — You did not choose

WARN:
- ⚠️ §1 long — 668 words (target 560)
- ⚠️ §5 long — 449 words (target 420)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**93 pass · 3 fail · 2 warn** · 3948 words · 35 placeholders · wall 53s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ never: (audit) nothing is written as done that has not happened — billing office has verified

WARN:
- ⚠️ §1 long — 712 words (target 560)
- ⚠️ §10 long — 361 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**104 pass · 2 fail · 5 warn** · 4595 words · 67 placeholders · wall 70s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ §4 has 6–8 bullets — 9
- ❌ never: (audit) "accidents" is a lay description, never a diagnostic label — urinary incontinence

WARN:
- ⚠️ §1 long — 927 words (target 560)
- ⚠️ §2 long — 519 words (target 500)
- ⚠️ §3 long — 661 words (target 520)
- ⚠️ §5 long — 575 words (target 420)
- ⚠️ §10 long — 342 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**103 pass · 1 fail · 5 warn** · 4295 words · 58 placeholders · wall 56s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ depth: the red flags are new, so they need a new exam and documentation — /new (exam|visit|evaluation|request|note)|re-?examin|examine (you|her|him)|updated (note|exam|order)|document(s|ing)? (the )?(new|red[- ]flag)|addendum/ in §1,§3,§4,§10

WARN:
- ⚠️ §1 long — 715 words (target 560)
- ⚠️ §2 long — 506 words (target 500)
- ⚠️ §5 long — 538 words (target 420)
- ⚠️ §6 long — 511 words (target 450)
- ⚠️ §10 long — 307 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**88 pass · 4 fail · 1 warn** · 3498 words · 31 placeholders · wall 49s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ §8 requests the records and a coded itemized bill
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — did not receive a notice-and-consent
- ❌ never: the protection is the patient's in-network cost-sharing, not the provider's payment rate — in-network rate

WARN:
- ⚠️ §1 long — 638 words (target 560)

**TOTAL: 776 pass · 18 fail across 8 cases** (development set 585 pass · 13 fail; held-out 191 pass · 5 fail)

