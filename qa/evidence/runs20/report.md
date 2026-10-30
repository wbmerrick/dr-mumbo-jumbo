# Fight Pack automated checks — run "runs20" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**92 pass · 1 fail · 4 warn** · 4182 words · 117 placeholders · wall 52s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ every CPT/HCPCS code is from the source — 95810

WARN:
- ⚠️ §1 long — 730 words (target 560)
- ⚠️ §5 long — 488 words (target 420)
- ⚠️ §9 long — 592 words (target 400)
- ⚠️ §10 long — 299 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**103 pass · 1 fail · 3 warn** · 4084 words · 73 placeholders · wall 78s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ §7 asks for an itemized statement and an account hold

WARN:
- ⚠️ §1 long — 824 words (target 560)
- ⚠️ §5 long — 572 words (target 420)
- ⚠️ §10 long — 286 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**105 pass · 0 fail · 4 warn** · 4455 words · 47 placeholders · wall 65s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 850 words (target 560)
- ⚠️ §5 long — 588 words (target 420)
- ⚠️ §9 long — 406 words (target 400)
- ⚠️ §10 long — 336 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**96 pass · 2 fail · 2 warn** · 3703 words · 39 placeholders · wall 50s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — I did not choose

WARN:
- ⚠️ §1 long — 641 words (target 560)
- ⚠️ §10 long — 310 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**94 pass · 3 fail · 2 warn** · 3454 words · 40 placeholders · wall 44s · deadline {"truth":"2027-03-29","served":["2027-03-29"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: (audit) the -25 visit needs its own diagnosis on the claim — /diagnos[ie]s[^.\n]{0,100}(shoulder|visit|line)|shoulder[^.\n]{0,100}diagnos/ in §1,§3,§7

WARN:
- ⚠️ §1 long — 598 words (target 560)
- ⚠️ §10 long — 268 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**105 pass · 2 fail · 6 warn** · 4543 words · 81 placeholders · wall 66s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: (audit) the coverage ladder includes ruling out a scooter — /scooter|\bPOV\b|power-operated/ in §3,§5
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10

WARN:
- ⚠️ §1 long — 909 words (target 560)
- ⚠️ §2 long — 577 words (target 500)
- ⚠️ §3 long — 562 words (target 520)
- ⚠️ §5 long — 576 words (target 420)
- ⚠️ §7 long — 404 words (target 400)
- ⚠️ §10 long — 284 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**105 pass · 0 fail · 6 warn** · 4428 words · 72 placeholders · wall 56s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — October 22, 2026
- ⚠️ §1 long — 765 words (target 560)
- ⚠️ §5 long — 521 words (target 420)
- ⚠️ §6 long — 461 words (target 450)
- ⚠️ §7 long — 425 words (target 400)
- ⚠️ §10 long — 351 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**92 pass · 1 fail · 2 warn** · 3505 words · 34 placeholders · wall 50s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — never received any notice

WARN:
- ⚠️ §1 long — 700 words (target 560)
- ⚠️ §10 long — 265 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**106 pass · 2 fail · 3 warn** · 3597 words · 52 placeholders · wall 60s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ depth: the daughter files for him: the Appointment of Representative form comes first — /CMS-1696|Appointment of Representative/ in §1,§2,§10
- ❌ never: (re-audit I-4; extended 30 Oct 2026 to the provider's own offer, "submit additional documentation or appeal", which the first form missed in runs 16, 18, 20, 21 and 24) the records go to the family and in with the appeal: never sent to Medicare separately, as additional documentation, or as a corrected claim — Will your company submit additional documentation or

WARN:
- ⚠️ §1 long — 717 words (target 560)
- ⚠️ §8 long — 418 words (target 290)
- ⚠️ §10 long — 296 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**105 pass · 1 fail · 6 warn** · 5062 words · 32 placeholders · wall 78s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ never: (audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced — not validated

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026, November 4th
- ⚠️ §1 long — 1094 words (target 560)
- ⚠️ §2 long — 645 words (target 500)
- ⚠️ §5 long — 598 words (target 420)
- ⚠️ §9 long — 482 words (target 400)
- ⚠️ §10 long — 414 words (target 260)

**TOTAL: 1003 pass · 13 fail across 10 cases** (development set 595 pass · 9 fail; held-out 408 pass · 4 fail)

