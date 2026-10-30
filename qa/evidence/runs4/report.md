# Fight Pack automated checks — run "runs4" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**88 pass · 5 fail · 3 warn** · 4070 words · 112 placeholders · wall 62s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ server decision clock: 30 days / 72 hours for care not yet received — []
- ❌ no "plan-preferred equivalent" when the notice names no preferred product
- ❌ never asserts a stability nobody reported — yet been scheduled and the condition is stable enough for the standard timef
- ❌ never: (audit) no technical absolutes about the home test — cannot distinguish
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 664 words (target 560)
- ⚠️ §5 long — 567 words (target 420)
- ⚠️ §10 long — 273 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**99 pass · 5 fail · 3 warn** · 4230 words · 58 placeholders · wall 74s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ server decision clock: 60 days for care already received — []
- ❌ §1 does not call the plan insured or self-funded unless the documents say so — ** Employer plan, insured (the notice names a group: Front Range Logistics LLC), and the h
- ❌ never: (audit) the letter names the attending but not a specialty — it stays [specialty] — hospitalist
- ❌ never: (audit) durations come only from the dates in the source — 48+
- ❌ never: (audit) observation IS an outpatient status — not the same as outpatient

WARN:
- ⚠️ §1 long — 814 words (target 560)
- ⚠️ §2 long — 505 words (target 500)
- ⚠️ §5 long — 565 words (target 420)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**99 pass · 6 fail · 3 warn** · 4022 words · 43 placeholders · wall 61s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time
- ❌ server decision clock: 30 days / 72 hours for care not yet received — []
- ❌ §1 does not call the plan insured or self-funded unless the documents say so — ** Employer fully insured plan (Harborline Select PPO, employer group 44817). You are fili
- ❌ no pending step written as already done — office is submitting
- ❌ depth: (audit) an urgent specialty-drug case asks the office about a bridge supply — /bridge/ in §7
- ❌ never: (audit) a self-injected pen is identified by drug name and strength, never a procedure code — [CPT code

WARN:
- ⚠️ §1 long — 652 words (target 560)
- ⚠️ §5 long — 478 words (target 420)
- ⚠️ §10 long — 265 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**89 pass · 9 fail · 3 warn** · 3877 words · 39 placeholders · wall 60s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ §10 decision clock for care already received is 60 days — 30
- ❌ server decision clock: 60 days for care already received — []
- ❌ §1 does not call the plan insured or self-funded unless the documents say so — ** Evergreen Choice HMO (the plan name and "HMO" on the EOB show this is an employer or ma
- ❌ no pending step written as already done — I have also reported
- ❌ depth: the patient should not pay the $2,340 balance bill while disputing it — /do not pay|don't pay|should not pay|shouldn't pay|not pay the/ in §1,§7
- ❌ depth: (audit) a plan may not judge an emergency by diagnosis codes alone — /diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis/ in §1,§2,§3,§5,§6
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — no control over which
- ❌ never: (audit) the protection is the patient's in-network cost-sharing; what the plan pays the provider is separate — in-network rates
- ❌ never: (audit) whether care was an emergency is medical judgment — it can go to external review — question of law

WARN:
- ⚠️ §1 long — 637 words (target 560)
- ⚠️ §5 long — 478 words (target 420)
- ⚠️ §6 long — 463 words (target 450)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**92 pass · 5 fail · 3 warn** · 3718 words · 29 placeholders · wall 55s · deadline {"truth":"2027-03-29","served":["2027-03-29"]} · verified sums $646

FAIL:
- ❌ server decision clock: 60 days for care already received — []
- ❌ §3 (surprise bill) states the protection and asks to withdraw the balance and hold the account
- ❌ §7 asks for an itemized statement and an account hold
- ❌ never: (audit) a new visit never cures a coding denial — the codes must match the visit that happened — schedule a follow-up visit to address cod
- ❌ never: (audit) nothing is written as done that has not happened — billing office has confirmed

WARN:
- ⚠️ §1 long — 677 words (target 560)
- ⚠️ §3 long — 596 words (target 520)
- ⚠️ §10 long — 301 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**97 pass · 10 fail · 5 warn** · 4189 words · 53 placeholders · wall 76s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ server decision clock: 30 days / 72 hours for care not yet received — []
- ❌ no regulation or statute cited by number — tten order requirements in 42 CFR 410.38(g).]
- ❌ no "plan-preferred equivalent" when the notice names no preferred product
- ❌ never asserts a stability nobody reported — chair is not yet supplied and this is a stable chronic condition, not a wors
- ❌ never tells the doctor the case is not urgent
- ❌ no pending step written as already done — All required documentation is now included
- ❌ depth: (audit) in Medicare Advantage the treating doctor can request the reconsideration directly — /(doctor|physician)[^.\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\n]{0,40}(file|request|submit)s?[^.\n]{0,40}(directly|on (his|her|your|their) behalf)/ in §1,§2,§4,§6,§7,§10
- ❌ never: (audit) "accidents" is a lay description, never a diagnostic label — urge incontinence
- ❌ never: (audit) a record that is not in the source is named, never characterized — home assessment completed on September 30, 2026 confirms
- ❌ never: (audit) no regulation numbers — 410.38

WARN:
- ⚠️ §1 long — 814 words (target 560)
- ⚠️ §2 long — 512 words (target 500)
- ⚠️ §3 long — 605 words (target 520)
- ⚠️ §5 long — 572 words (target 420)
- ⚠️ §10 long — 301 words (target 260)

**TOTAL: 564 pass · 40 fail across 6 cases**

