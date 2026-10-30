# Fight Pack automated checks — run "runs26" (today=2026-10-30)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**107 pass · 1 fail · 3 warn** · 3667 words · 52 placeholders · wall 50s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ never: (audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination — peer-to-peer

WARN:
- ⚠️ §1 long — 663 words (target 560)
- ⚠️ §8 long — 417 words (target 290)
- ⚠️ §10 long — 322 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**105 pass · 1 fail · 5 warn** · 4765 words · 43 placeholders · wall 71s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ never: (audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced — not validated

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — 10/29/2026, November 4, 2026, November 4
- ⚠️ §1 long — 861 words (target 560)
- ⚠️ §5 long — 643 words (target 420)
- ⚠️ §9 long — 517 words (target 400)
- ⚠️ §10 long — 403 words (target 260)

**TOTAL: 212 pass · 2 fail across 2 cases** (development set 0 pass · 0 fail; held-out 212 pass · 2 fail)

