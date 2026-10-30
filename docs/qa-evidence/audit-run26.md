# Third audit: run 26 (engine v9.12.1), held-out kits I and J

**Auditor and severity key:** the same independent reviewer role, severity key and calibration as `audit-run16.md` (run 16) and `audit-run21.md` (run 21).

**What I read:**
- `I-source.txt` and `J-source.txt`: the only facts the kits may use.
- `I-kit-run26.md` and `J-kit-run26.md`: every section, §1 to §10, and the JSON block.
- `audit-run16.md` and `audit-run21.md`.
- Nothing else. I opened no checker, checker output, QA write-up, repository file or other scratchpad file.

**How I checked:** I checked every rule the kits state against primary text: eCFR (via Cornell LII), CMS manuals and pages, the NAIC external review model act (DOL-hosted copy), and the AHA/ASA rehabilitation recommendations. Each routing row cites its rule, and the URLs are listed at the end. Every quote in this audit was machine-checked with `grep -F` (method and result at the end).

**Review date:** Friday 2026-10-30.

**Severity key:**
- **Critical:** could cause a missed deadline, delayed urgent care, or a clinician signing a false statement.
- **Major:** likely to lose the appeal or mislead the patient.
- **Minor:** credibility or polish.

**Calibration:** a clinical characterization that the signer must check against the chart anyway is Major. A false statement about the signer's own act, or a step that lengthens an urgent timeline, is Critical.

**Scope:** every earlier finding is graded below: run 16's I-1 to I-13 and J-1 to J-15, and run 21's I-N1 to I-N3 and J-N1 to J-N5. New findings are numbered I-R3-n and J-R3-n. As in run 21, the Minor count includes the residues of partly fixed items.

## Bottom line

| Kit | Run 16 (C / M / m) | Run 21 (C / M / m) | Run 26 Critical | Run 26 Major | Run 26 Minor | Most important remaining defect |
|---|---|---|---|---|---|---|
| I | 0 / 4 / 9 | 0 / 2 / 10 | **0** | **1** | 11 | The doctor's letter again asserts what the trip report has to prove: "syncope with ongoing chest pain and diaphoresis constituted a potentially life-threatening cardiac emergency". The daughter's letter adds that he "has abnormal vital signs". |
| J | 2 / 5 / 8 | 0 / 2 / 12 | **0** | **3** | 18 | The external-review branch of the urgent path. The kit would fax the concurrent request to the plan, which may not file it, and its fallback is a standard 4-month review with no request for expedited handling. The doctor's letter also says she "can now tolerate" the 3-hour program; her best day is 165 minutes. |

Run 16 stated only Critical and Major counts; its Minor counts above are the number of Minor rows in its tables.

**Better since run 21:**
- I: the assignment rule is right in §1 and §7 (I-1). The decisive records now go in with the request; one optional fax line is left (I-4). Tri-County is asked to file its own redetermination (I-9). The invented NCD citation is gone (I-7).
- J: the 10/25 misstatement (*fatigued*) is gone (J-6). §3 is now signer-neutral, so either doctor can sign it after edits. The peer-to-peer number, date and doctor-placed call are right in §4, §6, §7 and §10 (J-3). The concurrent expedited external review is still offered (J-1).

**Worse since run 21:**
- I: a severity upgrade in the physician's voice is back in §3 (I-3, regressed, Major).
- J: there are two new Majors: overstated tolerance in §3 and §5 (J-R3-1), and the external-review branch (J-R3-2). The two-signer problem moved from §3 into the peer-to-peer script (J-2, still Major). The phrase *not validated* is back in §5 (J-5). An inference is again stated as fact in Gary's letter (J-11).

**Neither kit has a Critical.** J-R3-2 comes closest. It is borderline Critical, and I graded it Major because the main path is stated correctly and the plan's final notice must describe expedited review.

---

## Kit I: Original Medicare Part B ambulance (A0427 ALS1-emergency + A0425 ×14), daughter filing

### 1. Status of earlier findings

| # | Raised | Run 21 | Run 26 status | Exact quote from run-26 kit | Note |
|---|---|---|---|---|---|
| I-1 | Run 16, Major | Not fixed | **Fixed** | §1: "the ambulance company must accept Medicare's approved amount as payment in full (every ambulance claim is paid on assignment)". §7: "Since every ambulance claim is paid on assignment, what would Dad owe if Medicare approves it?" | This matches 42 CFR 414.610(b): suppliers "must accept the Medicare allowed charge as payment in full" and "may not bill or collect from the beneficiary any amount other than the unmet Part B deductible" and coinsurance. The participation question is gone from §7. Polish only: the MSN says "You have met your Part B deductible for 2026.", so the deductible clause can go. |
| I-2 | Run 16, Major | Fixed | **Fixed (holds)** | Absent: the kit makes no power-of-attorney claim. §7 opens "Hello, my name is Renee Pruitt-Cole and I'm calling about my father Harold W. Pruitt". | |
| I-3 | Run 16, Major | Fixed in §3 and §9; Minor lay residue | **Regressed: Major** | §3: "syncope with ongoing chest pain and diaphoresis constituted a potentially life-threatening cardiac emergency". The very next sentence is a bracket: "[The trip report documents bradycardia of ___ bpm, blood pressure of ___, and ongoing symptoms during transport.]" §2: "is having active chest pain, appears gray and diaphoretic, and has abnormal vital signs". §1: "A patient with syncope, ongoing chest pain, diaphoresis, and bradycardia cannot safely sit upright". | The run-16 words are gone, but a new upgrade is back in the physician's own voice. It follows the pattern run 16 flagged: a bracket marks the fact as unverified, and the sentence before it asserts the fact anyway. The family said only "When he came to he was gray and sweaty and said his chest hurt." Nobody has said the pain was still present when the crew arrived, or what the scene vital signs were. The only known vital sign is the ED's "very slow" heart rate, found after transport. Coverage turns on his condition at the time of transport, so the trip report has to prove "ongoing"; the letter cannot assume it. The signer must check this characterization against the chart, so it is **Major** under the calibration. The daughter's signed letter (§2) states an unknown fact. §5's checklist presumes the same ("abnormal vital signs — particularly the heart rate"). |
| I-4 | Run 16, Major | Partly fixed (Major) | **Partly fixed (residual Minor)** | Fixed: §1 "you will mail them with the redetermination request to the address above"; §4 "return the signed letter to the family. They will mail it with the ambulance trip report and hospital records to the address above by February 11, 2027"; §10 "all together to the address on the notice". Residue: §4 "If you prefer, your office can fax the letter and records directly to the Medicare contractor and send the family a copy for their records." | The decisive records now travel with the request, as CMS directs: "The appellant should include with their redetermination request any and all documentation". The §4 option recreates a separate filing, and the MSN prints no fax number. A fax that lands before the request has nothing to attach to. One that lands after it extends the decision by up to 14 days per submission (405.946(b); 405.950(b)(3)). *Delete the option, or have the office fax the letter to the family.* |
| I-5 | Run 16, Minor | Fixed | **Fixed (holds)** | §4: "Medicare contractors decide redeterminations on the written record without a peer-to-peer call". §5: "There is no peer-to-peer review at the redetermination level." | This is consistent with CMS's redetermination page, which describes no hearing or peer-to-peer. |
| I-6 | Run 16, Minor | Fixed | **Fixed (holds)** | Absent: the phrase *not validated* does not appear in this kit. | The regulation's own word, *contraindicated*, is still unused (see I-7). |
| I-7 | Run 16, Minor | Partly fixed (new invented NCD 20.4) | **Partly fixed** | Fixed: §3 "[Cite: Medicare's ambulance coverage criteria (Medicare Benefit Policy Manual, Chapter 10, Section 10.2)". Still weak: §3 "Medicare's notice states that ambulance service is covered"; §3 "This transport met the standard of care for evaluation of syncope with chest pain." | The citation is now real: BPM ch. 10 §10.2 is the necessity section. But the letter argues from the MSN's lay paraphrase instead of the rule: "other means of transportation are contraindicated" (42 CFR 410.40(e)(1)). It still skips the manual's presumption, which fits Harold exactly. The MAC "presumes the requirement was met if the submitted documentation indicates that the patient:" "Was unconscious or in shock;" or "Exhibits signs and symptoms of acute respiratory distress or cardiac distress such as shortness of breath or chest pain;" (BPM ch. 10 §20, Condition 2(a)). The kit requests no 911 or dispatch record, though an ALS assessment rests on "the patient's reported condition at the time of dispatch" (42 CFR 414.605). The "standard of care" sentence uses a malpractice frame, not the coverage test. |
| I-8 | Run 16, Minor | Partly fixed | **Partly fixed** | Now hedged: §1 "The ambulance company's trip report likely did not document the findings Medicare looks for." Still wrong: §4 "Medicare has billed Mr. Pruitt $1,398.10 for medically necessary emergency transport." | Medicare billed nothing. Tri-County billed, and the MSN shows a "Maximum You May Be Billed". There is still no step asking Tri-County which diagnosis codes and records it sent with the claim. The MSN says only "the information provided does not show". |
| I-9 | Run 16, Minor | Partly fixed | **Fixed** | §7: "Second, will your company also be filing its own redetermination request with Medicare?" §1: "The ambulance company can also file its own redetermination request with the same documentation." | Tri-County is a party: "A supplier who has accepted assignment for items or services furnished to a beneficiary that are at issue in the claim." (405.906(a)(2), (b)(1)). Separate requests are consolidated (405.944(c)). One point for the kit to add: the 60 days then run from "the latest filed request" (405.950(b)(2)), so a late filing by Tri-County delays the decision. |
| I-10 | Run 16, Minor | Fixed (caveat) | **Fixed (holds)** | §2: "Enclosures: CMS-1696 Appointment of Representative form". §10: "mail it with your redetermination request". | The form is filed with the request, as 405.910(c)(7) and (e) require. Wording residue, not counted: §1 says "a representative form comes first". That is harmless here, but the form goes with the request, not first. Harold is well and could also sign the request himself. If the form is used, it must be "signed and dated by both the party and individual agreeing to be the representative" (405.910(c)(1)). |
| I-11 | Run 16, Minor | Not fixed | **Partly fixed** | Fixed: §10 "circle the denied services on this notice or copy the relevant page and circle them there". Still: §2 "the name, credentials, and specialty of the reviewer". §6 names no number to call. | 1-800-MEDICARE appears only in §1 and §10. §2's enclosure list still omits the circled MSN. A MAC owes no disclosure of the reviewer's credentials. |
| I-12 | Run 16, Minor | Fixed | **Fixed (holds)** | §8, second letter: "I need the following records: emergency department triage notes, vital signs, physician notes, test results, admission orders" | Rhythm strips and the discharge summary could be named; "test results" covers them. |
| I-13 | Run 16, Minor | Partly fixed | **Not fixed (beyond the JSON)** | §2: "He was admitted overnight, and his medications were adjusted." §3: "The patient required hospital admission [on date] for [number of days] for management of bradycardia and medication adjustment." §1: "the ER found a very slow heart rate requiring admission and medication adjustment". | The source says "They kept him overnight, adjusted his medicines". Whether that was an admission or observation is unverified, and the claim is now unbracketed in the doctor's letter too. §2's own bracket says "the decision to admit for observation". There is still no question about Medigap, Medicaid or QMB coverage, which decides who pays the 20% after a win. The JSON's "original-medicare" holds. |
| I-N1 | Run 21, Minor | — | **Fixed** | §3: "the patient could not have sat upright in a car". §2: "He could not have sat upright in a car for a 14-mile trip". | The family's own words are back. The same §3 sentence adds the fact that his wife does not drive (I-R3-1). |
| I-N2 | Run 21, Minor | — | **Partly fixed** | Fixed: §10 "generally decides a redetermination within 60 days of receiving the request"; §10 "ask the treating physician for a letter if available (section 3)". Not fixed: §10 "(120 days from the notice date as printed on the letter)". | February 11 is 120 days from presumed receipt on Wednesday, October 14 (405.942(a)(1)). Counting 120 days from the October 9 notice date gives Saturday, February 6. The date is right; the explanation is not. |
| I-N3 | Run 21, Minor | — | **Not fixed** | §8: "under the patient's right of access to medical records"; "My Medicare Appointment of Representative form (CMS-1696) is enclosed." §1: "you may need to complete the provider's medical-records release form as Harold's authorized representative" | The right of access is Harold's, and Renee signs alone. A CMS-1696 includes a statement "authorizing the adjudicator to release identifiable health information to the appointed representative." (405.910(c)(2)). That authorizes Medicare's adjudicator. It does not make Renee Harold's HIPAA personal representative (45 CFR 164.502(g)(2)). For records to be sent to her, the request must be "signed by the individual" (164.524(c)(3)(ii)). §6 has the same problem: 1-800-MEDICARE needs Harold's permission to discuss his claim with her (form CMS-10106). The simplest fix is for Harold to sign both records requests and be on the line for the §6 call. |

### 2. New findings in run 26

**No new Critical or Major.** This kit's one Major is I-3, which regressed (above). New Minors:

| # | Severity | Section | Exact quote | Why it matters | Fix |
|---|---|---|---|---|---|
| I-R3-1 | Minor | §3 (and §2) | §3: "The family reports the patient's wife does not drive and the patient could not have sat upright in a car." §2: "My mother does not drive." | Whether another ride existed does not count: "In any case in which some means of transportation other than an ambulance could be used without endangering" "the individual's health, whether or not such other transportation is actually available," "no payment may be made for ambulance services." (BPM ch. 10 §10.2.1). Placed in the physician's criteria paragraph, the fact about his wife invites the reviewer to read the trip as a ride taken for lack of a driver. It has been in the kit since run 21, inside I-N1's quote, but was not graded. | *Delete the clause about his wife from §3. In §2, keep the sentence that he could not have sat upright in a car, and drop the last sentence.* |
| I-R3-2 | Minor | §10 (and §4, §6) | §10: "The Medicare contractor must receive the signed request and all supporting documentation by that date." §6: "Next step: Mail redetermination request with records by February 11, 2027". §4: "They will mail it with the ambulance trip report and hospital records to the address above by February 11, 2027." | Two deadline misstatements, both pointing the wrong way. First, evidence need not arrive by the filing deadline. The request "should include any evidence that the party believes should be considered by the contractor" (405.946(a)), and later submissions are allowed, each adding up to 14 days (405.946(b)). The kit says "Do before you file" and gives no fallback, so a family still waiting on Tri-County's trip report may hold the request past February 11. Second, a request mailed on February 11 misses the MSN's deadline: "We must receive your appeal by: February 11, 2027". | *Mail the request by about January 25, with tracking, so it arrives by February 11. If a record is still missing then, file anyway and send the record when it comes.* |
| I-R3-3 | Minor | §9 | "If the QIC invites additional evidence, you can send a short cover note:" | The QIC does not invite evidence; the party sends it with the request: "When filing a request for reconsideration, a party should present evidence and allegations of fact or law" (405.966(a)). A beneficiary filing alone is not barred from sending more later (405.966(c)(1)), but each later submission adds up to 14 days (405.966(b)). If Tri-County ends up representing Harold, late evidence can be excluded: "Beneficiaries who are represented by providers or suppliers must comply" (405.966(c)(2)). | *Send this note and any new evidence with your reconsideration request.* |
| I-R3-4 | Minor | §4 | "A pre-drafted letter requesting reconsideration of Medicare's denial of the ambulance transport on August 26, 2026." | This names the wrong level. Reconsideration is the QIC step (§9); this letter supports a redetermination. If the office labels it a reconsideration, it may be misfiled. | *requesting redetermination* |

### 3. Could a physician sign §3?

**Not as written. A physician could sign it after five edits.**

What is now right:
- it is addressed "Attn: Redeterminations" and returned to the family to enclose;
- it makes no peer-to-peer offer;
- the family's account is attributed ("The patient's family reports");
- the vital signs are left in brackets;
- the manual citation is real;
- "could not have sat upright in a car" is restored.

Edits before anyone signs:
1. **Chest pain at transport.** Confirm from the trip report that the pain was still present when the crew arrived, or delete *ongoing*. If the pain had resolved, rest the case on the loss of consciousness and his inability to sit up. The general sentence that follows ("is experiencing active chest pain") needs the same check.
2. **The bradycardia bracket.** Delete the bracket that begins "[The trip report documents bradycardia" unless the crew recorded bradycardia. Present the ED's heart rate as corroboration found after transport.
3. **Admission or observation.** Replace "required hospital admission" with what the chart shows.
4. **The rule.** Replace the MSN paraphrase and the "standard of care" sentence with the regulation's test: "other means of transportation are contraindicated" (410.40(e)(1)). Add the manual's presumption. The syncope fits "Was unconscious or in shock;" and the chest pain fits "Exhibits signs and symptoms of acute respiratory distress or cardiac distress such as shortness of breath or chest pain;" (BPM ch. 10 §20, Condition 2(a)). If the trip report bears it out, the family's account that he could not sit up fits "Could be moved only by stretcher;".
5. **His wife's driving.** Delete the clause (BPM ch. 10 §10.2.1).

The signer should be the ED or admitting physician from August 26. Another physician can sign it with the words *based on my review of the trip report and ED record*, and the letter's attributed structure already supports that.

**What must change first (kit level):**
- I-3: remove the unverified chest-pain and vital-sign assertions from §1, §2, §3 and §5.
- I-R3-2: fix the deadline wording and add a fallback to file even if records are missing.
- I-4 residue: drop the office-fax option in §4.

### 4. Routing, deadlines and decision timeframes (Original Medicare Part B)

| Rule | What the kit says | Primary text | Verdict |
|---|---|---|---|
| Appeal level and who decides | §2: "This is a formal request for redetermination". §4: "Medicare contractors decide redeterminations on the written record without a peer-to-peer call" | CMS redetermination page: a review of the claim by MAC staff who were not involved in the initial determination; no hearing or peer-to-peer is described | Right |
| Where to send | §2 and §3 copy the MSN's "Attn: Redeterminations" P.O. box exactly | MSN: "Mail this notice and any supporting information to:" | Right. Only the §4 fax option strays (I-4). |
| Content of the request | §2's RE block: name, Medicare number, claim, services, date of service, representative | 42 CFR 405.944(b)(1)–(4) | Right |
| Filing deadline | §10: "Thursday, February 11, 2027" | 405.942(a), (a)(1): 120 days from receipt, presumed 5 days after the notice. October 14 + 120 days = Thursday, February 11, 2027. | The date and weekday are right; the explanation is wrong (I-N2). The mail-by wording in §4 and §6 is wrong (I-R3-2). |
| Evidence timing | §10: "must receive the signed request and all supporting documentation by that date" | 405.946(a)–(b): evidence "should" go with the request; later submissions are allowed, each adding up to 14 days | Overstated (I-R3-2) |
| Decision clock | §10: "generally decides a redetermination within 60 days of receiving the request" | 405.950(a): "within 60 calendar days of the date the contractor receives" a timely request. (b)(2): when several parties file, the clock runs from the latest filed request. (b)(3): up to 14 more days per later submission. | Right |
| Expedited review | §1: "No — standard review (care already received)." | The care is complete, so no expedited track applies. | Right |
| Next level | §10: "generally within 180 days of receiving that decision". §9: "The QIC decides on the written record, without a hearing." | 405.962(a): "any request for a reconsideration must be filed within 180 calendar days" from receipt. 405.968(a)(1): "A reconsideration consists of an independent, on-the-record review of an initial determination". For medical necessity, the review is by "a panel of physicians or other appropriate health care professionals". | Right. §9 frames evidence wrongly (I-R3-3). |
| External review | §10: "there is no separate external review for Original Medicare" | 405.906(b): "The parties to the redetermination, reconsideration, proceedings on a request for hearing, and Council review are—" | Right |
| What the patient may owe | §1: if approved, Medicare's amount is payment in full and he pays the 20% coinsurance; if denied, "the notice's maximum applies" | 414.610(b) (above). CMS Claims Processing Manual ch. 30 §20.2 lists "Ambulance services denied because transportation by other means is not contraindicated" among denials where limitation of liability does not apply. §40.3: "Ambulance companies may not give written notices to beneficiaries (or authorized representatives) in any emergency transport". | Right (I-1 fixed) |
| Peer-to-peer | §4 and §5: none at redetermination | The CMS page describes none. | Right |
| Who may file | §1: "The ambulance company can also file its own redetermination request with the same documentation." | 405.906(a)(2), (b)(1); consolidation under 405.944(c) | Right (I-9) |
| Representative form | §2 encloses the CMS-1696; §10 says "mail it with your redetermination request" | 405.910(c)(1) requires both signatures, (c)(7) filing with the entity, and (e) a copy with the appeal request | Right. The kit does not mention that Harold could sign the request himself. |
| Coverage standard | §3 quotes the MSN's summary and cites BPM ch. 10 §10.2 | 410.40(e)(1): "other means of transportation are contraindicated". BPM ch. 10 §10.2.1; §20 Condition 2(a) presumptions; ALS assessment per 414.605 | The citation is right. The argument is incomplete (I-7), and his wife's driving is irrelevant (I-R3-1). |
| Records access | §8: "Please send the records within 30 days" | 45 CFR 164.524(b)(2)(i): act "no later than 30 days after receipt of the request" | The timing is right; the authority is wrong (I-N3). |

---

## Kit J: insured employer (ERISA) plan, urgent pre-service IRF denial after stroke, husband filing

### 1. Status of earlier findings

| # | Raised | Run 21 | Run 26 status | Exact quote from run-26 kit | Note |
|---|---|---|---|---|---|
| J-1 | Run 16, Critical | Fixed | **Fixed (holds)** | §1: "you or the doctor can generally ask for an expedited external review at the same time as the expedited appeal, so you do not have to wait for the plan's answer." §10: "Tell them you are requesting an expedited appeal and an expedited external review at the same time." | This matches the letter ("You may also request an expedited external review at the same time as your expedited appeal.") and 45 CFR 147.136(c)(2)(iii). Under that rule, exhaustion is unnecessary where "the claimant has applied for expedited external review at the same time as applying for an expedited internal appeal." Where to file the request, and the fallback branch, are new problems (J-R3-2). |
| J-2 | Run 16, Critical | Partly fixed; Major | **Partly fixed; Major remains (moved to §5)** | §3, fixed: "I am the treating [specialty — attending physician or physiatrist] for Ms. Albright"; "She is expected to participate in 3 hours of therapy per day within 2–3 days of the 10/26/2026 consultation." §5 opening, residue: "she is expected to participate in three hours of therapy per day within 2–3 days of my October 26 consultation." | §3 is now signer-neutral, so either doctor can sign it after edits. But the §5 script, written for "[your name], [specialty]", makes the caller the author of Dr. Lindqvist's consult. Dr. Vasquez is the requesting provider, and §1 names her as a possible caller: "Dr. Vasquez or Dr. Lindqvist provides the letter and takes the peer-to-peer call if offered". She would tell the plan's physician reviewer, who has the chart, that she wrote a consult she did not write. The statement is oral, not signed, so it is not Critical, but it is false and it concerns the speaker's own act. The two-signer split also shows in §2's enclosure example, "Dr. Vasquez's letter", against §1's "the physiatrist's letter". **Major.** |
| J-3 | Run 16, Major | Fixed | **Fixed in §4, §6, §7 and §10; Minor residue in §1** | §4: "Please call the plan's physician reviewer at 1-888-555-0186 within 7 days of October 28, 2026 (by November 4, 2026)." §1 residue: "takes the peer-to-peer call if offered". | The letter makes the call the doctor's to place: "Your doctor may discuss this decision with our physician reviewer by calling 1-888-555-0186 within 7 days of the date of this notice." §1 frames it as waiting for an offer again. Wednesday, November 4 is also only the outer limit. With discharge a day or two away, the call belongs today or tomorrow, before she leaves. The phrase "by November 4" (§4, §7, §10) invites a call after discharge. |
| J-4 | Run 16, Major | Partly fixed (residual Minor) | **Partly fixed (residual Minor)** | Fixed: §1 "Nothing has been billed yet."; "if she goes to the IRF without approval, the plan would not cover it and you would be responsible for the full IRF charges." Still: §7 "Second, can you place the account on hold — no collections — while the appeal is pending?"; §7 "would the hospital bill us for the full amount, or is there a limit because you're in-network?"; §7 "Riverside General Hospital — billing office or patient financial services". | The risk of going to Lakeshore without approval is now explained. Still wrong: a hold on an account with no bill, and a question that treats Riverside as the biller for Lakeshore's care. The hospital call now goes to billing, which cannot fax therapy notes or reach the doctors, and October 31 is a Saturday. The case manager, who can do both and can say whether she may stay until the decision, is never named. Still not addressed: hospital days while waiting, discharge before the 72-hour decision, and Lakeshore's network status. |
| J-5 | Run 16, Major | Partly fixed (residual Minor) | **Partly fixed; the *not validated* part regressed (Minor)** | Fixed: §3 "requires daily physician oversight for blood pressure management (labetalol being titrated) and for dysphagia with aspiration risk". Regressed: §5 "It is not validated to deliver the intensity of therapy". Unsourced: §3 "A skilled nursing facility does not provide three hours of therapy per day at least five days per week under a rehabilitation physician", followed by the placeholder "[Cite: the relevant specialty-society guideline". | The record's own words are used now, and intensity is the right distinction. The rewordings that matched the policy and the overbroad three-discipline claim are gone. But the *not validated* rewrite is back in the doctor's script, and the categorical claim about SNFs (also in §1, §2, §5 and §9) still has no source. Sources exist. AHA/ASA says eligible stroke patients "should receive treatment in an IRF in preference to a skilled nursing facility (SNF)." In an IRF, a rehabilitation physician must see the patient face to face at least 3 days a week (42 CFR 412.622(a)(3)(iv)). In a nursing facility, a physician visits "at least once every 30 days for the first 90 days after admission" (42 CFR 483.30(c)(1)). |
| J-6 | Run 16, Major | Regressed: Major | **Fixed** | Absent: *fatigued* appears nowhere. §3: "The plan's reviewer noted that on 10/25/2026 Ms. Albright participated in 1.5 hours of therapy." | No therapy note is misdescribed now. The stronger 10/25 point is still unused (J-14). A different overstatement of the same record has appeared (J-R3-1). |
| J-7 | Run 16, Major | Partly fixed (residual Minor) | **Partly fixed (residual Minor)** | §8: "I am exercising the patient's right of access under HIPAA. My authorization as her representative is enclosed."; "Enclosure: Authorization form". | A document is now enclosed, but the kit does not say which one, and the right of access is still Denise's. A plan's authorized-representative form does not make Gary her HIPAA personal representative (164.502(g)(2)). A request that Denise signs, naming Gary, would work (164.524(c)(3)(ii)). Faster still, the case manager can send the notes to the plan. |
| J-8 | Run 16, Minor | Not fixed | **Not fixed** | §3's RE line: "RE: Denise R. Albright, DOB 04/09/1963, Member ID KHP-77102935, Reference # UM-IRF-2026-448190, Service requested 10/26/2026". §3 never mentions expedited review or urgency. | The letter says "If your doctor tells us your situation is urgent, we will treat it as urgent.", and the rule binds the plan: "Any claim that a physician with knowledge of the claimant's medical condition determines is a" claim involving urgent care must be treated as one (29 CFR 2560.503-1(m)(1)(iii)). §4's "Please request an expedited appeal when you fax this letter" covers this only if the doctor does it. |
| J-9 | Run 16, Minor | Partly fixed | **Partly fixed** | Still: §8 "The appeal deadline is Monday, April 26, 2027."; §10 "Today or tomorrow:". §2's address block has no fax line. | In a records request marked "urgent", the April date invites a routine 30-day turnaround (164.524(b)(2)). The 72-hour clock starts with the phone call. If the new therapy notes arrive tomorrow, the plan may decide on the 10/25 record. *Fax the notes the same day as the call, and tell the 0172 line they are coming.* |
| J-10 | Run 16, Minor | Fixed | **Fixed (holds)** | §2: "130 minutes on 10/26/2026 and 165 minutes (2 hours 45 minutes) on 10/27/2026" | The self-contradicting series, the coverage threshold presented as a clinical recommendation, and the uncited literature claim are all gone. |
| J-11 | Run 16, Minor | Fixed | **Regressed (Minor)** | §2: "The record you reviewed stopped at 10/25/2026, when she participated in 90 minutes of therapy." §1: "the plan has not reviewed those dates yet". §4: "the plan has not reviewed those more recent dates yet". | An inference is again stated as fact, now in Gary's signed letter. The notice says only "The records submitted show the member participated in 1.5 hours of therapy on 10/25/2026." The request was dated 10/26, the day of the PM&R consult and the 130-minute session, so the plan may have had more. *Your decision cites only 10/25. Since then…* |
| J-12 | Run 16, Minor | Not fixed | **Not fixed** | §6 names no number before the script. The expedited request comes fifth: "Can I do that on this call, or do I need to call the expedited appeal line at 1-888-555-0172?" | §1 and §10 send Gary to the 0172 line first, but §6 is written for a different line and spends four questions before asking for the expedited appeal. |
| J-13 | Run 16, Minor | Fixed | **Fixed; Minor residue** | Fixed: §1 "The doctor can request the expedited appeal directly, and when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent." Residue: §1 "You are filing as Denise's husband and authorized representative — the representative form comes first." | A plan may "establish reasonable procedures" for proving Gary's authority. But in urgent care, a health care professional who knows her condition "shall be permitted to act as the authorized representative of the claimant" (2560.503-1(b)(4)). The words "comes first" contradict the call-first step a few lines below. It could cost a day getting a form signed by a patient with a 2/5 right arm and expressive aphasia. *Don't wait for the form. Call now. If the plan won't take your request without it, have the doctor call.* |
| J-14 | Run 16, Minor | Partly fixed | **Partly fixed (as in run 21)** | The forward-looking test is argued in §5: "She tolerated the sessions well and is expected to participate in 3 hours of therapy per day within 2–3 days." Still absent: the scheduled-dose point and the benchmark of 15 hours a week. | On 10/25 she did 30 + 30 + 30 minutes and was "participating fully". That was all the therapy offered, so the 90 minutes measured the schedule, not her tolerance; the therapists should confirm this. Medicare's IRF rule is judged "at the time of the patient's admission to the IRF." It also accepts "at least 15 hours of intensive rehabilitation therapy per week." (412.622(a)(3), (a)(3)(ii)). Her 130 to 165 minutes a day already exceed that. |
| J-15 | Run 16, Minor | Fixed | **Fixed (holds)** | §3: "[ICD-10 code(s) from the order — left MCA ischemic stroke with right hemiparesis and aphasia]" | |
| J-N1 | Run 21, Minor | — | **Not fixed** | §9: "contact your state insurance department — the number is on your denial letter or at naic.org." | The letter prints no number; it says only "regulated by your state's insurance department". The naic.org pointer is new and useful, but the false half should go. |
| J-N2 | Run 21, Minor | — | **Partly fixed** | §5: "She requires physical therapy, occupational therapy, and speech-language pathology five days per week." | The bullet now addresses its heading, but "five days per week" is not in the record, which says "Needs physical therapy, occupational therapy and speech-language pathology." The physiatrist can state it as his plan, but the script should not present it as charted. |
| J-N3 | Run 21, Minor | — | **Fixed** | Absent: the bracketed quotation with the unbalanced quotation mark is gone from §6. | A new bracket artifact in §6 is graded as J-R3-5. |
| J-N4 | Run 21, Minor | — | **Partly fixed** | §7: "If you're appealing, may I sign your authorized-representative form so we can coordinate one strong appeal?" | The request is no longer backwards. But Gary's authority to sign for Denise is unverified, and in urgent care the hospital's physician needs no form (2560.503-1(b)(4)). |
| J-N5 | Run 21, Minor | — | **Partly fixed** | Fixed: §3 "at risk for incomplete recovery, permanent functional deficits, and inability to return home". Not fixed: §3 "I will call the peer-to-peer line at 1-888-555-0186 within 7 days of the October 28, 2026 notice date (by November 4, 2026)." The 10/27 functional status is still absent. | The unconditional promise is false if the signer does not call, or if the other doctor makes the call. The 10/27 function is the best evidence that she requires an intensive program, and it is still unused: "Transfers bed to chair: moderate assistance of one." and "Toileting: maximal assistance." |

### 2. New findings in run 26

**No new Critical.** There are two new Majors (J-R3-1 and J-R3-2), which with J-2 make three in this kit. New findings:

| # | Severity | Section | Exact quote | Why it matters | Fix |
|---|---|---|---|---|---|
| J-R3-1 | **Major** | §3, §5 (echoed in §1) | §3: "the intensity Ms. Albright needs and can now tolerate". §5: "the current record shows she meets the intensity criterion"; "She already meets the IRF criteria". §1: "meeting the intensity criterion". | Her best day is 165 minutes, once, "with rest breaks". The physiatrist wrote that she is "expected to participate in 3 hours of therapy per day within 2–3 days". The plan's reviewer has the same notes and can uphold the denial on the number alone. The claim also gives away the kit's strongest point: the policy's test looks forward ("can reasonably be expected to actively participate in"), and so does Medicare's IRF rule ("at the time of the patient's admission to the IRF."). The signer must check this characterization against the chart. It is the same class as run-16 J-6 and run 21's 10/25 error, so it is **Major**. | Unless the 10/28 or 10/29 notes show 180 minutes or more: *has progressed from 90 to 165 minutes in three days and, per the PM&R consult, is expected to participate in 3 hours a day within 2–3 days, which is the plan's own test.* |
| J-R3-2 | **Major** | §9, §10 (and §1) | §9: "Call the plan's expedited appeal line (1-888-555-0172) to ask how to request expedited external review at the same time, or send this request with your appeal." §10: "The expedited appeal and the expedited external review request (section 9) can go together." §1: "The notice or the plan's appeals line can tell you how." §10: "If you did not request it at the same time, you may request external review within 4 months of the final denial letter". §9 template: "I request independent external review of the denial". | The external-review branch of the urgent path has three gaps. **(1) Where to file the concurrent request.** The notice does not say. An insured plan follows the state process (147.136(c)(1)(i)), and under the NAIC model a person "may make a request for an expedited external review with the commissioner" (§9.A). A request faxed to the plan with the appeal may therefore never be filed. §9's addressee is a body "named on your final denial letter", and that letter does not exist yet. **(2) Concurrency is not guaranteed.** Under the NAIC model, the reviewer "shall determine whether the covered person shall be required to complete the expedited review process" "before it conducts the expedited external review." (§7.B(1)(b)). **(3) The fallback is standard review.** If the concurrent request was never filed, §10 offers a 4-month window and §9's template asks for plain external review. Neither says to ask for expedited review on the day the plan upholds. The state process must offer expedited review when the standard timeframe "would seriously jeopardize" recovery (147.136(c)(2)(xiii); NAIC §9.A(2)). Followed as written, that branch puts a patient who is days from discharge into a standard review. This is borderline Critical. I graded it Major because the main path is stated correctly and the plan's final notice must describe expedited review. | §1 and §10: *Today, also call your state insurance department (find it at naic.org) and ask where and how to file an expedited external review.* §9: *put the word expedited in both branches, address the concurrent request to whoever the state names, and state the standard: the expedited appeal's timeframe would seriously jeopardize her ability to regain maximum function.* §10: *If the plan upholds, or the reviewer says the appeal must finish first, ask for expedited external review that same day. The 4-month window is for cases that are not urgent.* |
| J-R3-3 | Minor | §6, §10 | §6: "Does that start from when you receive the written appeal?" §10: "If they do not decide in time, call Member Services (1-888-555-0100) and ask for the status." | The 72 hours run from receipt of the request, which may be oral: "A request for an expedited appeal of an adverse benefit determination may be submitted orally or in writing" (2560.503-1(h)(3)(vi)(A)). The decision is due "as soon as possible, taking into account the medical exigencies," "but not later than 72 hours after receipt of the claimant's request for review" ((i)(2)(i)). The question invites a wrong yes. A missed deadline is also more than a reason to call about status. The claimant "is deemed to have exhausted the internal claims and appeals process of this paragraph (b)." and can go straight to external review (147.136(b)(2)(ii)(F)(1)). | *State both rules instead of asking.* |
| J-R3-4 | Minor | §1, §2, §7 | §1: "The plan approved a skilled nursing facility for subacute rehabilitation". §2: "approved only a skilled nursing facility (subacute rehabilitation)". | The letter approves nothing. It says only "Based on this information, a skilled nursing facility (subacute rehabilitation) is the appropriate level of care at this time." Gary's signed letter misstates the decision, and the family may assume a SNF bed is already authorized. §7 repeats the claim. | *said a skilled nursing facility is the appropriate level of care.* Ask the case manager whether a SNF stay would need its own authorization. |
| J-R3-5 | Minor | §4, §6 | §4: "give Gary Albright a copy for his records". §6: "[only if you hold this in writing: I'm her authorized representative], her husband Gary Albright." | The source gives only "I'm her husband, Gary."; §2 and §9 correctly write "Gary [last name]". If Gary deletes the §6 bracket as told, the sentence that is left begins with a comma. | *Gary [last name]*, and two plain sentences. |
| J-R3-6 | Minor | §9 | "The plan's policy requires the ability to participate in three hours of therapy per day at least five days per week with physician oversight." | This paraphrase goes to the independent reviewer. It drops "generally" and "can reasonably be expected to", and it turns "with the active involvement of a rehabilitation physician" into "physician oversight". That concedes a stricter, backward-looking test than the policy's own words. | *Quote the policy, as §1 does.* |

### 3. Could a physician sign §3?

**Yes, either doctor could sign it, after edits.** This is new. §3 is now signer-neutral: the specialty is bracketed, the 10/26 projection is attributed to "the 10/26/2026 consultation", and the IRF candidacy is "per physiatry consultation". The clinical paragraph matches the record:
- right arm strength 2/5 and right leg 3/5;
- expressive aphasia;
- dysphagia on a modified diet;
- labetalol titration;
- "medically stable for transfer";
- independent and working before the stroke;
- discharge home with her husband as the goal.

Edits before signing:
1. **Tolerance.** Replace "can now tolerate" with the documented trajectory and the PM&R expectation, unless the 10/28 or 10/29 notes show 180 minutes or more (J-R3-1).
2. **Urgency.** Add *EXPEDITED* to the RE line, and state the physician's determination in the rule's words: the standard timeframe "could seriously jeopardize" her ability to regain maximum function (2560.503-1(m)(1)(i)(A), (m)(1)(iii)) (J-8).
3. **Peer-to-peer.** Make the sentence true on the day it is signed (*I [have called / will call] the peer-to-peer line on [date]*), or drop it (J-N5).
4. **Function.** Add the 10/27 functional status: moderate assistance of one for transfers, 25 feet with a hemi-walker and moderate assistance, maximal assistance for toileting, supervision at all meals (J-N5).
5. **Sources.** Replace the citation placeholder with the AHA/ASA recommendation and the IRF and SNF physician-visit rules, or delete it (J-5).
6. **Blanks.** Fill in [age] (63 on October 30, 2026) and the ICD-10 code from the chart.

**What must change first (kit level):**
- J-R3-2: fix the external-review branch (where to file, and expedited review in both branches).
- J-2: remove the claim that the caller wrote the October 26 consult from §5, or bind §5 to Dr. Lindqvist.
- J-R3-1: remove the claims that she meets the intensity criterion from §1 and §5.

### 4. Routing, deadlines and decision timeframes (insured ERISA plan; ACA appeals and external review)

| Rule | What the kit says | Primary text | Verdict |
|---|---|---|---|
| Appeal level and where to send | §1: "Keystone Health Plan, Appeals Department, P.O. Box 61440, Lancaster, PA 17604, or by fax to 1-888-555-0179". Expedited requests by phone: "1-888-555-0172 (24 hours a day, 7 days a week)" | Notice text | Right. §7 and §8 call 0179 the "expedited appeals fax"; the letter's fax is the general appeals fax, which is still the right place. §2 lacks a fax line (J-9). |
| Who may file | §1: "The doctor can request the expedited appeal directly" | 29 CFR 2560.503-1(b)(4): the plan may require proof of authority, but in urgent care a health care professional who knows the claimant's condition "shall be permitted to act as the authorized representative of the claimant" | Right. The "comes first" residue remains (J-13). |
| Oral request | §1: "to open the expedited appeal by phone" | (h)(3)(vi)(A) | Right. §6's question undercuts it (J-R3-3). |
| Urgent status | §1: "when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent" | (m)(1)(i)(A); (m)(1)(iii) | Right in §1; missing from §3 (J-8) |
| Decision clock | §10: "within 72 hours of receiving it" | (i)(2)(i): "as soon as possible, taking into account the medical exigencies," "but not later than 72 hours after receipt of the claimant's request for review" | Right. The kit omits "as soon as possible" and deemed exhaustion (J-R3-3). |
| Standard pre-service clock | Not stated | (i)(2)(ii), one level of appeal: "not later than 30 days after receipt by the plan of the claimant's request for review." | Fine to omit on the expedited track |
| Filing deadline | §10: "Monday, April 26, 2027" | (h)(3)(i): "Provide claimants at least 180 days following receipt of a notification of an adverse benefit determination". Notice: "within 180 days of receiving this notice" | Right, and conservative: counted from the notice date, October 28 + 180 days = Monday, April 26, 2027. |
| Documents and reviewer | §2 asks for MP-REH-007, the reviewer's name and credentials, and all documents | (h)(2)(iii): documents free of charge; (h)(3)(iv): identification of the medical experts consulted | Right |
| Peer-to-peer | §4 and §10: call 1-888-555-0186 by Wednesday, November 4, 2026 | Notice: "within 7 days of the date of this notice". October 28 + 7 days = Wednesday, November 4. | Right; in this case, call sooner (J-3 residue) |
| External review regime | §9: "This plan is insured by Keystone Health Insurance Company." | 45 CFR 147.136(c)(1)(i): the insurer "must comply with the applicable State external review process" | Right |
| Concurrent expedited external review | §1, §9, §10 | Notice; 147.136(c)(2)(iii) | Offering it is right. Where to file it, and the fallback, are wrong (J-R3-2). |
| Expedited external review clock | §10: "decided within 72 hours" | (c)(2)(xiii): "within no more than 72 hours after the receipt of the request for expedited external review by the IRO." | Right. The clock starts when the IRO receives the request. |
| Standard external review window | §9: "generally 4 months"; §10: "within 4 months of the final denial letter" | (c)(2)(vi): "must allow at least four months after the receipt of a notice" | Right as an outer limit; wrong as the urgent fallback (J-R3-2) |
| Binding effect | §9 and §10: "The external review decision is binding on the plan." | (c)(2)(xi): "must provide that the decision is binding on the plan or issuer" | Right |
| State rule printed on the notice | §9: "the number is on your denial letter" | Notice: "regulated by your state's insurance department", with no number | Wrong (J-N1) |
| What the patient may owe | §1: "Nothing has been billed yet." | The denial is pre-service. | Right. The "approved" SNF is wrong (J-R3-4), and so are the hospital-bill questions (J-4). |
| Records | §8: invokes the right of access and encloses an "Authorization form" | 164.502(g)(2); 164.524(b)(2), (c)(3)(ii) | The authority is unclear (J-7), and the April date is wrong for an urgent request (J-9). |

---

## Patterns across the engine

**Fixed and holding:**
- I: the assignment rule; evidence filed with the request (one optional fax line left); the supplier's own redetermination; no peer-to-peer in Original Medicare; no invented power of attorney; no invented NCD citation.
- J: the concurrent expedited external review; the doctor-placed peer-to-peer on the printed number, with the date; no misdescribed therapy note; a signer-neutral §3.

**Still present, or back:**
1. **Record wording upgraded in the clinician's voice**, now in both kits: I's "ongoing chest pain", and J's "can now tolerate" and "meets the intensity criterion". In I §3, the bracket-then-assert pattern is back. Guard: flag any unbracketed clinical claim in §3 or §5 that is not in the source or that restates a bracketed placeholder.
2. **The "not validated" rewrite** is back (J §5). Keep it on the banned-phrase list for every section, including the talking points.
3. **The two-signer problem** moved from §3 to §5 in J. Apply §3's signer-neutral rules to the peer-to-peer script.
4. **An inference stated as fact**: J's "The record you reviewed stopped at 10/25/2026".
5. **Template phrases that ignore the case**: "a representative form comes first" in both kits (harmful only on J's urgent path), and "the number is on your denial letter" in J.
6. **Incomplete branches in urgent kits**: every branch of the external-review path needs expedited handling and a place to file (J §9 and §10).
7. **Legal relevance**: facts the rule says do not count end up in the physician's criteria paragraph (I's sentence about his wife's driving).
8. **Deadline wording**: mail-by versus receive-by, and "all supporting documentation by that date" (I).

## Sources
- [42 CFR 414.610](https://www.law.cornell.edu/cfr/text/42/414.610)
- [42 CFR 414.605](https://www.law.cornell.edu/cfr/text/42/414.605)
- [42 CFR 410.40](https://www.law.cornell.edu/cfr/text/42/410.40)
- [42 CFR 405.906](https://www.law.cornell.edu/cfr/text/42/405.906)
- [42 CFR 405.910](https://www.law.cornell.edu/cfr/text/42/405.910)
- [42 CFR 405.942](https://www.law.cornell.edu/cfr/text/42/405.942)
- [42 CFR 405.944](https://www.law.cornell.edu/cfr/text/42/405.944)
- [42 CFR 405.946](https://www.law.cornell.edu/cfr/text/42/405.946)
- [42 CFR 405.950](https://www.law.cornell.edu/cfr/text/42/405.950)
- [42 CFR 405.962](https://www.law.cornell.edu/cfr/text/42/405.962)
- [42 CFR 405.966](https://www.law.cornell.edu/cfr/text/42/405.966)
- [42 CFR 405.968](https://www.law.cornell.edu/cfr/text/42/405.968)
- [CMS Medicare Benefit Policy Manual ch. 10 (ambulance), §10.2.1 and §20](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads//bp102c10.pdf)
- [CMS Claims Processing Manual ch. 30, §20.2 and §40.3](https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/clm104c30.pdf)
- [CMS: First level of appeal, redetermination](https://www.cms.gov/medicare/appeals-grievances/fee-for-service/first-level-appeal-redetermination-medicare-contractor)
- [CMS-10106 Authorization to Disclose Personal Health Information](https://www.cms.gov/cms10106-authorization-disclose-personal-health-information)
- [45 CFR 164.502](https://www.law.cornell.edu/cfr/text/45/164.502)
- [45 CFR 164.524](https://www.law.cornell.edu/cfr/text/45/164.524)
- [29 CFR 2560.503-1](https://www.law.cornell.edu/cfr/text/29/2560.503-1)
- [45 CFR 147.136](https://www.law.cornell.edu/cfr/text/45/147.136)
- [NAIC Uniform Health Carrier External Review Model Act (DOL-hosted), §7.B and §9.A](https://www.dol.gov/sites/dolgov/files/EBSA/laws-and-regulations/laws/affordable-care-act/for-employers-and-advisers/naic-uniform-review-model-act.pdf)
- [42 CFR 412.622](https://www.law.cornell.edu/cfr/text/42/412.622)
- [42 CFR 483.30](https://www.law.cornell.edu/cfr/text/42/483.30)
- [AHA/ASA adult stroke rehabilitation key recommendations](https://www.strokeassociation.org/-/media/Stroke-Files/Stroke-Resource-Center/Recovery/Provider-Focused/Adult-Stroke-Rehab-and-Recovery-Guidelines-Key-Recommendations-for-The-Rehab-Program-ucm_496011.pdf)

## Quote check

**Method:**
- A script extracted every double-quoted string in this file and tested each as an exact fixed string, the same test as `grep -F`.
- Quotes in the Kit I part were tested against `I-kit-run26.md`, then `I-source.txt`. Quotes in the Kit J part were tested against `J-kit-run26.md`, then `J-source.txt`. Quotes in the bottom line and the patterns section were tested against both kits and both sources.
- Strings not found in a kit or source were tested against the regulation and manual text retrieved for this audit (URLs above).
- A second pass checked that each kit quote labelled with a section (for example, §4) occurs in that section of the kit.

**Result:**
- 258 quotes were checked: 183 match a run-26 kit exactly, 16 match a source file (the family's text or the notice), and 59 match retrieved regulation or manual text.
- Every section-labelled kit quote occurs in the section named.
- Three quotes failed the first pass: two were capitalized at the start of a sentence, and one was my own suggested wording in quotation marks. All three were corrected, and none remain.
- Absent phrases and suggested wording are shown in italics, not in quotation marks.
