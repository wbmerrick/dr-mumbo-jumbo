# Fight Pack automated checks — run "runs28" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**92 pass · 1 fail · 4 warn** · 4307 words · 110 placeholders · wall 70s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ no "plan-preferred equivalent" when the notice names no preferred product

WARN:
- ⚠️ §1 long — 758 words (target 560)
- ⚠️ §5 long — 627 words (target 420)
- ⚠️ §6 long — 458 words (target 450)
- ⚠️ §10 long — 315 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**101 pass · 3 fail · 4 warn** · 4251 words · 110 placeholders · wall 82s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never: (audit) the notice says the documentation does not reflect these findings, not that the criteria require them — criteria require "worsening hemodynamic instability
- ❌ never: (audit) the letter names the attending but not a specialty — it stays [specialty] — hospitalist
- ❌ never: (audit) never claim a service is available only to inpatients — available only at inpatient

WARN:
- ⚠️ §1 long — 721 words (target 560)
- ⚠️ §3 long — 596 words (target 520)
- ⚠️ §5 long — 577 words (target 420)
- ⚠️ §10 long — 297 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**103 pass · 2 fail · 6 warn** · 4679 words · 56 placeholders · wall 84s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ depth: (audit) the urgent insurer call uses the printed expedited-appeal line — /855-555-0190/ in §6
- ❌ never: (audit) the notice lists no exceptions — none is attributed to RX-ST-114 — The policy allows exception

WARN:
- ⚠️ §1 long — 885 words (target 560)
- ⚠️ §3 long — 550 words (target 520)
- ⚠️ §5 long — 546 words (target 420)
- ⚠️ §6 long — 457 words (target 450)
- ⚠️ §7 long — 432 words (target 400)
- ⚠️ §10 long — 410 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**98 pass · 0 fail · 2 warn** · 3714 words · 44 placeholders · wall 64s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

WARN:
- ⚠️ §1 long — 662 words (target 560)
- ⚠️ §10 long — 271 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**95 pass · 2 fail · 2 warn** · 3502 words · 32 placeholders · wall 65s · deadline {"truth":"2027-03-29","served":["2027-03-29"]}

FAIL:
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ depth: (audit) the -25 visit needs its own diagnosis on the claim — /diagnos[ie]s[^.\n]{0,100}(shoulder|visit|line)|shoulder[^.\n]{0,100}diagnos/ in §1,§3,§7

WARN:
- ⚠️ §1 long — 694 words (target 560)
- ⚠️ §10 long — 281 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**107 pass · 0 fail · 5 warn** · 4713 words · 86 placeholders · wall 96s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

WARN:
- ⚠️ §1 long — 1018 words (target 560)
- ⚠️ §2 long — 522 words (target 500)
- ⚠️ §3 long — 587 words (target 520)
- ⚠️ §5 long — 703 words (target 420)
- ⚠️ §10 long — 270 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 1 fail · 5 warn** · 4253 words · 51 placeholders · wall 74s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — urinary retention

WARN:
- ⚠️ §1 long — 700 words (target 560)
- ⚠️ §2 long — 506 words (target 500)
- ⚠️ §5 long — 487 words (target 420)
- ⚠️ §6 long — 534 words (target 450)
- ⚠️ §10 long — 325 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**91 pass · 2 fail · 2 warn** · 3233 words · 27 placeholders · wall 57s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ §8 requests the records and a coded itemized bill

WARN:
- ⚠️ §1 long — 614 words (target 560)
- ⚠️ §10 long — 287 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**106 pass · 2 fail · 4 warn** · 3717 words · 49 placeholders · wall 62s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ §3 is in the clinician's voice
- ❌ never: (re-audit I-4; extended 30 Oct 2026 to the provider's own offer, "submit additional documentation or appeal", which the first form missed in runs 16, 18, 20, 21 and 24) the records go to the family and in with the appeal: never sent to Medicare separately, as additional documentation, or as a corrected claim — resubmit the claim

WARN:
- ⚠️ §1 long — 675 words (target 560)
- ⚠️ §2 long — 545 words (target 500)
- ⚠️ §3 long — 607 words (target 520)
- ⚠️ §10 long — 333 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**106 pass · 0 fail · 6 warn** · 4661 words · 40 placeholders · wall 80s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026
- ⚠️ §1 long — 958 words (target 560)
- ⚠️ §2 long — 541 words (target 500)
- ⚠️ §5 long — 509 words (target 420)
- ⚠️ §9 long — 442 words (target 400)
- ⚠️ §10 long — 432 words (target 260)

**TOTAL: 1003 pass · 13 fail across 10 cases** (development set 596 pass · 8 fail; held-out 407 pass · 5 fail)
