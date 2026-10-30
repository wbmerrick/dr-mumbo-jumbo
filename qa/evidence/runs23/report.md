# Fight Pack automated checks — run "runs23" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**93 pass · 0 fail · 3 warn** · 3982 words · 114 placeholders · wall 55s · deadline {"truth":null,"served":[null]}

WARN:
- ⚠️ §1 long — 752 words (target 560)
- ⚠️ §5 long — 520 words (target 420)
- ⚠️ §10 long — 281 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**104 pass · 0 fail · 5 warn** · 4448 words · 77 placeholders · wall 78s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

WARN:
- ⚠️ §1 long — 938 words (target 560)
- ⚠️ §2 long — 541 words (target 500)
- ⚠️ §3 long — 544 words (target 520)
- ⚠️ §5 long — 537 words (target 420)
- ⚠️ §10 long — 286 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**105 pass · 0 fail · 5 warn** · 4624 words · 47 placeholders · wall 72s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 959 words (target 560)
- ⚠️ §2 long — 501 words (target 500)
- ⚠️ §5 long — 604 words (target 420)
- ⚠️ §6 long — 458 words (target 450)
- ⚠️ §10 long — 411 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**96 pass · 2 fail · 3 warn** · 3868 words · 40 placeholders · wall 55s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6
- ❌ never: (audit) the balance-billing protection is standing, not only while disputed — balance-bill you while

WARN:
- ⚠️ §1 long — 616 words (target 560)
- ⚠️ §5 long — 474 words (target 420)
- ⚠️ §6 long — 471 words (target 450)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**97 pass · 0 fail · 2 warn** · 3656 words · 37 placeholders · wall 47s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00, $646

WARN:
- ⚠️ §1 long — 764 words (target 560)
- ⚠️ §10 long — 324 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**107 pass · 0 fail · 6 warn** · 4536 words · 80 placeholders · wall 56s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

WARN:
- ⚠️ §1 long — 831 words (target 560)
- ⚠️ §3 long — 595 words (target 520)
- ⚠️ §5 long — 519 words (target 420)
- ⚠️ §7 long — 412 words (target 400)
- ⚠️ §8 long — 344 words (target 290)
- ⚠️ §10 long — 373 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 1 fail · 4 warn** · 4024 words · 56 placeholders · wall 59s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ every claim/member/reference number is from the source — 944243, 9-17-37, 94244-2430

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — October 20, 2026
- ⚠️ §1 long — 702 words (target 560)
- ⚠️ §5 long — 461 words (target 420)
- ⚠️ §10 long — 359 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**89 pass · 4 fail · 2 warn** · 3271 words · 36 placeholders · wall 43s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ appeal letter states no decision timeframe the denial letter did not print — within 60 days
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: the $1,860 balance bill is not owed — /do not pay|don't pay|should not pay|shouldn't pay|not pay the/ in §1,§7
- ❌ never: a scheduled surgery is not an emergency, so no emergency argument — prudent

WARN:
- ⚠️ §1 long — 583 words (target 560)
- ⚠️ §10 long — 275 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**106 pass · 2 fail · 3 warn** · 3789 words · 50 placeholders · wall 51s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ §5 maps criteria and prepares for push-back
- ❌ never: (re-audit I-4; extended 30 Oct 2026 to the provider's own offer, "submit additional documentation or appeal", which the first form missed in runs 16, 18, 20, 21 and 24) the records go to the family and in with the appeal: never sent to Medicare separately, as additional documentation, or as a corrected claim — ask the ambulance company and the hospital to submit them to Medicare

WARN:
- ⚠️ §1 long — 778 words (target 560)
- ⚠️ §2 long — 565 words (target 500)
- ⚠️ §10 long — 296 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**105 pass · 1 fail · 8 warn** · 5250 words · 46 placeholders · wall 78s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ never: the letter says the plan is insured and regulated by the state insurance department — Department of Labor

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026, November 4th
- ⚠️ §1 long — 1024 words (target 560)
- ⚠️ §2 long — 603 words (target 500)
- ⚠️ §3 long — 534 words (target 520)
- ⚠️ §5 long — 638 words (target 420)
- ⚠️ §6 long — 541 words (target 450)
- ⚠️ §9 long — 575 words (target 400)
- ⚠️ §10 long — 348 words (target 260)

**TOTAL: 1006 pass · 10 fail across 10 cases** (development set 602 pass · 2 fail; held-out 404 pass · 8 fail)

