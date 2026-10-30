# Fight Pack automated checks — run "runs16" (today=2026-10-30)

## I-original-medicare-ambulance — Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing
**101 pass · 7 fail · 1 warn** · 3731 words · 52 placeholders · wall 68s · deadline {"truth":"2027-02-11","served":["2027-02-11"]}

FAIL:
- ❌ every dollar amount is from the source or an exact sum of source amounts — $200
- ❌ never: (audit2, re-audit I-1) an ambulance claim is always paid on assignment: what he owes never depends on participation, and if Medicare pays he owes only the deductible and 20% coinsurance — 115%
- ❌ never: (audit2) the daughter said only that she handles his mail — no power of attorney — I have power of attorney
- ❌ never: (audit2) the family was told only "very slow": severity words come from the chart, in brackets — unstable
- ❌ never: (audit2) the notice says Attn: Redeterminations — Attn: Medical Director
- ❌ never: (audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination — peer-to-peer
- ❌ never: (audit2) the test is that other transport was contraindicated; "not validated" garbles it — not validated

WARN:
- ⚠️ §1 long — 697 words (target 560)

## J-urgent-irf-pdf-records — Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached
**96 pass · 10 fail · 6 warn** · 5031 words · 39 placeholders · wall 85s · deadline {"truth":"2027-04-26","served":["2027-04-26"]}

FAIL:
- ❌ urgent: expedited external review can be requested at the same time
- ❌ depth: she needs physical, occupational and speech therapy — /speech/ in §3,§5
- ❌ depth: (audit2) the phone scripts keep the printed peer-to-peer number — /1-888-555-0186/ in §6,§7
- ❌ never: the letter says the plan is insured and regulated by the state insurance department — Department of Labor
- ❌ never: (audit2) the 10/26 consult is Dr. Lindqvist's: a signer who did not write it would attest to it — I documented on 10/26
- ❌ never: (audit2) the letter makes the peer-to-peer the doctor's call to place (1-888-555-0186, within 7 days) — never wait for one — If the plan's physician reviewer calls
- ❌ never: (audit2) nothing has been billed: the exposure is going to Lakeshore without approval, not a hospital bill — billed for the denied difference
- ❌ never: (audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced — physiatric oversight
- ❌ never: (audit2) the minutes come from the therapy notes (she has aphasia), and only 10/25 reads "participating fully" — patient reports tolerat
- ❌ never: (audit2) the husband never said he holds legal authority — authorized to act on her behalf

WARN:
- ⚠️ §1 long — 941 words (target 560)
- ⚠️ §2 long — 522 words (target 500)
- ⚠️ §5 long — 623 words (target 420)
- ⚠️ §6 long — 661 words (target 450)
- ⚠️ §7 long — 406 words (target 400)
- ⚠️ §10 long — 365 words (target 260)

**TOTAL: 197 pass · 17 fail across 2 cases** (development set 0 pass · 0 fail; held-out 197 pass · 17 fail)

