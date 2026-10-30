# Fight Pack automated checks — run "runs18" (today=2026-10-30)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**105 pass · 0 fail · 4 warn** · 4521 words · 54 placeholders · wall 69s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

WARN:
- ⚠️ §1 long — 819 words (target 560)
- ⚠️ §5 long — 578 words (target 420)
- ⚠️ §9 long — 424 words (target 400)
- ⚠️ §10 long — 414 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**105 pass · 2 fail · 2 warn** · 3574 words · 46 placeholders · wall 55s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ never: (audit2) the family was told only "very slow": severity words come from the chart, in brackets — marked bradycardi
- ❌ never: (audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination — peer-to-peer

WARN:
- ⚠️ §1 long — 596 words (target 560)
- ⚠️ §10 long — 369 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**103 pass · 3 fail · 6 warn** · 4955 words · 42 placeholders · wall 74s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ never: the letter says the plan is insured and regulated by the state insurance department — Department of Labor
- ❌ never: (audit2) the letter makes the peer-to-peer the doctor's call to place (1-888-555-0186, within 7 days) — never wait for one — If the plan calls
- ❌ never: (audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced — skilled nursing facility offers 1–2 hours

WARN:
- ⚠️ §1 long — 917 words (target 560)
- ⚠️ §2 long — 614 words (target 500)
- ⚠️ §3 long — 545 words (target 520)
- ⚠️ §5 long — 698 words (target 420)
- ⚠️ §9 long — 487 words (target 400)
- ⚠️ §10 long — 354 words (target 260)

**TOTAL: 313 pass · 5 fail across 3 cases** (development set 105 pass · 0 fail; held-out 208 pass · 5 fail)

