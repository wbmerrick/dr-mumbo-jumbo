# Fight Pack automated checks — run "runs13" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**90 pass · 2 fail · 2 warn** · 3804 words · 116 placeholders · wall 52s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ never asserts a stability nobody reported — ut the source describes a long-standing stable condition without evidence of
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 711 words (target 560)
- ⚠️ §10 long — 324 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**101 pass · 2 fail · 5 warn** · 4632 words · 73 placeholders · wall 89s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never asserts a stability nobody reported — afe after 24 hours, or how my  []  were stable enough for a lower level of c
- ❌ never: DRG label "heart failure & shock" is a billing category, not a diagnosis of shock — shock

WARN:
- ⚠️ §1 long — 874 words (target 560)
- ⚠️ §3 long — 546 words (target 520)
- ⚠️ §5 long — 782 words (target 420)
- ⚠️ §6 long — 483 words (target 450)
- ⚠️ §10 long — 282 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**102 pass · 1 fail · 3 warn** · 4092 words · 37 placeholders · wall 60s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ never asserts a stability nobody reported — mergency department now. Once medically stable, work with the doctor's offic

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 19, 2026
- ⚠️ §1 long — 735 words (target 560)
- ⚠️ §5 long — 522 words (target 420)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**95 pass · 2 fail · 2 warn** · 3571 words · 35 placeholders · wall 56s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ json plan_type = ["commercial"] — "medicare"
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — you did not choose

WARN:
- ⚠️ §1 long — 620 words (target 560)
- ⚠️ §10 long — 284 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**93 pass · 3 fail · 3 warn** · 4135 words · 30 placeholders · wall 68s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00, $646

FAIL:
- ❌ no pending step written as already done — office is submitting
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ §7 asks for an itemized statement and an account hold

WARN:
- ⚠️ §1 long — 807 words (target 560)
- ⚠️ §9 long — 438 words (target 400)
- ⚠️ §10 long — 445 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**105 pass · 1 fail · 4 warn** · 4665 words · 61 placeholders · wall 64s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: (audit) the coverage ladder includes ruling out a scooter — /scooter|\bPOV\b|power-operated/ in §3,§5

WARN:
- ⚠️ §1 long — 788 words (target 560)
- ⚠️ §3 long — 637 words (target 520)
- ⚠️ §5 long — 613 words (target 420)
- ⚠️ §10 long — 463 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 0 fail · 4 warn** · 4379 words · 63 placeholders · wall 69s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ §1 long — 743 words (target 560)
- ⚠️ §5 long — 527 words (target 420)
- ⚠️ §6 long — 525 words (target 450)
- ⚠️ §10 long — 319 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**90 pass · 2 fail · 2 warn** · 3198 words · 29 placeholders · wall 44s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ §2 preserves the next level of review

WARN:
- ⚠️ §1 long — 583 words (target 560)
- ⚠️ §10 long — 299 words (target 260)

**TOTAL: 780 pass · 13 fail across 8 cases** (development set 586 pass · 11 fail; held-out 194 pass · 2 fail)
