# Fight Pack automated checks — run "runs17" (today=2026-10-30)

## C-prior-auth-biologic — Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare
**81 pass · 4 fail · 5 warn** · 4967 words · 45 placeholders · wall 65s · deadline {"truth":"2027-04-18","served":["2027-04-18"]}

FAIL:
- ❌ part 6 stopped naturally — max_tokens
- ❌ json block parses
- ❌ §10 says the deadline printed on the letter controls
- ❌ §8 requests the records and a coded itemized bill

WARN:
- ⚠️ §1 long — 759 words (target 560)
- ⚠️ §5 long — 471 words (target 420)
- ⚠️ §6 long — 464 words (target 450)
- ⚠️ §9 long — 919 words (target 400)
- ⚠️ §10 long — 436 words (target 260)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**101 pass · 7 fail · 4 warn** · 4341 words · 64 placeholders · wall 69s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ §7 asks for an itemized statement and an account hold
- ❌ depth: the next level is a reconsideration by a Qualified Independent Contractor — /reconsideration/ in §9,§10
- ❌ depth: the transport went to the closest hospital — /closest|nearest/ in §2,§3
- ❌ never: (audit2, re-audit I-1) an ambulance claim is always paid on assignment: what he owes never depends on participation, and if Medicare pays he owes only the deductible and 20% coinsurance — bill Harold that amount depends on whether they participate in Medicare (accept assignment
- ❌ never: (audit2) the family was told only "very slow": severity words come from the chart, in brackets — significant bradycardi
- ❌ never: (audit2) the notice says Attn: Redeterminations — Attn: Medical Director
- ❌ never: (audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination — peer-to-peer

WARN:
- ⚠️ §1 long — 767 words (target 560)
- ⚠️ §5 long — 536 words (target 420)
- ⚠️ §8 long — 484 words (target 290)
- ⚠️ §10 long — 273 words (target 260)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**104 pass · 2 fail · 8 warn** · 5176 words · 40 placeholders · wall 85s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ never: (audit2) the letter makes the peer-to-peer the doctor's call to place (1-888-555-0186, within 7 days) — never wait for one — If the plan's physician reviewer calls
- ❌ never: (audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced — skilled nursing facility provides subacute rehabilitation, typically one to two hours

WARN:
- ⚠️ model-computed dates (arithmetic correct, but should not be computed) — November 4, 2026
- ⚠️ §1 long — 991 words (target 560)
- ⚠️ §2 long — 545 words (target 500)
- ⚠️ §3 long — 578 words (target 520)
- ⚠️ §5 long — 743 words (target 420)
- ⚠️ §6 long — 541 words (target 450)
- ⚠️ §9 long — 431 words (target 400)
- ⚠️ §10 long — 421 words (target 260)

**TOTAL: 286 pass · 13 fail across 3 cases** (development set 81 pass · 4 fail; held-out 205 pass · 9 fail)

