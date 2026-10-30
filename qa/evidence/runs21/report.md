# Fight Pack automated checks — run "runs21" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**91 pass · 2 fail · 3 warn** · 3909 words · 118 placeholders · wall 51s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ never: (audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks — does not monitor
- ❌ never: (audit) falling asleep at a red light is reported, not upgraded to a near accident — near-miss

WARN:
- ⚠️ §1 long — 752 words (target 560)
- ⚠️ §5 long — 476 words (target 420)
- ⚠️ §10 long — 266 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**102 pass · 2 fail · 5 warn** · 4443 words · 101 placeholders · wall 85s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never: (audit) the letter names the attending but not a specialty — it stays [specialty] — hospitalist
- ❌ never: (audit) never claim a service is available only to inpatients — available only at the inpatient

WARN:
- ⚠️ §1 long — 855 words (target 560)
- ⚠️ §2 long — 546 words (target 500)
- ⚠️ §5 long — 528 words (target 420)
- ⚠️ §6 long — 509 words (target 450)
- ⚠️ §10 long — 294 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**105 pass · 0 fail · 3 warn** · 4319 words · 50 placeholders · wall 64s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 861 words (target 560)
- ⚠️ §5 long — 519 words (target 420)
- ⚠️ §10 long — 344 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**98 pass · 0 fail · 1 warn** · 3455 words · 41 placeholders · wall 47s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

WARN:
- ⚠️ §1 long — 670 words (target 560)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**97 pass · 0 fail · 3 warn** · 3891 words · 39 placeholders · wall 56s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646

WARN:
- ⚠️ §1 long — 884 words (target 560)
- ⚠️ §2 long — 511 words (target 500)
- ⚠️ §10 long — 275 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**102 pass · 3 fail · 5 warn** · 4342 words · 69 placeholders · wall 61s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ §1 decides urgency (Urgent: Yes/No) — Your doctor decides. If shortness of breath, incontinence ep
- ❌ never: (audit) an expedited appeal on an incomplete record is decided on the old record: documents first — expedited review and fax the records today
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment completed September 30, 2026 confirms

WARN:
- ⚠️ §1 long — 744 words (target 560)
- ⚠️ §2 long — 502 words (target 500)
- ⚠️ §3 long — 557 words (target 520)
- ⚠️ §5 long — 493 words (target 420)
- ⚠️ §10 long — 398 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**105 pass · 0 fail · 5 warn** · 4392 words · 73 placeholders · wall 64s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ §1 long — 763 words (target 560)
- ⚠️ §2 long — 525 words (target 500)
- ⚠️ §5 long — 638 words (target 420)
- ⚠️ §6 long — 538 words (target 450)
- ⚠️ §10 long — 283 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**92 pass · 1 fail · 3 warn** · 3369 words · 32 placeholders · wall 50s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials

WARN:
- ⚠️ §1 long — 679 words (target 560)
- ⚠️ §6 long — 490 words (target 450)
- ⚠️ §10 long — 271 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**103 pass · 4 fail · 3 warn** · 3791 words · 52 placeholders · wall 54s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ every coverage-policy number (NCD, LCD) is from the source — National Coverage Determination (NCD) 20.4
- ❌ §7 asks for an itemized statement and an account hold
- ❌ never: (audit2, re-audit I-1) an ambulance claim is always paid on assignment: what he owes never depends on participation, and if Medicare pays he owes only the deductible and 20% coinsurance — non-participating or does not accept assignment, the amount could be higher
- ❌ never: (audit2) the family was told only "very slow": severity words come from the chart, in brackets — unstable

WARN:
- ⚠️ §1 long — 777 words (target 560)
- ⚠️ §8 long — 334 words (target 290)
- ⚠️ §10 long — 296 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**106 pass · 0 fail · 7 warn** · 5007 words · 42 placeholders · wall 89s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026
- ⚠️ §1 long — 962 words (target 560)
- ⚠️ §2 long — 572 words (target 500)
- ⚠️ §3 long — 544 words (target 520)
- ⚠️ §5 long — 684 words (target 420)
- ⚠️ §6 long — 622 words (target 450)
- ⚠️ §10 long — 354 words (target 260)

**TOTAL: 1001 pass · 12 fail across 10 cases** (development set 595 pass · 7 fail; held-out 406 pass · 5 fail)

