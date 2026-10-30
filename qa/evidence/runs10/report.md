# Fight Pack automated checks — run "runs10" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**92 pass · 1 fail · 2 warn** · 3879 words · 109 placeholders · wall 54s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ never: (audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks — does not monitor

WARN:
- ⚠️ §1 long — 700 words (target 560)
- ⚠️ §5 long — 454 words (target 420)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**104 pass · 0 fail · 5 warn** · 4497 words · 72 placeholders · wall 86s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

WARN:
- ⚠️ §1 long — 890 words (target 560)
- ⚠️ §2 long — 514 words (target 500)
- ⚠️ §3 long — 522 words (target 520)
- ⚠️ §5 long — 669 words (target 420)
- ⚠️ §10 long — 298 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**102 pass · 3 fail · 3 warn** · 3981 words · 48 placeholders · wall 61s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ never: (audit) the notice lists no exceptions — none is attributed to RX-ST-114 — The policy allows exception

WARN:
- ⚠️ §1 long — 687 words (target 560)
- ⚠️ §3 long — 524 words (target 520)
- ⚠️ §5 long — 451 words (target 420)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**96 pass · 2 fail · 2 warn** · 3599 words · 42 placeholders · wall 49s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) the balance-billing protection is standing, not only while disputed — Balance billing:** While
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — you did not choose

WARN:
- ⚠️ §1 long — 618 words (target 560)
- ⚠️ §10 long — 313 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**97 pass · 0 fail · 1 warn** · 3668 words · 33 placeholders · wall 47s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00

WARN:
- ⚠️ §1 long — 643 words (target 560)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**107 pass · 0 fail · 7 warn** · 4772 words · 70 placeholders · wall 71s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

WARN:
- ⚠️ §1 long — 864 words (target 560)
- ⚠️ §3 long — 647 words (target 520)
- ⚠️ §5 long — 550 words (target 420)
- ⚠️ §6 long — 564 words (target 450)
- ⚠️ §7 long — 475 words (target 400)
- ⚠️ §8 long — 325 words (target 290)
- ⚠️ §10 long — 262 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 1 fail · 4 warn** · 4181 words · 49 placeholders · wall 56s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — saddle anesthesia

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — October 20, 2026
- ⚠️ §1 long — 713 words (target 560)
- ⚠️ §5 long — 458 words (target 420)
- ⚠️ §10 long — 375 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**91 pass · 2 fail · 1 warn** · 3357 words · 31 placeholders · wall 48s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §8 requests the records and a coded itemized bill
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — never given any notice-and-consent

WARN:
- ⚠️ §10 long — 266 words (target 260)

**TOTAL: 793 pass · 9 fail across 8 cases** (development set 598 pass · 6 fail; held-out 195 pass · 3 fail)

