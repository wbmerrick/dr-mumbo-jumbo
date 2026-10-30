# Fight Pack automated checks — run "runs11" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**89 pass · 4 fail · 4 warn** · 3978 words · 105 placeholders · wall 66s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ json denial_date = null — "2026-10-30"
- ❌ never: (audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks — does not monitor
- ❌ never: (audit) falling asleep at a red light is reported, not upgraded to a near accident — near-miss
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 734 words (target 560)
- ⚠️ §5 long — 562 words (target 420)
- ⚠️ §6 long — 489 words (target 450)
- ⚠️ §10 long — 275 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**102 pass · 2 fail · 3 warn** · 4603 words · 64 placeholders · wall 97s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ never asserts a stability nobody reported — nous diuresis, and  []  before  []  was stable enough for safe discharge. Ob
- ❌ depth: the letter itself protects the member from the denied difference — /may not be billed|cannot be billed|can't be billed|not be billed for the difference/ in §1

WARN:
- ⚠️ §1 long — 877 words (target 560)
- ⚠️ §5 long — 823 words (target 420)
- ⚠️ §10 long — 319 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**104 pass · 1 fail · 4 warn** · 4326 words · 44 placeholders · wall 67s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time

WARN:
- ⚠️ §1 long — 825 words (target 560)
- ⚠️ §5 long — 578 words (target 420)
- ⚠️ §6 long — 506 words (target 450)
- ⚠️ §10 long — 267 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**95 pass · 3 fail · 4 warn** · 3943 words · 39 placeholders · wall 63s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6
- ❌ never: (audit) the balance-billing protection is standing, not only while disputed — balance billing continues** while
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — you did not choose

WARN:
- ⚠️ §1 long — 687 words (target 560)
- ⚠️ §2 long — 512 words (target 500)
- ⚠️ §8 long — 298 words (target 290)
- ⚠️ §10 long — 279 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**97 pass · 0 fail · 2 warn** · 3572 words · 31 placeholders · wall 46s · deadline {"truth":"2027-03-29","served":["2027-03-29"]}

WARN:
- ⚠️ §1 long — 722 words (target 560)
- ⚠️ §10 long — 303 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**104 pass · 3 fail · 5 warn** · 4542 words · 72 placeholders · wall 60s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ depth: a documentation denial is often fastest fixed by a corrected new request — /new request|resubmi|new prior authori|fresh request|corrected (prior[- ]authori[sz]ation )?request/ in §1,§6,§7,§10
- ❌ depth: (audit) a record gap is fixed by a new visit or dated addendum, not only a letter — /addendum|new (face-to-face|visit|exam|evaluation|mobility)/ in §1,§3,§4,§10
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment was completed on  []  but was not submitted; it likely documents

WARN:
- ⚠️ §1 long — 875 words (target 560)
- ⚠️ §2 long — 530 words (target 500)
- ⚠️ §3 long — 548 words (target 520)
- ⚠️ §5 long — 557 words (target 420)
- ⚠️ §10 long — 335 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 1 fail · 5 warn** · 4283 words · 64 placeholders · wall 66s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — causing falls

WARN:
- ⚠️ §1 long — 728 words (target 560)
- ⚠️ §5 long — 522 words (target 420)
- ⚠️ §6 long — 495 words (target 450)
- ⚠️ §7 long — 435 words (target 400)
- ⚠️ §10 long — 343 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**91 pass · 2 fail · 3 warn** · 3424 words · 28 placeholders · wall 46s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — did not receive any advance written notice or consent

WARN:
- ⚠️ §1 long — 627 words (target 560)
- ⚠️ §6 long — 479 words (target 450)
- ⚠️ §10 long — 294 words (target 260)

**TOTAL: 786 pass · 16 fail across 8 cases** (development set 591 pass · 13 fail; held-out 195 pass · 3 fail)

