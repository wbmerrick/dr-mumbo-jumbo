# Fight Pack automated checks — run "runs8" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**91 pass · 2 fail · 2 warn** · 3552 words · 90 placeholders · wall 44s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ depth: (audit) safety line: no drowsy driving until evaluated — /(do not|don't|avoid|no|stop) driv/ in §1
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §5 long — 440 words (target 420)
- ⚠️ §10 long — 295 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**101 pass · 3 fail · 3 warn** · 4131 words · 65 placeholders · wall 74s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ never: DRG label "heart failure & shock" is a billing category, not a diagnosis of shock — shock
- ❌ never: (audit) never claim a service is available only to inpatients — available only at the inpatient

WARN:
- ⚠️ §1 long — 763 words (target 560)
- ⚠️ §5 long — 514 words (target 420)
- ⚠️ §10 long — 331 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**103 pass · 2 fail · 6 warn** · 4444 words · 49 placeholders · wall 63s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time
- ❌ depth: (audit) an urgent specialty-drug case asks the office about a bridge supply — /bridge/ in §7

WARN:
- ⚠️ §1 long — 718 words (target 560)
- ⚠️ §3 long — 525 words (target 520)
- ⚠️ §5 long — 550 words (target 420)
- ⚠️ §6 long — 505 words (target 450)
- ⚠️ §9 long — 406 words (target 400)
- ⚠️ §10 long — 359 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**97 pass · 1 fail · 4 warn** · 3744 words · 40 placeholders · wall 64s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — You did not choose

WARN:
- ⚠️ §1 long — 574 words (target 560)
- ⚠️ §5 long — 431 words (target 420)
- ⚠️ §6 long — 476 words (target 450)
- ⚠️ §10 long — 286 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**96 pass · 1 fail · 1 warn** · 3719 words · 30 placeholders · wall 55s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00, $646

FAIL:
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7

WARN:
- ⚠️ §1 long — 685 words (target 560)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**104 pass · 3 fail · 5 warn** · 4244 words · 71 placeholders · wall 56s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ §8 (nothing billed yet) requests the deciding records, not an itemized bill
- ❌ never: (audit) "accidents" is a lay description, never a diagnostic label — urinary incontinence
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment documents

WARN:
- ⚠️ §1 long — 712 words (target 560)
- ⚠️ §2 long — 608 words (target 500)
- ⚠️ §5 long — 487 words (target 420)
- ⚠️ §6 long — 482 words (target 450)
- ⚠️ §10 long — 318 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**102 pass · 3 fail · 4 warn** · 4138 words · 57 placeholders · wall 63s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ cross-references point at the right section — t or appeal letter documenting the new neurological symptoms → section 4
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — urinary retention

WARN:
- ⚠️ §1 long — 715 words (target 560)
- ⚠️ §5 long — 553 words (target 420)
- ⚠️ §6 long — 549 words (target 450)
- ⚠️ §10 long — 263 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**91 pass · 2 fail · 2 warn** · 3650 words · 39 placeholders · wall 54s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ §7 asks for an itemized statement and an account hold

WARN:
- ⚠️ §1 long — 602 words (target 560)
- ⚠️ §5 long — 459 words (target 420)

**TOTAL: 785 pass · 17 fail across 8 cases** (development set 592 pass · 12 fail; held-out 193 pass · 5 fail)

