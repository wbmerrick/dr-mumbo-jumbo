# Fight Pack automated checks — run "rescore/runs5" (today=2026-10-30)

## A-sleep-paraphrase — Rawest input: patient paraphrase of a sleep-study denial, no identifiers
**89 pass · 3 fail · 3 warn** · 3728 words · 100 placeholders · wall 53s · deadline {"truth":null,"served":[null]}

FAIL:
- ❌ cross-references point at the right section — - My appeal letter and the doctor's letter → section 3
- ❌ never: (audit) no technical absolutes about the home test — cannot distinguish
- ❌ never: (audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh — adaptive servo

WARN:
- ⚠️ §1 long — 578 words (target 560)
- ⚠️ §5 long — 442 words (target 420)
- ⚠️ §10 long — 266 words (target 260)

## B-inpatient-loc-photo — Phone photo of a hospital level-of-care denial (inpatient → observation)
**101 pass · 2 fail · 2 warn** · 4078 words · 78 placeholders · wall 74s · deadline {"truth":"2027-03-21","served":["2027-03-21"]}

FAIL:
- ❌ depth: (audit) builds on care still needed after the approved observation window — /(approved|authori[sz]ed)[^.\n]{0,80}(08/04|August 4)|(08/04|August 4)[^.\n]{0,160}(still|continu|remain|beyond|after|through|past|08/05|August 5)/ in §1,§3,§5
- ❌ never: DRG label "heart failure & shock" is a billing category, not a diagnosis of shock — shock

WARN:
- ⚠️ §1 long — 771 words (target 560)
- ⚠️ §5 long — 579 words (target 420)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**103 pass · 0 fail · 4 warn** · 4306 words · 52 placeholders · wall 70s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 750 words (target 560)
- ⚠️ §5 long — 467 words (target 420)
- ⚠️ §6 long — 472 words (target 450)
- ⚠️ §10 long — 325 words (target 260)

## D-oon-er-eob — EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency
**94 pass · 3 fail · 4 warn** · 4047 words · 41 placeholders · wall 64s · deadline {"truth":"2027-04-04","served":["2027-04-04"]}

FAIL:
- ❌ every dollar amount is from the source or an exact sum of source amounts — $100, $350
- ❌ depth: the patient should not pay the $2,340 balance bill while disputing it — /do not pay|don't pay|should not pay|shouldn't pay|not pay the/ in §1,§7
- ❌ never: (audit) choice of clinician is irrelevant to emergency care — never argued or proved — no control over which

WARN:
- ⚠️ §1 long — 681 words (target 560)
- ⚠️ §5 long — 484 words (target 420)
- ⚠️ §9 long — 408 words (target 400)
- ⚠️ §10 long — 348 words (target 260)

## E-coding-bundling — Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit
**93 pass · 3 fail · 2 warn** · 3794 words · 30 placeholders · wall 61s · deadline {"truth":"2027-03-29","served":["2027-03-29"]}

FAIL:
- ❌ no pending step written as already done — I have contacted
- ❌ denial reason is quoted in §1/§2 — included in the payment
- ❌ never: never asserts a bundling rule as fact — ultrasound guidance with a joint injection usually has one combined code — 76942) is an add-on code that is separately reportable

WARN:
- ⚠️ §1 long — 677 words (target 560)
- ⚠️ §10 long — 327 words (target 260)

## F-medicare-advantage-pmd — Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline
**105 pass · 1 fail · 4 warn** · 4325 words · 63 placeholders · wall 73s · deadline {"truth":"2026-12-18","served":["2026-12-18"]}

FAIL:
- ❌ never: (audit) "accidents" is a lay description, never a diagnostic label — urge incontinence

WARN:
- ⚠️ §1 long — 773 words (target 560)
- ⚠️ §3 long — 549 words (target 520)
- ⚠️ §5 long — 608 words (target 420)
- ⚠️ §10 long — 265 words (target 260)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**98 pass · 6 fail · 2 warn** · 3718 words · 48 placeholders · wall 59s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

FAIL:
- ❌ every phone number is from the source or the verified list — 1-888-466-2219
- ❌ depth: (audit) new weakness, trouble urinating and saddle numbness mean the emergency department now, before any appeal step — /emergency (room|department)[^.\n]{0,30}\bnow\b|\bnow\b[^.\n]{0,30}emergency (room|department)|\b911\b/ in §1
- ❌ depth: (run-7 review) the first instruction in the kit is the emergency department now, not a call to the office — /safety first:?\*{0,2}:?\s*go to (an|the) emergency department now/ in §1
- ❌ never: (audit) emergency signs mean the emergency department now, not a same-day clinic visit first — See me today
- ❌ never: (run-9 audit) the doctor signs the patient's own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels — foot drop
- ❌ never: (run-7 review) a same-day office visit is not a substitute for the emergency department — can I be seen today

WARN:
- ⚠️ §1 long — 676 words (target 560)
- ⚠️ §5 long — 475 words (target 420)

## H-oon-anesthesia-asc — Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center
**89 pass · 3 fail · 1 warn** · 3336 words · 36 placeholders · wall 51s · deadline {"truth":"2027-03-07","served":["2027-03-07"]}

FAIL:
- ❌ §3 letter type matches the denial (corrected) — attestation
- ❌ §3 (surprise bill) states the protection and asks to withdraw the balance and hold the account
- ❌ never: the protection is the patient's in-network cost-sharing, not the provider's payment rate — in-network rates

WARN:
- ⚠️ §1 long — 577 words (target 560)

**TOTAL: 772 pass · 21 fail across 8 cases** (development set 585 pass · 12 fail; held-out 187 pass · 9 fail)
