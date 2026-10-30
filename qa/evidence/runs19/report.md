# Fight Pack automated checks — run "runs19" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**91 pass · 2 fail · 3 warn** · 3909 words · 111 placeholders · wall 50s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ never: (audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks — does not monitor
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 668 words (target 560)
- ⚠️ §5 long — 484 words (target 420)
- ⚠️ §10 long — 266 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**101 pass · 3 fail · 5 warn** · 4667 words · 71 placeholders · wall 84s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ part 1 stopped naturally — max_tokens
- ❌ never: DRG label "heart failure & shock" is a billing category, not a diagnosis of shock — shock
- ❌ never: (audit) never claim a service is available only to inpatients — available only at the inpatient

WARN:
- ⚠️ §1 long — 1013 words (target 560)
- ⚠️ §2 long — 519 words (target 500)
- ⚠️ §3 long — 571 words (target 520)
- ⚠️ §5 long — 610 words (target 420)
- ⚠️ §10 long — 376 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**105 pass · 0 fail · 5 warn** · 4352 words · 47 placeholders · wall 61s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 809 words (target 560)
- ⚠️ §3 long — 534 words (target 520)
- ⚠️ §5 long — 524 words (target 420)
- ⚠️ §9 long — 412 words (target 400)
- ⚠️ §10 long — 337 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**96 pass · 2 fail · 3 warn** · 3919 words · 41 placeholders · wall 66s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) the balance-billing protection is standing, not only while disputed — balance bill me while
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — you could not choose

WARN:
- ⚠️ §1 long — 634 words (target 560)
- ⚠️ §5 long — 474 words (target 420)
- ⚠️ §6 long — 600 words (target 450)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**94 pass · 3 fail · 2 warn** · 3856 words · 36 placeholders · wall 65s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00, $646

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ never: (audit) nothing is written as done that has not happened — billing office has verified

WARN:
- ⚠️ §1 long — 794 words (target 560)
- ⚠️ §10 long — 302 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**105 pass · 2 fail · 5 warn** · 4226 words · 77 placeholders · wall 64s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ never asserts a stability nobody reported — n provided, and the context describes a stable chronic condition, though you
- ❌ depth: (audit) the coverage ladder includes ruling out a scooter — /scooter|\bPOV\b|power-operated/ in §3,§5

WARN:
- ⚠️ §1 long — 802 words (target 560)
- ⚠️ §3 long — 574 words (target 520)
- ⚠️ §5 long — 553 words (target 420)
- ⚠️ §7 long — 407 words (target 400)
- ⚠️ §10 long — 300 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 1 fail · 3 warn** · 4249 words · 64 placeholders · wall 60s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ every claim/member/reference number is from the source — 944243, 9-17-37, 94244-2430

WARN:
- ⚠️ §1 long — 812 words (target 560)
- ⚠️ §5 long — 460 words (target 420)
- ⚠️ §10 long — 304 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**92 pass · 1 fail · 2 warn** · 3571 words · 31 placeholders · wall 50s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials

WARN:
- ⚠️ §1 long — 726 words (target 560)
- ⚠️ §6 long — 453 words (target 450)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**105 pass · 3 fail · 3 warn** · 3767 words · 51 placeholders · wall 68s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ depth: the transport went to the closest hospital — /closest|nearest/ in §2,§3
- ❌ never: (re-audit I-4) the records go to the family and in with the appeal: never sent to Medicare separately, as additional documentation, or as a corrected claim — corrected claim
- ❌ never: (audit2) the test is that other transport was contraindicated; "not validated" garbles it — not validated

WARN:
- ⚠️ §1 long — 786 words (target 560)
- ⚠️ §2 long — 521 words (target 500)
- ⚠️ §10 long — 313 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**101 pass · 5 fail · 8 warn** · 4890 words · 42 placeholders · wall 70s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ §8 (nothing billed yet) requests the deciding records, not an itemized bill
- ❌ depth: in an urgent case the doctor can request the expedited appeal directly — /(doctor|physician|Dr\.? Vasquez)[^.\n]{0,100}(can|may|should|will) (call|request|file|ask)/ in §1,§4,§6,§10
- ❌ never: the letter says the plan is insured and regulated by the state insurance department — EBSA
- ❌ never: (audit2) nothing has been billed: the exposure is going to Lakeshore without approval, not a hospital bill — hold the account
- ❌ never: (audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced — not validated

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — 11/4/2026, November 4, 2026, October 29, 2026
- ⚠️ §1 long — 889 words (target 560)
- ⚠️ §2 long — 508 words (target 500)
- ⚠️ §3 long — 566 words (target 520)
- ⚠️ §5 long — 548 words (target 420)
- ⚠️ §6 long — 472 words (target 450)
- ⚠️ §9 long — 496 words (target 400)
- ⚠️ §10 long — 451 words (target 260)

**TOTAL: 994 pass · 22 fail across 10 cases** (development set 592 pass · 12 fail; held-out 402 pass · 10 fail)

