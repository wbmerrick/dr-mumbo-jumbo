# Fight Pack automated checks — run "runs25" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**92 pass · 1 fail · 2 warn** · 3831 words · 109 placeholders · wall 52s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 655 words (target 560)
- ⚠️ §5 long — 504 words (target 420)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**103 pass · 1 fail · 4 warn** · 4349 words · 68 placeholders · wall 77s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ depth: the letter itself protects the member from the denied difference — /may not be billed|cannot be billed|can't be billed|not be billed for the difference/ in §1

WARN:
- ⚠️ §1 long — 948 words (target 560)
- ⚠️ §2 long — 540 words (target 500)
- ⚠️ §5 long — 520 words (target 420)
- ⚠️ §10 long — 276 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**104 pass · 1 fail · 4 warn** · 4251 words · 42 placeholders · wall 57s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ never: (audit) the notice lists no exceptions — none is attributed to RX-ST-114 — RX-ST-114 includes exception

WARN:
- ⚠️ §1 long — 849 words (target 560)
- ⚠️ §5 long — 477 words (target 420)
- ⚠️ §6 long — 465 words (target 450)
- ⚠️ §10 long — 275 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**97 pass · 1 fail · 2 warn** · 3580 words · 41 placeholders · wall 46s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6

WARN:
- ⚠️ §1 long — 615 words (target 560)
- ⚠️ §10 long — 275 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**95 pass · 2 fail · 1 warn** · 3705 words · 35 placeholders · wall 52s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646

FAIL:
- ❌ appeal letter states no decision timeframe the denial letter did not print — within 60 days
- ❌ never: (audit) nothing is written as done that has not happened — billing office has verified

WARN:
- ⚠️ §1 long — 796 words (target 560)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**103 pass · 4 fail · 4 warn** · 4233 words · 83 placeholders · wall 59s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: a documentation denial is often fastest fixed by a corrected new request — /new request|resubmi|new prior authori|fresh request|corrected (prior[- ]authori[sz]ation )?request/ in §1,§6,§7,§10
- ❌ depth: (audit) a record gap is fixed by a new visit or dated addendum, not only a letter — /addendum|new (face-to-face|visit|exam|evaluation|mobility)/ in §1,§3,§4,§10
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment and enclose it with this letter — it documents

WARN:
- ⚠️ §1 long — 835 words (target 560)
- ⚠️ §3 long — 632 words (target 520)
- ⚠️ §5 long — 494 words (target 420)
- ⚠️ §10 long — 263 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**105 pass · 0 fail · 5 warn** · 4326 words · 59 placeholders · wall 63s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — October 20, 2026
- ⚠️ §1 long — 825 words (target 560)
- ⚠️ §5 long — 515 words (target 420)
- ⚠️ §6 long — 525 words (target 450)
- ⚠️ §10 long — 288 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**92 pass · 1 fail · 1 warn** · 3395 words · 33 placeholders · wall 52s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials

WARN:
- ⚠️ §1 long — 632 words (target 560)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**106 pass · 2 fail · 3 warn** · 3805 words · 57 placeholders · wall 51s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ depth: the transport went to the closest hospital — /closest|nearest/ in §2,§3
- ❌ never: (audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination — peer-to-peer

WARN:
- ⚠️ §1 long — 760 words (target 560)
- ⚠️ §2 long — 506 words (target 500)
- ⚠️ §8 long — 416 words (target 290)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**105 pass · 1 fail · 7 warn** · 5163 words · 32 placeholders · wall 82s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ depth: she needs physical, occupational and speech therapy — /speech/ in §3,§5

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026, November 4th
- ⚠️ §1 long — 1046 words (target 560)
- ⚠️ §2 long — 608 words (target 500)
- ⚠️ §5 long — 629 words (target 420)
- ⚠️ §6 long — 534 words (target 450)
- ⚠️ §9 long — 422 words (target 400)
- ⚠️ §10 long — 447 words (target 260)

**TOTAL: 1002 pass · 14 fail across 10 cases** (development set 594 pass · 10 fail; held-out 408 pass · 4 fail)

