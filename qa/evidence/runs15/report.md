# Fight Pack automated checks — run "runs15" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**90 pass · 2 fail · 3 warn** · 3756 words · 101 placeholders · wall 56s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ no "plan-preferred equivalent" when the notice names no preferred product
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 606 words (target 560)
- ⚠️ §5 long — 527 words (target 420)
- ⚠️ §10 long — 292 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**103 pass · 0 fail · 3 warn** · 4254 words · 62 placeholders · wall 83s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

WARN:
- ⚠️ §1 long — 795 words (target 560)
- ⚠️ §5 long — 658 words (target 420)
- ⚠️ §10 long — 273 words (target 260)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**103 pass · 0 fail · 4 warn** · 4043 words · 45 placeholders · wall 61s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 715 words (target 560)
- ⚠️ §3 long — 528 words (target 520)
- ⚠️ §5 long — 433 words (target 420)
- ⚠️ §10 long — 286 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**96 pass · 1 fail · 2 warn** · 3630 words · 45 placeholders · wall 47s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — You did not choose

WARN:
- ⚠️ §1 long — 580 words (target 560)
- ⚠️ §5 long — 463 words (target 420)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**92 pass · 4 fail · 2 warn** · 3754 words · 25 placeholders · wall 57s · deadline {"truth":"2027-03-29","served":["2027-03-29"]}

FAIL:
- ❌ §2 requests the criteria and the reviewer's credentials
- ❌ §2 preserves the next level of review
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: (audit) asks whether one combined code describes the service — /combined code|one code|single code/ in §1,§3,§7

WARN:
- ⚠️ §1 long — 712 words (target 560)
- ⚠️ §2 long — 526 words (target 500)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**102 pass · 2 fail · 6 warn** · 4363 words · 80 placeholders · wall 53s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ §1 decides urgency (Urgent: Yes/No) — Your doctor decides. Standard review unless your doctor says
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10

WARN:
- ⚠️ §1 long — 790 words (target 560)
- ⚠️ §2 long — 544 words (target 500)
- ⚠️ §3 long — 530 words (target 520)
- ⚠️ §5 long — 473 words (target 420)
- ⚠️ §8 long — 402 words (target 290)
- ⚠️ §10 long — 317 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**104 pass · 0 fail · 4 warn** · 4277 words · 67 placeholders · wall 55s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ §1 long — 730 words (target 560)
- ⚠️ §5 long — 469 words (target 420)
- ⚠️ §7 long — 414 words (target 400)
- ⚠️ §10 long — 394 words (target 260)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**90 pass · 2 fail · 1 warn** · 3538 words · 37 placeholders · wall 46s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §4 has 6–8 bullets — 3
- ❌ never: (audit) for anesthesia at an in-network facility the protection never depends on notice or consent — never received any notice

WARN:
- ⚠️ §1 long — 607 words (target 560)

**TOTAL: 780 pass · 11 fail across 8 cases** (development set 586 pass · 9 fail; held-out 194 pass · 2 fail)
