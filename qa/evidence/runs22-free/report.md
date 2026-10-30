# Fight Pack automated checks — run "runs22-free (production, free path)" (today=2026-10-30)

## G-medicaid-mri-redflags — Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags
**105 pass · 0 fail · 4 warn** · 4361 words · 56 placeholders · wall 66s · deadline {"truth":"2026-12-22","served":["2026-12-22"]}

WARN:
- ⚠️ §1 long — 822 words (target 560)
- ⚠️ §5 long — 492 words (target 420)
- ⚠️ §6 long — 521 words (target 450)
- ⚠️ §10 long — 279 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**105 pass · 1 fail · 7 warn** · 5259 words · 52 placeholders · wall 77s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ depth: in an urgent case the doctor can request the expedited appeal directly — /(doctor|physician|Dr\.? Vasquez)[^.\n]{0,100}(can|may|should|will) (call|request|file|ask)/ in §1,§4,§6,§10

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — 11/4/2026, 10/29/2026, November 4, 2026, November 4, November 4th
- ⚠️ §1 long — 1018 words (target 560)
- ⚠️ §2 long — 618 words (target 500)
- ⚠️ §5 long — 619 words (target 420)
- ⚠️ §6 long — 502 words (target 450)
- ⚠️ §9 long — 808 words (target 400)
- ⚠️ §10 long — 358 words (target 260)

**TOTAL: 210 pass · 1 fail across 2 cases** (development set 0 pass · 0 fail; held-out 210 pass · 1 fail)

