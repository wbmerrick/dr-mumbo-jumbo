# Fight Pack automated checks — run "runs6" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**90 pass · 2 fail · 2 warn** · 3633 words · 89 placeholders · wall 59s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ depth: uses the safety fact the patient supplied — /fell asleep|drowsy driving|red light/ in §1,§3
- ❌ never: (audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks — does not monitor

WARN:
- ⚠️ §1 long — 667 words (target 560)
- ⚠️ §5 long — 462 words (target 420)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**100 pass · 3 fail · 4 warn** · 4277 words · 69 placeholders · wall 87s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never asserts a stability nobody reported — ended duration reflects that he was not stable enough for discharge after on
- ❌ never: (audit) the notice says the documentation does not reflect these findings, not that the criteria require them — criteria require "hemodynamic instability
- ❌ never: (audit) never claim a service is available only to inpatients — available only at inpatient

WARN:
- ⚠️ §1 long — 829 words (target 560)
- ⚠️ §2 long — 501 words (target 500)
- ⚠️ §5 long — 641 words (target 420)
- ⚠️ §10 long — 272 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**102 pass · 2 fail · 2 warn** · 4040 words · 46 placeholders · wall 63s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ never: (audit) severe symptoms now mean contacting the specialist today, unconditionally — contact your doctor today if symptoms worse
- ❌ never: (audit) the notice lists no exceptions — none is attributed to RX-ST-114 — RX-ST-114 allows exception

WARN:
- ⚠️ §1 long — 730 words (target 560)
- ⚠️ §5 long — 544 words (target 420)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**92 pass · 5 fail · 2 warn** · 3979 words · 35 placeholders · wall 64s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6
- ❌ never: (audit) a date given by phone never extends the printed deadline: go by the earlier one — use the later
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — You did not choose
- ❌ never: (audit) the protection is the patient's in-network cost-sharing; what the plan pays the provider is separate — in-network rates

WARN:
- ⚠️ §1 long — 682 words (target 560)
- ⚠️ §6 long — 545 words (target 450)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**95 pass · 1 fail · 2 warn** · 3731 words · 25 placeholders · wall 67s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646

FAIL:
- ❌ never: (audit) nothing is written as done that has not happened — billing office has confirmed

WARN:
- ⚠️ §1 long — 704 words (target 560)
- ⚠️ §10 long — 269 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**101 pass · 5 fail · 5 warn** · 4573 words · 69 placeholders · wall 66s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: (audit) a record gap is fixed by a new visit or dated addendum, not only a letter — /addendum|new (face-to-face|visit|exam|evaluation|mobility)/ in §1,§3,§4,§10
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10
- ❌ never: (audit) an expedited appeal on an incomplete record is decided on the old record: documents first — expedited request today
- ❌ never: (audit) "accidents" is a lay description, never a diagnostic label — urinary incontinence
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment from 09/30/2026 documents

WARN:
- ⚠️ §1 long — 798 words (target 560)
- ⚠️ §5 long — 600 words (target 420)
- ⚠️ §6 long — 530 words (target 450)
- ⚠️ §8 long — 334 words (target 290)
- ⚠️ §10 long — 360 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**100 pass · 4 fail · 2 warn** · 3866 words · 43 placeholders · wall 64s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ depth: (run-7 review) the first instruction in the kit is the emergency department now, not a call to the office — /safety first:?\*{0,2}:?\s*go to (an|the) emergency department now/ in §1
- ❌ never: (audit) unsourced patient facts go in brackets in the doctor letter — has not yet started physical therapy
- ❌ never: (audit) emergency signs mean the emergency department now, not a same-day clinic visit first — see me today
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — saddle anesthesia

WARN:
- ⚠️ §1 long — 663 words (target 560)
- ⚠️ §5 long — 454 words (target 420)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**89 pass · 3 fail · 2 warn** · 3591 words · 28 placeholders · wall 49s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ no pending step written as already done — I have also contacted
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — did not receive advance written notice and consent
- ❌ never: the protection is the patient's in-network cost-sharing, not the provider's payment rate — in-network rates

WARN:
- ⚠️ §1 long — 653 words (target 560)
- ⚠️ §10 long — 263 words (target 260)

**TOTAL: 769 pass · 25 fail across 8 cases** (development set 580 pass · 18 fail; held-out 189 pass · 7 fail)

