# Fight Pack automated checks — run "runs27" (today=2026-10-30)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**105 pass · 0 fail · 6 warn** · 4921 words · 59 placeholders · wall 71s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 936 words (target 560)
- ⚠️ §2 long — 503 words (target 500)
- ⚠️ §3 long — 527 words (target 520)
- ⚠️ §5 long — 672 words (target 420)
- ⚠️ §9 long — 421 words (target 400)
- ⚠️ §10 long — 448 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**106 pass · 2 fail · 2 warn** · 3655 words · 42 placeholders · wall 66s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ depth: the daughter files for him: the Appointment of Representative form comes first — /CMS-1696|Appointment of Representative/ in §1,§2,§10
- ❌ never: (audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination — peer-to-peer

WARN:
- ⚠️ §1 long — 820 words (target 560)
- ⚠️ §10 long — 304 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**105 pass · 1 fail · 6 warn** · 4812 words · 40 placeholders · wall 73s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ never: (audit2) nothing has been billed: the exposure is going to Lakeshore without approval, not a hospital bill — hold the account

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026
- ⚠️ §1 long — 1054 words (target 560)
- ⚠️ §2 long — 550 words (target 500)
- ⚠️ §5 long — 544 words (target 420)
- ⚠️ §9 long — 473 words (target 400)
- ⚠️ §10 long — 372 words (target 260)

**TOTAL: 316 pass · 3 fail across 3 cases** (development set 105 pass · 0 fail; held-out 211 pass · 3 fail)

