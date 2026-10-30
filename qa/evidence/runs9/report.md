# Fight Pack automated checks — run "runs9" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**92 pass · 0 fail · 3 warn** · 3834 words · 102 placeholders · wall 52s · deadline {"truth":null,"served":[null]}

WARN:
- ⚠️ §1 long — 650 words (target 560)
- ⚠️ §5 long — 432 words (target 420)
- ⚠️ §10 long — 325 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**103 pass · 0 fail · 3 warn** · 4437 words · 51 placeholders · wall 73s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

WARN:
- ⚠️ §1 long — 924 words (target 560)
- ⚠️ §5 long — 540 words (target 420)
- ⚠️ §10 long — 341 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**104 pass · 0 fail · 4 warn** · 4283 words · 49 placeholders · wall 65s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 742 words (target 560)
- ⚠️ §5 long — 573 words (target 420)
- ⚠️ §6 long — 478 words (target 450)
- ⚠️ §10 long — 305 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**95 pass · 2 fail · 1 warn** · 3486 words · 33 placeholders · wall 52s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) the balance-billing protection is standing, not only while disputed — balance bill while
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — You did not choose

WARN:
- ⚠️ §1 long — 642 words (target 560)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**94 pass · 2 fail · 3 warn** · 3520 words · 24 placeholders · wall 48s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646, $646.00

FAIL:
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ never: never asserts a bundling rule as fact — ultrasound guidance with a joint injection usually has one combined code — 76942 with joint injections) are separately payable

WARN:
- ⚠️ §1 long — 713 words (target 560)
- ⚠️ §2 long — 522 words (target 500)
- ⚠️ §10 long — 268 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**104 pass · 2 fail · 6 warn** · 4410 words · 65 placeholders · wall 58s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: (audit) a record gap is fixed by a new visit or dated addendum, not only a letter — /addendum|new (face-to-face|visit|exam|evaluation|mobility)/ in §1,§3,§4,§10
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment documents

WARN:
- ⚠️ §1 long — 703 words (target 560)
- ⚠️ §5 long — 542 words (target 420)
- ⚠️ §6 long — 469 words (target 450)
- ⚠️ §7 long — 467 words (target 400)
- ⚠️ §8 long — 325 words (target 290)
- ⚠️ §10 long — 298 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**103 pass · 1 fail · 5 warn** · 4390 words · 46 placeholders · wall 63s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — foot drop

WARN:
- ⚠️ §1 long — 748 words (target 560)
- ⚠️ §5 long — 562 words (target 420)
- ⚠️ §6 long — 628 words (target 450)
- ⚠️ §7 long — 414 words (target 400)
- ⚠️ §10 long — 319 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**89 pass · 3 fail · 3 warn** · 3743 words · 35 placeholders · wall 58s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ no pending step written as already done — I have reported
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — unless you signed a valid notice-and-consent

WARN:
- ⚠️ §1 long — 657 words (target 560)
- ⚠️ §5 long — 474 words (target 420)
- ⚠️ §10 long — 299 words (target 260)

**TOTAL: 784 pass · 10 fail across 8 cases** (development set 592 pass · 6 fail; held-out 192 pass · 4 fail)

