# Re-audit: run 21 (engine v9.8.3), held-out kits I and J

**Auditor and severity key:** same reviewer, severity key and calibration as `audit.md` (run 16).

**What I read:**
- `I-source.txt` and `J-source.txt` (byte-identical to run 16).
- `I-kit-run21.md` and `J-kit-run21.md`, in full.
- No checker or checker output was used.

**How I checked:** I re-checked every rule against primary sources (listed at the end). Every quote below was machine-checked against the run-21 kits and the sources.

**Review date:** Friday 2026-10-30.

**Severity key:**
- **Critical:** could cause a missed deadline, delayed urgent care, or a clinician signing a false statement.
- **Major:** likely to lose the appeal or mislead the patient.
- **Minor:** credibility or polish.

**Calibration:** a clinical characterization that the signer must check against the chart anyway is Major. A false statement about the signer's own act, or a step that lengthens an urgent timeline, is Critical.

**Scope note:** run 16 had J-1 to J-15, not J-13. All 15 are graded here.

## Bottom line

| Kit | Critical | Major | Minor | Most important remaining defect |
|---|---|---|---|---|
| I | 0 (run 16: 0) | 2 (run 16: 4) | 10 | §1, §2, §4 and §7 now tell the hospital and ambulance company to send the decisive records straight to the MAC, apart from the appeal. Also unfixed: a non-assigned ambulance can "be higher". |
| J | 0 (run 16: 2) | 2 (run 16: 5) | 12 | The 10/25 therapy day is now called "fatigued" in §1, §2, §3 and §5, including the doctor's signed letter. The note for 10/25 says "participating fully". |

Both run-16 Criticals in J are fixed, and the urgent path in J is now right throughout:
- expedited call first;
- concurrent expedited external review;
- peer-to-peer by Wednesday, Nov 4, on the printed number.

---

## Kit I: Original Medicare Part B ambulance

### 1. Status of run-16 findings

| # | Run 16 | Status | Exact quote from run-21 kit | Note |
|---|---|---|---|---|
| I-1 | Major | **Not fixed** | §1: "If the ambulance provider is non-participating or does not accept assignment, the amount could be higher." §7: "Is the provider participating with Medicare, or did you accept assignment on this claim?" | "115%" is gone, but the rule is still wrong. Ambulance payment is "made only on an assignment-related basis", and the supplier "must accept the Medicare allowed charge as payment in full" (42 CFR 414.610(b)). If the claim is approved, Harold owes the 20% coinsurance, whatever the company's participation status. **Major remains.** |
| I-2 | Major | Fixed | §7: "I'm his daughter, Renee Pruitt-Cole, and I'm filing a redetermination." | The power-of-attorney claim is gone everywhere. |
| I-3 | Major | Fixed (§3, §9) | §3: "[documented vital signs on arrival, including heart rate of ___ bpm]". §9: "[if documented: dangerously] slow"; "[if documented: unstable]" | The doctor's letter and the QIC note no longer upgrade severity. Minor residue in lay text: §1 "his condition was unstable and required immediate evaluation for a life-threatening cardiac problem"; §2, the daughter's letter, "required immediate evaluation and treatment for a life-threatening cardiac condition"; §6 "had chest pain and a dangerously slow heart rate". |
| I-4 | Major | **Partly fixed** | Fixed: §3 is addressed "Attn: Redeterminations"; §4 "give us a copy or fax it to us at [our fax]. We'll send it with the appeal by February 11, 2027." Still wrong: §1 "you ask Tri-County Emergency Medical Services and Westbrook Regional Medical Center to send their records to the Medicare claims office"; §2 "to send the ambulance trip report and emergency-department records directly to your office"; §4 "Ask Tri-County Emergency Medical Services (the ambulance company) to send the trip report/run sheet to the Medicare address on the letter"; §7 "Can you send the emergency department records and admission records from August 26–27 to Medicare and to me?" | The doctor's letter now goes in with the appeal. But the trip report and ED record (the kit's own "What would make it decisive") are now routed the way the letter used to be: sent separately to a P.O. box by third parties, with no request to attach to. Arriving later, each submission extends the decision up to 14 days (405.950(b)(3)). CMS says documentation goes "with their redetermination request", and the kit's own §5 says so too: "Your letter and the ambulance and hospital records go together to the Medicare Part B Claims Office". **Major remains.** |
| I-5 | Minor | Fixed | §5: "There is no peer-to-peer review at the Medicare redetermination level." | |
| I-6 | Minor | Fixed | §3: "the risk of recurrent syncope, hemodynamic instability, or cardiac arrest during non-emergency transport would have endangered his health." | No "not validated" anywhere in the kit. |
| I-7 | Minor | Partly fixed | Fixed: §3 "The documented bradycardia requiring hospital admission and medication adjustment confirms the seriousness of his condition."; "The transport was via the 911 system in response to an emergency call, which supports the medical urgency."; §5 "The patient's condition at the scene when the ambulance arrived". New error: §3 "[Cite: Medicare's National Coverage Determination (NCD) 20.4 or the Local Coverage Determination (LCD) for ambulance services, which this patient's presentation meets; request the policy text if criteria are unclear.]" | The time-of-transport framing and the ED-as-corroboration framing are now right. But **NCD 20.4 is Implantable Cardiac Defibrillators**: an invented citation in the doctor's letter. Ambulance criteria are 42 CFR 410.40(e)(1) and Medicare Benefit Policy Manual ch. 10. CMS's emergency list ("Showed signs and symptoms of acute respiratory or cardiac distress…", "Was unconscious or in shock") is still unused. Minor (credibility); the citation guard should catch it. |
| I-8 | Minor | Partly fixed | Fixed: §1 "not that your father did not meet it, but that the documentation did not show it." Still wrong: §1 "Medicare denied the claim because the ambulance service did not submit documentation of those facts with the claim."; §4 "Medicare billed Dad $1,398.10 for the ambulance." | The first is still a guess stated as fact. In the second, Medicare billed nothing: Tri-County did, and the MSN shows a maximum. |
| I-9 | Minor | Partly fixed | Fixed: §7 "while the Medicare redetermination is pending? The deadline is February 11, 2027." Still wrong: §7 "Will your company submit documentation to Medicare to support the medical necessity of the ambulance transport" | "We need 120 days" is gone. There is still no request that the supplier ask for a reopening (405.980(c)) or file its own redetermination. Instead, the kit asks for an orphan submission (see I-4). |
| I-10 | Minor | Fixed | §2: "Enclosed: CMS-1696 Appointment of Representative form"; §9: "[Your father's signature or your signature with Appointment of Representative form]" | Caveat (Minor): §1's "(or send a signed letter authorizing you to act on your father's behalf)" works only if the letter meets 405.910(c), including signature by both father and daughter. |
| I-11 | Minor | Not fixed | §2: "the name, credentials, and specialty of the reviewer" | The ERISA-style request remains. §6 still names no number to call; 1-800-MEDICARE is only in §1 and §10. §2's enclosure list still omits the MSN, which the notice says to circle and mail. |
| I-12 | Minor | Fixed | §8: "[Prepare a second letter on the same template addressed to:]" Westbrook Regional Medical Center | |
| I-13 | Minor | Partly fixed | Fixed: JSON "plan_type": "original-medicare". Still wrong: §2 "admitted him overnight for cardiac monitoring and medication adjustment" | The source says "They kept him overnight, adjusted his medicines". "Admitted" (versus observation) and "for cardiac monitoring" are still unverified, now in the daughter's signed letter. There is still no Medigap, Medicaid or QMB question. |

### 2. New findings in run 21

**No new Critical or Major.** New Minors:

| # | Severity | Section | Exact quote | Why it matters | Fix |
|---|---|---|---|---|---|
| I-N1 | Minor | §3 | "The family reports the patient's mobility was severely limited and that his spouse does not drive." | The family said something more specific: "Dad couldn't have sat up in a car". That maps onto CMS's "Could be moved only by stretcher"; the vaguer rewording loses it. Run 16 had it right ("could not sit upright"). | "The family reports he could not have sat upright in a car, and his wife does not drive." |
| I-N2 | Minor | §10, §4 | "that is 120 days from the notice date, as printed on the letter"; "Medicare has 60 days to decide once they receive everything."; "ask whether they can provide a physician letter (section 4)" | The date is right, but the arithmetic is wrong: Feb 11 is 120 days from presumed receipt (5 days after the notice; 405.942(a)(1)), not from the notice date. The 60-day clock runs from receipt of the request, and each later submission adds up to 14 days (405.950). The physician letter is §3, not §4. | Correct the three phrases. |
| I-N3 | Minor | §8 | "under his right of access to medical records" | The right of access is Harold's, but Renee signs the request. Simplest: Harold signs the request and directs copies to Renee. | Add a signature line for Harold. |

### 3. Could a physician sign §3?

**Yes, after four edits.** What is now right:
- routed "Attn: Redeterminations" and returned to the family to enclose;
- no peer-to-peer offer;
- no severity upgrades;
- family facts attributed;
- the charted values left in brackets.

Before anyone signs:
1. Replace the "NCD 20.4" citation with 42 CFR 410.40(e)(1) and CMS's listed emergency conditions (cardiac-distress signs such as chest pain; unconscious).
2. Restore the family's words, "could not have sat upright in a car".
3. Confirm from the chart that the stay was an admission with cardiac monitoring, or edit "[prompted/required] cardiac monitoring and hospital admission".
4. Fill the brackets from the trip report and ED record.

**What must change first (kit level):**
- I-4: stop routing the trip report and ED record straight to the MAC. Have them sent to Renee and enclose everything with the request, or ask Tri-County to file its own redetermination.
- I-1: correct the assignment sentence in §1 and §7.

**Deadlines and routing re-check:**
- Feb 11, 2027 is correct (405.942).
- The redetermination is decided within 60 days (405.950(a)).
- QIC reconsideration: request within 180 days of receipt, now stated exactly (405.962(a)). The QIC decides within 60 days (405.970(a)).
- ALJ hearing: request within 60 days of the QIC decision. The rule counts from receipt (405.1002(a)), so the kit's version is safe.
- Threshold: deferred to the decision letter, which is fine; it is $200 for 2026 and 2027.
- Routing is wrong only for the records (I-4).

---

## Kit J: insured ERISA plan, urgent pre-service IRF denial

### 1. Status of run-16 findings

| # | Run 16 | Status | Exact quote from run-21 kit | Note |
|---|---|---|---|---|
| J-1 | Critical | **Fixed** | §1: "you or the doctor can generally ask for an expedited external review at the same time as the expedited appeal, so you do not have to wait for the plan's answer." §9: "URGENT — you can request this NOW, at the same time as your expedited appeal, so you don't have to wait for the plan's decision."; "[If filing after a final internal denial, add: The internal appeal process has been exhausted; the plan's final denial is dated [date of final denial letter].]" §6: "The notice says I can request an expedited external review at the same time as the expedited appeal. How do I do that" | Matches the letter and 45 CFR 147.136(c)(2)(xiii) and (d)(3)(i)(A). |
| J-2 | Critical | **Partly fixed; now Major** | §3: "as [I / Dr. ___] documented on 10/26/2026"; "I am the treating physiatrist for Ms. Albright"; signature "[Robert Lindqvist, MD]". §4: "A pre-drafted appeal letter for Dr. Lindqvist (or the attending physician) to review, edit, sign, and send to Keystone". §5: "your 10/26/2026 consultation note" | The authorship claim is bracketed, and §3 is now written for Dr. Lindqvist. But §4 still offers the letter to the attending, who would then attest "I am the treating physiatrist". Downgraded from Critical: the false line is the signer's own opening self-identification under another doctor's name, so it is hard to miss. The kit still does not bind the letter to one signer. **Major.** |
| J-3 | Major | **Fixed** | §4: "Please call 1-888-555-0186 by Wednesday, November 4, 2026 (within 7 days of the October 28 denial) to discuss the case with Keystone's reviewer." §6: "(The notice says 1-888-555-0186 within 7 days of October 28, 2026 — confirm that.)" | The placeholder is gone, the date is printed, and the call is doctor-initiated. |
| J-4 | Major | Partly fixed (residual Minor) | Fixed: §1 "Nothing has been billed yet."; "Ask for an expedited appeal now: call 1-888-555-0172". Still wrong: §7 "Third, can you place the account on hold — no collections — while the appeal is pending?"; "Does the hospital have financial assistance or charity care if the appeal isn't successful and we have a large balance?"; §10 "Call the hospital's utilization-review office first to confirm whether they are appealing" | The misleading hold-harmless paragraph is gone, and the expedited call leads §1. Residue: a hold on an account that has no bill; a hinted "large balance"; §10's "first". Still unexplained: going to Lakeshore without approval, Lakeshore's network status, hospital days while awaiting transfer, and discharge before the 72-hour decision. |
| J-5 | Major | Partly fixed (residual Minor) | Fixed: §3 "She requires daily physician oversight for blood pressure management (labetalol being titrated) and for dysphagia with aspiration risk." Still wrong: §3 "She requires daily rehabilitation-physician involvement for blood-pressure titration (labetalol)"; §2 "Denise also requires daily physician oversight — specifically a rehabilitation physician —"; §3 "A skilled nursing facility is not recommended for this patient because it does not provide the intensive, coordinated three-discipline therapy program she requires" | "Not validated" and "one to two hours" are gone. The policy-matching rewording "rehabilitation-physician" is still there; that is acceptable as Dr. Lindqvist's own opinion, but not in Gary's letter. "Does not provide … three-discipline therapy" is overbroad, since SNFs offer PT, OT and SLP. "Intensive" is the real distinction, so cite the AHA/ASA IRF-over-SNF recommendation. |
| J-6 | Major | **Regressed: Major** | §3: "90 minutes on 10/24 and 10/25/2026 (when she was fatigued)"; §2 and §1: "when she was still fatigued and tolerated 90 minutes"; §5: "Therapy tolerance has progressed from 90 minutes on 10/25 (when she was fatigued)"; §3: "She is participating fully;" | Both run-16 quotes are gone, but a new misstatement of the same notes spread to four sections. The record: 10/24 "fatigued after sessions"; 10/25 "participating fully". Run 16's §3 had this right. The doctor's and Gary's signed letters now contradict the very 10/25 note the plan relied on. The kit also misses the stronger point: on 10/25 she completed all 90 scheduled minutes (30 PT / 30 OT / 30 SLP) with full participation. When sessions lengthened she did 130, then 165. Confirm with the therapists that 90 was the scheduled dose. **Major.** |
| J-7 | Major | Partly fixed (residual Minor) | Fixed: §8 "I am the husband of Denise R. Albright and am requesting copies of medical records under her right of access." (the "am authorized to act on her behalf" line is gone); "If an authorization form is needed, please send it to me immediately." | Residue: it still invokes "her right of access", which is hers, and is signed "Authorized representative" with no document attached. |
| J-8 | Minor | Not fixed | §3: "RE: Denise R. Albright, DOB 04/09/1963, Member ID KHP-77102935, Reference UM-IRF-2026-448190, Service requested 10/26/2026: Admission to an acute inpatient rehabilitation facility — Lakeshore Rehabilitation Institute." | No "EXPEDITED" and no physician urgency determination (29 CFR 2560.503-1(m)(1)(iii)). §4 asks the doctor to call 0172, which covers this only partly. |
| J-9 | Minor | Partly fixed | Fixed: "to arrive within 72 hours" and "must reach the plan by that date" are gone. Still wrong: §10 "(180 days from the October 28, 2026 notice, as your letter states). File your written appeal by this date"; §8 "These records are needed for an urgent insurance appeal with a deadline of April 26, 2027." | The letter states no date. On the expedited track the written materials should be faxed now; §2 still has no fax line. Telling the records office "April 26, 2027" invites a routine turnaround. |
| J-10 | Minor | Fixed | §2: "Her therapy tolerance has increased every day since then: 130 minutes on October 26"; §4: "nearly meeting the 3-hour criterion" | |
| J-11 | Minor | Fixed | §5: "Your reviewer denied inpatient rehab based on 90 minutes of therapy on October 25, four days after her stroke, but that information is now outdated." | |
| J-12 | Minor | Not fixed | §6: "The notice says I can call 1-888-555-0172 for that — is that correct, or can you transfer me now?" | §6 still names no number to dial. §1 covers this (0172 first). |
| J-13 | Minor | Fixed | §1: "the doctor can request it directly, and when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent" | Consistent with 29 CFR 2560.503-1(b)(4) and (m)(1)(iii). |
| J-14 | Minor | Partly fixed | §1: "the physiatrist's documented expectation that she will meet it within 2–3 days should satisfy "can reasonably be expected to participate."" | The prospective standard is now argued. The 15-hours-a-week benchmark is still absent (optional). The scheduled-dose point (J-6) is the bigger gap. |
| J-15 | Minor | Fixed | §3: "Diagnosis: [ICD-10 code(s) from the order — left middle cerebral artery ischemic stroke with right hemiparesis, expressive aphasia, and oropharyngeal dysphagia]" | |

### 2. New findings in run 21

**No new Critical.** The two Majors are J-6 (regressed) and J-2 (residual), both in the table above. New Minors:

| # | Severity | Section | Exact quote | Why it matters | Fix |
|---|---|---|---|---|---|
| J-N1 | Minor | §9 | "Complaints about this plan go to your state insurance department (the contact information is on your denial letter)." | False. The letter says only "regulated by your state's insurance department". | "Find your state insurance department's consumer line." |
| J-N2 | Minor | §5 | "She needs physical therapy, occupational therapy, and speech-language pathology; the goal is home discharge with her husband" (under the heading "At least five days per week") | A non sequitur: it doesn't address five days a week. | Give the planned IRF schedule, or drop the bullet. |
| J-N3 | Minor | §6 | "[Only if this has happened: "Please note on the account that I called today to request an expedited appeal" | A rewrite artifact. It has an unbalanced quotation mark and a condition that doesn't fit a live call. | Plain sentence; no condition. |
| J-N4 | Minor | §7 | "you may have a form I can sign so I'm your authorized representative" | Backwards. Signing the hospital's form makes the hospital Denise's representative, not Gary the hospital's. | "…a form so the hospital can appeal on Denise's behalf". |
| J-N5 | Minor | §3 | "I will call the peer-to-peer line at 1-888-555-0186 within 7 days of the denial notice date to discuss this case."; "making discharge to home — her stated goal — unattainable" | The first is a promise in the signed letter that is false if he doesn't call or signs after Nov 4. The second overstates the risk. The run-16 10/27 functional status (moderate-assist transfers, max-assist toileting) was dropped and would help. | Make the promise conditional or drop it; write "less likely"; restore the 10/27 function. |

### 3. Could a physician sign §3?

**Dr. Lindqvist: yes, after edits. Dr. Vasquez: no**, because it opens "I am the treating physiatrist" over Dr. Lindqvist's signature block.

The rest of the clinical paragraph matches the PM&R consult: strength 2/5 and 3/5, aphasia, dysphagia, labetalol, "medically stable for transfer", and discharge home.

Edits before Dr. Lindqvist signs:
1. Replace "90 minutes on 10/24 and 10/25/2026 (when she was fatigued)" with "90 minutes on 10/24 (fatigued after sessions) and 90 minutes on 10/25 (participating fully)". If the therapists confirm, add that 90 minutes was the scheduled dose. Change "She is participating fully" to the 10/27 note's words.
2. Add "EXPEDITED" and an urgency statement ("the standard timeframe would seriously jeopardize her ability to regain maximum function").
3. Make the peer-to-peer promise conditional.
4. Restore the 10/27 function.

**What must change first (kit level):**
- J-6: correct the 10/25 "fatigued" statement in §1, §2, §3 and §5.
- J-2: bind §3, §4 and §5 to one signer, or bracket the specialty.

**Deadlines and routing re-check:**
- Phone and fax lines (0172 / 0179 / 0186 / 0100) are bound to the right parties.
- Peer-to-peer by Wednesday, Nov 4, 2026, which is correct.
- Expedited decision within 72 hours ((i)(2)(i)).
- Concurrent expedited external review is now offered.
- April 26, 2027 is correct (conservatively counted from the notice date).
- External review: within 4 months, and binding.

---

## Patterns across the engine
- **Fixed:** the number-placeholder rewrite (J's 0186), the "not validated" rewrite (absent from both kits), Original Medicare peer-to-peer leakage, and invented power-of-attorney claims.
- **Still present:**
  - Record wording is changed to fit an argument: J's "fatigued" for 10/25, "rehabilitation-physician", and I's "mobility was severely limited".
  - Evidence routing is not tied to the request: I's records go straight to the MAC.
  - The two-signer problem persists: J §4 versus §3.
- **New:** an invented regulatory citation (I's "NCD 20.4"). Add a citation whitelist.

## Sources
- [42 CFR 414.610](https://www.law.cornell.edu/cfr/text/42/414.610)
- [42 CFR 410.40](https://www.law.cornell.edu/cfr/text/42/410.40)
- [42 CFR 405.910](https://www.law.cornell.edu/cfr/text/42/405.910)
- [42 CFR 405.942](https://www.law.cornell.edu/cfr/text/42/405.942)
- [42 CFR 405.950](https://www.law.cornell.edu/cfr/text/42/405.950)
- [42 CFR 405.962](https://www.law.cornell.edu/cfr/text/42/405.962)
- [42 CFR 405.970](https://www.law.cornell.edu/cfr/text/42/405.970)
- [42 CFR 405.980](https://www.law.cornell.edu/cfr/text/42/405.980)
- [42 CFR 405.1002](https://www.law.cornell.edu/cfr/text/42/405.1002)
- [CMS redetermination](https://www.cms.gov/medicare/appeals-grievances/fee-for-service/first-level-appeal-redetermination-medicare-contractor)
- [CMS MLN ambulance](https://www.cms.gov/training-education/medicare-learning-networkr-mln/compliance/medicare-provider-compliance-tips/ambulance-services)
- [NCD 20.4 (ICDs)](https://www.cms.gov/medicare-coverage-database/view/ncd.aspx?NCDId=110)
- [29 CFR 2560.503-1](https://www.law.cornell.edu/cfr/text/29/2560.503-1)
- [45 CFR 147.136](https://www.law.cornell.edu/cfr/text/45/147.136)
- [AHA/ASA rehab recommendations](https://www.strokeassociation.org/-/media/Stroke-Files/Stroke-Resource-Center/Recovery/Provider-Focused/Adult-Stroke-Rehab-and-Recovery-Guidelines-Key-Recommendations-for-The-Rehab-Program-ucm_496011.pdf)
