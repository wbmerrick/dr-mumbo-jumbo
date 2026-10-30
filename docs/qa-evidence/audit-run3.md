## Fight Pack audit: six kits (runs3)

I found 3 Critical defects: one in C and two in F. A, B, D and E have Major defects but nothing Critical. The most important fixes are cross-case patterns 1–3 below.

Severity key: **Critical** = could cause a missed deadline, delayed urgent care, or a clinician signing a false statement. **Major** = likely to lose the appeal or mislead the patient. **Minor** = credibility or polish.

### A — Sleep study (patient's paraphrase)

1. **[Major] §1/§4/§7** — States the kit's guess about why the claim was denied as fact. The patient said the in-lab study was ordered *because of* heart failure (HF), so the likelier gap is HF *severity*, not a missing diagnosis. The scripts then have the patient tell both offices something nobody has verified.
   - Quote: "the insurer denied it because they did not receive documentation of your heart failure"
   - Fix: present any inferred cause of denial as a hypothesis, and script the patient to ask what the insurer had rather than assert it.

2. **[Major] §1–§3** — Doesn't argue the criterion the way payers apply it. The AASM 2017 guideline prefers in-lab PSG over a home test (HSAT) only for *significant* cardiorespiratory disease, and payer policies commonly define that by NYHA class or ejection fraction. Severity is never made the deciding fact. The second "criterion met" is actually the AASM indication *for* a home test in uncomplicated adults.
   - Quote: "indicate a high pretest probability of moderate-to-severe obstructive sleep apnea"
   - Fix: under "criteria met," argue only facts that separate the patient from the insurer's stated alternative, and give the policy's threshold data (NYHA class, EF, sleepiness scores) named placeholders.

3. **[Major] §5** — A pushback answer is factually wrong. An adequate home test includes chest/abdominal effort belts and oximetry, and a sleep-boarded medical director will catch this.
   - The true, stronger version: home testing isn't recommended in significant HF; it underestimates the apnea index because it has no sleep staging; and central apnea changes treatment (ASV is contraindicated in HFrEF with predominant central apnea).
   - The objections the reviewer will actually raise are missing: "the HF is mild/compensated" and "do the home test first, then PSG if it's negative" (AASM Rec 3).
   - Quote: "cannot distinguish obstructive from central apneas or monitor cardiac rhythm and respiratory effort"
   - Fix: state the limits of the insurer's alternative as "not recommended/validated in [population]," not as technical absolutes, and seed §5 with the payer's standard step-down pathway.

4. **[Major] §10** — The section numbers are wrong, so the patient would mail the §4 office note as the clinician's letter.
   - Quote: "send the appeal letter (section 3 of this kit), the clinician's letter (section 4)"
   - Fix: generate every cross-reference from the fixed section map.

5. **[Major] JSON vs §4/§6/§9/§10** — The JSON marks the case urgent, but every section treats expedited review as conditional. §10 also says an expedited appeal must be in writing; ERISA allows oral urgent appeals (29 CFR 2560.503-1(h)(3)(vi)).
   - Quote: `"urgent": true` / "request an expedited appeal in writing"
   - Fix: make one urgency decision, including who must certify it, and render it identically in the JSON and every section.

6. **[Minor] §2/§3/§9** — The doctor's letter embellishes the patient's account:
   - "fell asleep at a red light" becomes a "near motor-vehicle accident"
   - both doctors "wanted" the study becomes both "ordered" it
   - undiagnosed sleep apnea is said to be worsening the HF
   - Quote: "directly exacerbating this patient's heart failure"
   - Fix: keep patient-reported events in the patient's words, and hedge causal claims about undiagnosed conditions.

7. **[Minor] §1/§6** — Labels fields the patient simply didn't paste as "[not on the letter]", then scripts a false statement for the call. The patient only said "I don't have a claim number handy."
   - Quote: "The letter didn't print a claim number"
   - Fix: distinguish "not provided — check your letter" from "not on the letter."

8. **[Minor] §9/§10** — Legal attributions are off:
   - External review for medical-necessity denials comes from the ACA (29 CFR 2590.715-2719), not the No Surprises Act.
   - "Work insurance" isn't necessarily ERISA; government and church plans are exempt.
   - Complaints are routed only to the state insurance department, which is the wrong agency if the plan is self-funded (it should be the Labor Department's EBSA).
   - Quote: "ERISA rules and the No Surprises Act's external review process apply"
   - Fix: when the plan's sponsor or funding is unknown, give each route conditionally with its correct legal source.

9. **[Minor] §7/§8** — Uses post-service tools in a pre-service case:
   - It asks for a "corrected claim," which is the wrong vehicle for a medical-necessity denial.
   - It requests date-of-service records and an itemized bill, when what's needed is the cardiology note and echo.
   - Quote: "Will your office submit a corrected claim with my cardiac records attached"
   - Fix: for pre-service denials, route to a reconsideration or new authorization request and a targeted records request.

10. **[Minor] whole kit** — Uses the drowsy-driving episode as an argument six times but never tells the patient not to drive drowsy until evaluated. See pattern 10.

### B — Inpatient downgraded to observation (phone photo)

1. **[Major] §3 (also §1/§5)** — The doctor's letter contains claims a hospitalist can't sign:
   - It says telemetry, IV diuretics and frequent nursing checks are available only to inpatients. All are routine in observation, which is exactly the denial's point.
   - It asserts "continuous cardiac monitoring" without a bracket.
   - It makes Dr. Lindqvist a "treating hospitalist"; the letter says only "Attending."
   - It attributes a BNP threshold to MCG that the notice never stated.
   - It offers oxygen saturation of 93% on room air as "compensated hypoxemia."
   - Quote: "services available only at the inpatient level" / "MCG criteria for acute decompensated heart failure with BNP >500 pg/mL"
   - Fix: never attribute thresholds to a guideline the notice didn't quote, never assert patient-specific services without brackets, and never claim a service is level-specific when the lower level routinely provides it.

2. **[Major] §1–§5** — Misses the deciding argument that is in the letter itself:
   - Observation was approved only for 08/03–08/04, but the stay ran to 08/05 with IV furosemide over 36 hours. Still needing IV therapy after the approved window is the "failure of initial therapy" route the denial itself lists.
   - The 08/04–08/05 portion may not be approved at any level, which is a cost question for the patient.
   - It never prompts asking which major complication (MCC) drove DRG 291. If it was acute respiratory failure or kidney injury, that rebuts the denial; if it is just the HF acuity code, it adds nothing.
   - Rating the case "Good" is optimistic for BNP 612, 93% on room air and no kidney injury under MCG.
   - Quote: "Good — one thing missing"
   - Fix: compare every date range, duration and dose in the notice (approved vs billed), build the argument on the gaps, and grade strength against the criteria the denial lists.

3. **[Major] §6/§9/§10** — Offers expedited internal and external review for a discharged, post-service claim, and pre-writes a justification that isn't true. The JSON says not urgent. ERISA urgent-care rules apply only to care not yet received or ongoing. Expedited external review on a post-service claim requires that the patient not yet be discharged after emergency care (29 CFR 2590.715-2719(d)(3)(i)). A bill is never a basis. High confidence.
   - Quote: "I remain in treatment for heart failure and the outcome affects ongoing coverage decisions" / "a balance bill affecting access to care"
   - Fix: when the service is post-service and the patient has been discharged, remove all expedited language everywhere.

4. **[Major] §2/§9/§10** — External-review mechanics are wrong for this plan:
   - The patient's letter asks the insurer to "forward" the case to external review. On a commercial plan the patient must request it within 4 months.
   - §9/§10 add Medicare Advantage automatic-forwarding language to a 58-year-old's employer-group notice.
   - The Medicare figure is also wrong: the 2026 amount-in-controversy threshold for a judge hearing is $200, not $190 (Federal Register 2025-21879).
   - A patient waiting for an automatic forward could miss the 4-month window.
   - Quote: "I request the matter be forwarded to independent external review" / "at least $190 (2026 threshold)"
   - Fix: classify the plan from the notice's own wording and include only that plan type's next steps.

5. **[Major] §1/§2/§4/§10** — The patient's strategy isn't thought through:
   - The notice already protects the patient from being billed the difference.
   - The hospital can appeal "on your behalf."
   - Observation vs inpatient cost-sharing can go either way for the patient.
   - Despite this, the kit has the patient file a thin parallel appeal and ask to be reprocessed at the inpatient level, without comparing cost-sharing. That appeal could use up the plan's internal appeal level before the hospital files its documented one; I'm moderately confident of that risk.
   - Quote: "you should preserve your own appeal rights by filing in parallel"
   - Fix: when the provider carries the financial risk, have the patient confirm their own cost-sharing at each level, then join one well-documented appeal (by signing the hospital's authorized-representative form) instead of duplicating it.

6. **[Minor] §2** — The patient's own letter depends on clinical data the patient can't supply.
   - Quote: "[Summary of presenting symptoms, vital signs, exam findings"
   - Fix: keep criterion-by-criterion mapping in §3, and have the patient letter refer to the enclosed clinician letter and records.

7. **[Minor] §1** — The patient asked what observation means and gets only a payment framing.
   - Quote: "generally a lower hospital reimbursement and potentially higher patient cost-sharing"
   - Fix: answer the patient's direct question in one plain sentence: observation is outpatient status with the same bed and care but different billing.

8. **[Minor] §3** — Contradicts the notice's statement that the patient can't be billed the difference.
   - Quote: "Continued denial places the financial burden on the patient"
   - Fix: never state consequences the notice itself rules out.

### C — Humira step therapy (urgent)

1. **[Critical] §1/§4/§7/§10** — The urgent-appeal routing is broken:
   - "Do this first" presents Harborline's prescriber line as the doctor's office number.
   - The printed expedited-appeal phone line (1-855-555-0190), which is the letter's stated way to request an expedited appeal, appears nowhere. The kit only says to fax with "EXPEDITED" written on it.
   - §10 tells the patient to file using the records-request letter.
   - Quote: "Call Dr. Vasquez-Moreno's office today (1-855-555-0188 prescriber line" / "using the letter in section 8"
   - Fix: tie every phone and fax number to the role printed beside it in the source, always quote the printed expedited channel when the case is urgent, and validate cross-references.

2. **[Major] §2/§3/§5/§9** — Misuses "contraindication." The delay doesn't make azathioprine, 6-MP or methotrexate unsafe for her, so the reviewer will answer "start azathioprine now with a steroid bridge."
   - The winning frame: the AGA 2021 guideline advises against thiopurines for inducing remission and favors early biologics. The required step therefore can't control an active flare that isn't responding to steroids.
   - The peer-to-peer brief also misses the obvious compromise: adalimumab plus an immunomodulator as combination therapy, which the AGA suggests.
   - It doesn't prepare her doctor for the likely questions: why not injectable methotrexate, and what is her TPMT status.
   - Quote: "A 12-week trial of azathioprine, 6-mercaptopurine, or methotrexate is contraindicated in this patient."
   - Fix: reserve "contraindication" for drug-specific safety reasons the clinician fills in, and frame urgency or ineffectiveness as "expected to be ineffective for [goal] per [guideline]."

3. **[Major] §2/§9 vs §5** — The patient's appeal and external-review letters ask for brand Humira. The notice says the Hadlima and Hyrimoz biosimilars are preferred once step therapy is met. Winning the step-therapy argument could still end in a formulary denial. It also contradicts §5, which says "Hadlima or Hyrimoz accepted."
   - Quote: "authorize Humira as prescribed"
   - Fix: when the notice names preferred alternatives, request the drug "including the plan-preferred product."

4. **[Major] whole kit** — She reports 8–10 bloody stools a day and an 11-pound weight loss while on prednisone, which could be acute severe colitis. The kit never tells her to contact her GI today or when to go to the ER. See pattern 10.

5. **[Minor] §2/§3/§5** — Numbers and facts not in the source, and inconsistent with each other:
   - Immunomodulator onset is "12–16 weeks" in §3, "12 weeks" in §5, and "3 months" per her GI.
   - "Three courses" of steroids is stated as fact; the insurer documented two, and her wording is ambiguous.
   - What her GI "said" becomes "has documented."
   - "Will require hospitalization" is stated as certain.
   - Quote: "Immunomodulators require 12–16 weeks to achieve therapeutic effect."
   - Fix: use only numbers from the source, bracket counts that conflict with the insurer's record, and hedge prognoses.

6. **[Minor] §3** — Repeats the request's diagnosis code "without complications" in a letter arguing severe bleeding colitis.
   - Quote: "K50.10 Crohn's disease of large intestine without complications"
   - Fix: when the coded diagnosis understates the narrative, add a bracket asking the clinician to confirm the code.

7. **[Minor] §9/§10** — Misses two options:
   - In urgent pre-service cases, expedited external review can run at the same time as the expedited internal appeal (29 CFR 2590.715-2719(d)(3)(i)(A)).
   - State step-therapy exception laws, which apply only if the plan is fully insured.
   - Quote: "I have exhausted Harborline Health's internal appeal process"
   - Fix: for urgent pre-service denials, say that expedited external review can run alongside the expedited internal appeal.

8. **[Minor] §2/§8/§10** — Small errors:
   - "If this appeal is upheld" says the opposite of what's meant.
   - The records request uses a 30-day HIPAA timeline and quotes the April 2027 deadline in an urgent case.
   - The plan's decision timeframes are called "federal minimums"; they are maximums.
   - Fix: template the sentence as "If the denial is upheld," and in urgent cases have the clinician send documents directly.

### D — Out-of-network ER doctor, claim "processed as NON-EMERGENCY"

1. **[Major] §3 (also §5)** — The ER doctor's attestation asserts facts not in the source: a staffing contract between the physician group and the hospital, and "serial" troponins.
   - Quote: "under a contractual arrangement with the hospital"
   - Fix: bracket every operational or clinical detail the source lacks, even if it's probably true.

2. **[Major] §1/§2/§5** — The No Surprises Act argument rests on a test the law doesn't use, which invites "you could have chosen another doctor." It also has the patient prove the group is the hospital's "exclusive" ER group, which is legally irrelevant. It omits the bright-line rules (high confidence):
   - A plan can't decide what counts as an emergency solely from diagnosis codes (45 CFR 149.110(b)(4)). That is the usual cause of an automatic "NON-EMERGENCY" label.
   - Even for a non-emergency visit, emergency-medicine clinicians at an in-network facility can never balance bill, even with the patient's consent (45 CFR 149.420(b)(1)(i)).
   - The plan must apply in-network cost-sharing to that care (45 CFR 149.120).
   - Quote: "when the patient had no reasonable ability to choose an in-network provider"
   - Fix: quote the controlling rule's actual test plus its fallback protection, and never ask the patient to prove facts the law makes irrelevant.

3. **[Major] §4 (also §9)** — Tells the doctor to mark the appeal EXPEDITED for collections or financial hardship, which are never grounds. §9 also offers expedited external review on a post-service claim where the patient has been discharged.
   - Quote: "If the patient is facing imminent collection action or financial hardship, mark the appeal EXPEDITED"
   - Fix: same rule as B-3.

4. **[Minor] §1** — Understates the protection. It is a standing rule, not something that lasts only "while in dispute," and continued billing should go to a No Surprises complaint.
   - Quote: "cannot balance-bill you while the claim is in dispute"
   - Fix: state each protection as a standing rule and pair it with how to enforce it.

5. **[Minor] §1/§6** — The fastest fix isn't scripted: ask Member Services to reprocess the claim as an emergency/NSA processing error, and ask the physician group to request reconsideration. A peer-to-peer call is low-yield for an automatically processed post-service claim.
   - Quote: "You must appeal, enclosing the emergency-department records."
   - Fix: for processing-type denials, script a reprocessing request on the first call, before the formal appeal.

6. **[Minor] §10** — Includes two phone numbers that are not in the source: EBSA 1-866-444-3272 and the No Surprises Help Desk 1-800-985-3059. Both are correct, but they break the no-outside-facts rule. See pattern 6.

### E — Self-funded ERISA plan, bundling and modifier denials

1. **[Major] §1–§5** — The coding guidance is wrong where it decides the case:
   - CPT says not to bill 20610 together with 76942. An ultrasound-guided major-joint injection is billed as 20611, which requires a saved image and a written report.
   - The triamcinolone J-code is billed separately alongside an office injection; "procedure tray" is the wrong concept.
   - The appeal then asks the plan to pay the invalid code pair.
   - Quote: "ultrasound guidance as billed" / "included in a procedure tray"
   - Fix: for bundling denials, give the billing office the standard correct-coding outcome to verify, and never ask the plan to pay a code pair that coding rules prohibit.

2. **[Major] §1/§3/§4** — Misses the likeliest cause of the modifier denial on the 99214-25 office visit. The EOB shows only the knee diagnosis (M17.11); if that is all the claim carried, the shoulder diagnosis must be added and linked to the office-visit line. The visit level must also be justified by the shoulder work alone, so it may come back below 99214.
   - Quote: "supports modifier 25 when the visit note documents both problems"
   - Fix: for -25 modifier denials, check whether the claim's diagnoses separate the office visit from the procedure, and warn that the visit level may change on correction.

3. **[Major] §9** — States what a visit note says even though the patient hasn't seen it.
   - Quote: "The visit note from 08/21/2026 documents both problems with separate history, examination, assessment, and plan elements"
   - Fix: keep statements about what a record contains bracketed until the patient has the record.

4. **[Minor] §9 vs §10** — Routes complaints to the state insurance department, although §10 correctly says this self-funded ERISA plan isn't state-regulated; EBSA is the right agency. It also presents external review as available, but pure bundling edits may not involve the "medical judgment" external review requires. The modifier question might qualify; the reviewer decides. Moderate confidence.
   - Quote: "file a complaint with your state insurance department in parallel"
   - Fix: route complaints and external review by the plan's funding type, and flag when a denial may fall outside external-review scope.

5. **[Minor] §1/§7** — Calls the $22.48 "actually paid" and a "copay." It is 20% coinsurance the patient owes on $112.40.
   - Quote: "$22.48 actually paid on line 1" / "the $22.48 copay"
   - Fix: describe each EOB column by what it actually means.

6. **[Minor] §5** — Assigns reason code M15 to the office visit; it was on the ultrasound (76942) line.
   - Quote: "CO-4/M15 for the office visit with modifier 25"
   - Fix: map reason codes to lines directly from the EOB table.

### F — Medicare Advantage power wheelchair

1. **[Critical] §2/§3/§5/§9** — The doctor's letter and talking points invent findings and present them as documented exam results, in a Medicare claim:
   - The family's "accidents" (bowel or bladder not stated) become documented "fecal incontinence."
   - The doctor is made to attest that the patient "demonstrated" safe joystick use and "intact cognition."
   - Falls are added that nobody reported.
   - "Severe oxygen-dependent COPD" is attributed to the 09/26 face-to-face note. The denial says that note recorded only COPD and knee arthritis.
   - CMS says a physician attestation on its own is not sufficient documentation (Program Integrity Manual ch. 5 §5.9). Signing unverified exam findings creates False Claims Act exposure for the doctor.
   - Quote: "resulting in documented episodes of fecal incontinence" / "demonstrated the cognitive ability and physical coordination to safely operate a power wheelchair using the joystick controls"
   - Fix: never write exam findings, test results or "documented" in the clinician's voice unless the source says so; use "[if documented: …]" brackets and "family reports" attribution.

2. **[Critical] §2/§6/§8** — The son is the one filing, but the kit never mentions an Appointment of Representative form (CMS-1696) or power of attorney. Without it, the plan can dismiss the appeal (CMS Part C dismissal guidance) and may refuse to discuss the case by phone. The records request also claims a "personal representative" status he may not have.
   - The kit misses the simplest route: Dr. Okoro can file the standard pre-service appeal himself after notifying his patient (42 CFR 422.578), and can request an expedited one (42 CFR 422.584).
   - Quote: "[Your printed name, as enrollee or authorized representative]" / "under my right of access as the patient's representative"
   - Fix: when the user isn't the patient, make representative authority step one, and offer the treating clinician's filing route wherever the program allows it.

3. **[Major] §1/§3/§4/§10** — The fix relies on an after-the-fact letter, which reviewers discount.
   - The durable fix is a new mobility-focused face-to-face visit, or a properly dated addendum to the note, optionally with a PT/OT mobility evaluation the doctor co-signs, followed by a new request.
   - The kit also overstates the supplier's home assessment. It shows whether the home can accommodate the chair, not which mobility-related daily activities (MRADLs) the patient can't do.
   - "One thing missing" understates what are really two gaps.
   - Quote: "A supplemental letter or addendum from Dr. Okoro documenting" / "which MRADLs cannot be completed with the walker"
   - Fix: when a denial cites missing content in the original medical record, direct the fix to a new or amended record entry, not a letter.

4. **[Major] §3/§5** — Never rules out a scooter (POV), which is a required step before a power wheelchair under Medicare's coverage rules. It is a published top denial reason: 11% of Noridian's Jurisdiction D power-mobility denials, Oct–Dec 2023. The peer-to-peer objections stop at walker, manual chair and home assessment.
   - Quote: none; the words "POV" and "scooter" appear nowhere in the kit.
   - Fix: seed §3 and §5 with the item's full coverage ladder (cane/walker, then manual chair, then scooter, then power wheelchair) and the Medicare contractor's published top denial reasons.

5. **[Major] §9** — Supplies a signed external-review request addressed to Medicare's Independent Review Entity, while the same section says not to file one. Medicare Advantage cases are forwarded automatically.
   - Quote: "I request independent external review of the denial" vs "You do not file a separate external review request"
   - Fix: for Medicare Advantage, replace this template with what to send if the reviewer invites evidence, plus the next step (a hearing before a judge).

6. **[Minor] §1/§7** — Uses Original Medicare concepts in a Medicare Advantage HMO, and asks about a rental agreement for a chair the family doesn't have.
   - Quote: "unless the supplier accepts assignment and agrees to appeal on your behalf" / "Does the rental agreement require us to pay"
   - Fix: use only the identified program's payment-liability rules, and don't presume delivery on a pre-service denial.

7. **[Minor] §1/§3/§5** — The "within six months" timeframe for the face-to-face exam is correct under current CMS rules, but it isn't in the notice and is attributed to Medicare's coverage criteria (NCD/LCD) rather than the CMS rule it comes from.
   - Quote: "completed within six months before the order"
   - Fix: take such qualifiers from a vetted, cited rule table, or leave them out.

8. **[Minor] §1/§10** — Addresses the son as if he were the patient.
   - Quote: "distance you can walk before dyspnea"
   - Fix: set the voice (patient or representative) at intake and apply it everywhere.

### Cross-case patterns (ranked)

1. **Clinician-voice documents assert facts the source doesn't support** (A, B, C, D; Critical in F). Patient reports become "documented" findings, and the kit adds severity words, serial tests, staffing contracts, specialties and exam results. Fix: a hard rule plus an automated check after generation that every clinical, operational or numeric claim in §3 and §5 either appears in the source or sits in brackets or attribution.

2. **Arguments and peer-to-peer objections don't match how reviewers actually apply the criterion.** A: HF severity and "home test first." B: observation failure. C: induction efficacy, steroid bridge, combination therapy. E: the correct-coding outcome. F: scooter and the original medical record. Fix: for each service type, seed the argument with the payer's standard alternative pathway and its top published denial reasons.

3. **Urgency isn't derived from service status, and the JSON disagrees with the text** (A, B, D). Fix: decide urgency once, only for care not yet received or ongoing, certified by a clinician and never on financial grounds. Show that one decision everywhere, and quote the printed expedited channel.

4. **The kit's guess about why the claim was denied is stated as fact and scripted for the patient to repeat** (A, B, F). Fix: label hypotheses as hypotheses, and script questions rather than assertions.

5. **Regulatory content ignores plan type and funding** (A, B, C, E). Examples: state insurance department routes for self-funded or unknown plans, Medicare Advantage content in a commercial case, "No Surprises Act external review," and unqualified external review for coding denials. Fix: classify the plan from the notice's own wording, then branch agencies and venues to match, with no content for other plan types.

6. **Routing and reference errors** (A, B, C, F): wrong section numbers, a phone number tied to the wrong party, a template addressed to the wrong body, and "forward" language where the patient must file. Outside facts also creep in: B's $190 is actually $200. The EBSA, No Surprises Help Desk and 1-800-MEDICARE numbers are correct but unsourced. Fix: build cross-references from the section map, tie every phone number to its printed role, and keep a vetted, dated table of agency contacts and thresholds, or use brackets.

7. **The requested remedy isn't the one the plan can approve or the one that helps the patient most** (B, C, E). Examples: inpatient reprocessing without a cost-sharing check, brand Humira over the preferred biosimilar, and payment "as billed" on an invalid code pair. Fix: write the ask as the approvable outcome that best serves the patient.

8. **"Good — one thing missing" is boilerplate** (A, B, C, E, F), even where the notice lists two independent reasons (C, E, F). Fix: grade each stated denial reason separately, and say "one thing missing" only when exactly one remains open.

9. **Post-service boilerplate is used in pre-service or urgent cases** (A, C, F): itemized bills, 30-day HIPAA timelines, and records by date of service, when the deciding document sits with a clinician or supplier. Patient letters also depend on clinical data only the doctor has (B, E). Fix: tailor §8 to the deciding document and whoever holds it, and keep criterion mapping out of the patient's letter.

10. **No safety line when the patient reports red-flag symptoms** (A: drowsy driving; C: bloody diarrhea on steroids). Separately, notes to clinicians contain unsupported success claims such as "usually overturn" and "same-day approvals" (A, B, D). Fix: add a one-line safety instruction whenever the patient's context contains red flags, and drop success claims that have no source.

### Genuinely strong (keep)

- **Extraction and deadlines are accurate.** Identifiers, addresses and fax numbers are right, including from the phone photo in B. Every deadline and its weekday is correct: 3/21/27 (Sun), 4/18/27 (Sun), 4/4/27, 3/29/27 (Mon), 12/18/26 (Fri). F correctly uses the printed 65-day window, the 30-day and 72-hour decision clocks, and automatic forwarding to Medicare's reviewer.
- **"Who fixes this" sends people to the right party:**
  - B: the hospital's utilization review / physician advisor team.
  - E: the billing office with a corrected claim, and §5 correctly says there is no peer-to-peer for coding disputes.
  - C and F: a new request filed in parallel with the appeal.
  - D: in-network cost-sharing only and "do not pay."
- **Insurer criteria are quoted verbatim, and the classic traps are avoided:** no "shock" diagnosis read from the DRG label, no J0135 for a pharmacy-benefit pen, no G47.33 for suspected apnea, no Part B 20% coinsurance in Medicare Advantage, and no two-midnight rule applied to a commercial plan.
- **Money protection is strong.** B quotes the notice's protection against being billed the difference. E explains that "CO" adjustments are the in-network provider's contractual write-off and separates the $646 from the $22.48. Requests to hold accounts and avoid collections, plus call logs, appear throughout.
- **The peer-to-peer "ask" is consistently good:** overturn now, or give the unmet criterion and the reviewer's credentials in writing. The ERISA decision timeframes in A and E are correct (30 days pre-service, 60 days post-service, halved per level when there are two levels).

### Sources checked
- [Federal Register 2025-21879: 2026 amount-in-controversy thresholds (judge hearing $200)](https://www.govinfo.gov/content/pkg/FR-2025-12-04/html/2025-21879.htm)
- [45 CFR 149.110](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-149/subpart-B/section-149.110)
- [45 CFR 149.420](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-149/subpart-E/section-149.420)
- [42 CFR 422.578](https://www.law.cornell.edu/cfr/text/42/422.578)
- [CMS Part C dismissal guidance](https://www.hhs.gov/guidance/sites/default/files/hhs-guidance-documents/part%20c%20dismissals-20130910.pdf)
- [29 CFR 2590.715-2719](https://www.law.cornell.edu/cfr/text/29/2590.715-2719)
- [DOL Technical Release 2011-02](https://www.dol.gov/sites/default/files/ebsa/employers-and-advisers/guidance/technical-releases/11-02.pdf)
- [CMS federal external review process guidance](https://www.cms.gov/CCIIO/Resources/Regulations-and-Guidance/Downloads/FERP-Guidance_Final4_01-11-17-MM-508.pdf)
- [The Rheumatologist: CPT rules for 20610/20611/76942](https://the-rheumatologist.org/?p=3810)
- [Noridian Jurisdiction D: power-mobility denial reasons](https://med.noridianmedicare.com/web/jddme/cert-reviews/mr/pre-claim/required-programs/reasons-for-non-affirmation)
- [CMS Program Integrity Manual ch. 5](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/pim83c05.pdf)
- [AASM 2017 sleep apnea diagnostic testing guideline](https://aasm.org/wp-content/uploads/2017/07/DTO-Guidelines-at-a-Glance.pdf)
- [AGA 2021 Crohn's guideline summary](https://gastroenterology.acponline.org/archives/2021/06/25/2.htm)

Files are in qa/:
- manifest.js
- corpus/B-letter-client.jpg (plus the corpus source texts)
- runs3/A-sleep-paraphrase/kit.md
- runs3/B-inpatient-loc-photo/kit.md
- runs3/C-prior-auth-biologic/kit.md
- runs3/D-oon-er-eob/kit.md
- runs3/E-coding-bundling/kit.md
- runs3/F-medicare-advantage-pmd/kit.md