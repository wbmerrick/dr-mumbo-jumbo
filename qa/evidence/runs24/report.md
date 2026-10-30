# Fight Pack automated checks — run "runs24" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**93 pass · 0 fail · 3 warn** · 3668 words · 93 placeholders · wall 49s · deadline {"truth":null,"served":[null]}

WARN:
- ⚠️ §1 long — 682 words (target 560)
- ⚠️ §5 long — 441 words (target 420)
- ⚠️ §10 long — 294 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**104 pass · 0 fail · 4 warn** · 4178 words · 74 placeholders · wall 72s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

WARN:
- ⚠️ §1 long — 815 words (target 560)
- ⚠️ §3 long — 532 words (target 520)
- ⚠️ §5 long — 597 words (target 420)
- ⚠️ §10 long — 295 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**104 pass · 1 fail · 5 warn** · 4399 words · 59 placeholders · wall 62s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ depth: (audit) the urgent insurer call uses the printed expedited-appeal line — /855-555-0190/ in §6

WARN:
- ⚠️ §1 long — 808 words (target 560)
- ⚠️ §3 long — 532 words (target 520)
- ⚠️ §5 long — 576 words (target 420)
- ⚠️ §9 long — 412 words (target 400)
- ⚠️ §10 long — 392 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**98 pass · 0 fail · 2 warn** · 3721 words · 37 placeholders · wall 50s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

WARN:
- ⚠️ §1 long — 657 words (target 560)
- ⚠️ §6 long — 489 words (target 450)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**95 pass · 2 fail · 2 warn** · 3683 words · 32 placeholders · wall 54s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00, $646

FAIL:
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ never: (audit) nothing is written as done that has not happened — billing office has confirmed

WARN:
- ⚠️ §1 long — 751 words (target 560)
- ⚠️ §10 long — 299 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**103 pass · 4 fail · 3 warn** · 4245 words · 67 placeholders · wall 54s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ §8 (nothing billed yet) requests the deciding records, not an itemized bill
- ❌ depth: (audit) a record gap is fixed by a new visit or dated addendum, not only a letter — /addendum|new (face-to-face|visit|exam|evaluation|mobility)/ in §1,§3,§4,§10
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment completed on September 30, 2026, likely documents

WARN:
- ⚠️ §1 long — 798 words (target 560)
- ⚠️ §3 long — 547 words (target 520)
- ⚠️ §5 long — 597 words (target 420)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**105 pass · 0 fail · 5 warn** · 4142 words · 54 placeholders · wall 58s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ §1 long — 804 words (target 560)
- ⚠️ §2 long — 501 words (target 500)
- ⚠️ §5 long — 498 words (target 420)
- ⚠️ §6 long — 483 words (target 450)
- ⚠️ §10 long — 300 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**92 pass · 1 fail · 2 warn** · 3269 words · 36 placeholders · wall 45s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials

WARN:
- ⚠️ §1 long — 608 words (target 560)
- ⚠️ §10 long — 281 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**104 pass · 4 fail · 3 warn** · 3774 words · 51 placeholders · wall 50s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ §8 requests the records and a coded itemized bill
- ❌ depth: the transport went to the closest hospital — /closest|nearest/ in §2,§3
- ❌ never: (re-audit I-4; extended 30 Oct 2026 to the provider's own offer, "submit additional documentation or appeal", which the first form missed in runs 16, 18, 20, 21 and 24) the records go to the family and in with the appeal: never sent to Medicare separately, as additional documentation, or as a corrected claim — or submit additional documentation

WARN:
- ⚠️ §1 long — 785 words (target 560)
- ⚠️ §2 long — 534 words (target 500)
- ⚠️ §10 long — 406 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**106 pass · 0 fail · 8 warn** · 4989 words · 41 placeholders · wall 76s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, November 4, 2026
- ⚠️ §1 long — 959 words (target 560)
- ⚠️ §2 long — 624 words (target 500)
- ⚠️ §3 long — 551 words (target 520)
- ⚠️ §5 long — 612 words (target 420)
- ⚠️ §6 long — 503 words (target 450)
- ⚠️ §9 long — 456 words (target 400)
- ⚠️ §10 long — 365 words (target 260)

**TOTAL: 1004 pass · 12 fail across 10 cases** (development set 597 pass · 7 fail; held-out 407 pass · 5 fail)

