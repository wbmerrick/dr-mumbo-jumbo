# Fight Pack automated checks — run "runs7" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**93 pass · 0 fail · 2 warn** · 3610 words · 93 placeholders · wall 53s · deadline {"truth":null,"served":[null]}

WARN:
- ⚠️ §1 long — 650 words (target 560)
- ⚠️ §5 long — 493 words (target 420)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**103 pass · 1 fail · 4 warn** · 4528 words · 63 placeholders · wall 82s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never: (audit) never claim a service is available only to inpatients — available only at the inpatient

WARN:
- ⚠️ §1 long — 919 words (target 560)
- ⚠️ §2 long — 517 words (target 500)
- ⚠️ §5 long — 649 words (target 420)
- ⚠️ §10 long — 341 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**104 pass · 1 fail · 2 warn** · 4138 words · 47 placeholders · wall 65s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ depth: (audit) the urgent insurer call uses the printed expedited-appeal line — /855-555-0190/ in §6

WARN:
- ⚠️ §1 long — 724 words (target 560)
- ⚠️ §5 long — 571 words (target 420)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**97 pass · 1 fail · 5 warn** · 4115 words · 39 placeholders · wall 63s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — You did not choose

WARN:
- ⚠️ §1 long — 632 words (target 560)
- ⚠️ §5 long — 515 words (target 420)
- ⚠️ §6 long — 547 words (target 450)
- ⚠️ §9 long — 451 words (target 400)
- ⚠️ §10 long — 276 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**95 pass · 2 fail · 5 warn** · 4288 words · 52 placeholders · wall 62s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646.00

FAIL:
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7
- ❌ never: never asserts a bundling rule as fact — ultrasound guidance with a joint injection usually has one combined code — 76942) is often separately reportable

WARN:
- ⚠️ §1 long — 756 words (target 560)
- ⚠️ §2 long — 503 words (target 500)
- ⚠️ §5 long — 524 words (target 420)
- ⚠️ §9 long — 440 words (target 400)
- ⚠️ §10 long — 312 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**105 pass · 2 fail · 5 warn** · 4748 words · 85 placeholders · wall 72s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10
- ❌ never: (audit) no exam findings asserted in the clinician's voice — demonstrated safe

WARN:
- ⚠️ §1 long — 940 words (target 560)
- ⚠️ §3 long — 552 words (target 520)
- ⚠️ §5 long — 681 words (target 420)
- ⚠️ §6 long — 478 words (target 450)
- ⚠️ §10 long — 291 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**100 pass · 5 fail · 3 warn** · 3914 words · 44 placeholders · wall 70s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ depth: (run-7 review) the first instruction in the kit is the emergency department now, not a call to the office — /safety first:?\*{0,2}:?\s*go to (an|the) emergency department now/ in §1
- ❌ never: (audit) emergency signs mean the emergency department now, not a same-day clinic visit first — see her today
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — foot drop
- ❌ never: (run-7 review) emergency care is never the fallback for an unanswered call to the office — if you cannot reach the office or be seen today, go to the emergency department now, because these symptoms suggest possible cauda equina syndrome, which is a surgical emergency
- ❌ never: (run-7 review) a same-day office visit is not a substitute for the emergency department — be seen today

WARN:
- ⚠️ §1 long — 769 words (target 560)
- ⚠️ §5 long — 472 words (target 420)
- ⚠️ §10 long — 263 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**91 pass · 2 fail · 1 warn** · 3506 words · 27 placeholders · wall 43s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ depth: the $1,860 balance bill is not owed — /do not pay|don't pay|should not pay|shouldn't pay|not pay the/ in §1,§7
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — did not receive any written notice

WARN:
- ⚠️ §1 long — 596 words (target 560)

**TOTAL: 788 pass · 14 fail across 8 cases** (development set 597 pass · 7 fail; held-out 191 pass · 7 fail)

