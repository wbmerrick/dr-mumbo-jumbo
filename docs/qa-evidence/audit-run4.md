## Run-4 re-audit against my run-3 findings

All three run-3 Criticals are resolved. Of the 25 Critical and Major items from run 3, 13 are fixed, 11 are partly fixed, and 1 has regressed (E3); none is untouched. The remaining problems are listed under "New defects" below.

### 1. Run-3 Critical and Major items

| # | Case § | Run-3 item | Verdict | Evidence from run 4 |
|---|---|---|---|---|
| A1 | A §1/§4/§7 | The kit's guess about why the claim was denied was stated as fact | **Fixed** | "explain that the sleep study was denied because the insurer considers you uncomplicated" |
| A2 | A §1–§3 | Heart-failure severity not made the deciding fact; the pretest-probability "criterion" | **Partly fixed**: the pretest-probability criterion is gone, and NYHA class / ejection fraction placeholders plus a severity objection were added. The letter still says heart failure of any severity rules out a home test. | "The patient has congestive heart failure, a condition in which home sleep apnea testing is not validated and is not recommended." |
| A3 | A §5 | Factual error about what a home sleep test can record; the real objections were missing | **Partly fixed**: the "home test first" and severity objections were added, but the technical absolute remains. | "it detects airflow limitation but not central events or periodic breathing" |
| A4 | A §10 | Wrong section numbers | **Fixed** | "Use the appeal letter (section 2), the doctor's letter (section 3)" |
| A5 | A JSON vs sections | Urgency inconsistent between JSON and text | **Fixed**: one decision, and JSON is false. The stated rationale is unsupported (see new defects). | "Urgent: No — standard review" |
| B1 | B §3 | Doctor's letter contained claims a physician couldn't sign | **Partly fixed**: the "inpatient-only services" claim, the BNP > 500 criterion and the "hypoxemia" framing are gone, and monitoring is now bracketed. The specialty is still invented, and a new unbracketed duration and safety claim was added. | "I am the treating hospitalist for Mr. Whitfield" / "over 48+ hours … could not have been safely delivered in an observation setting" |
| B2 | B §1–§5 | Missed the observation-window / failure-of-initial-therapy argument; never asked about the coded complication (MCC); strength overstated | **Partly fixed**: the window gap is now the centerpiece, but it is argued as proving itself. Continued IV therapy appears only in brackets, the coded complication is still never raised, and the case is still rated "Good". | "the gap itself shows the lower level was insufficient" |
| B3 | B §6/§9/§10 | Expedited review offered on a post-service claim | **Fixed** | "The care was already received and the patient has been discharged" |
| B4 | B §2/§9/§10 | "Forward to external review" language; Medicare Advantage content in a commercial case; the wrong $190 figure | **Fixed** | "it is never forwarded automatically" (no Medicare Advantage content remains) |
| B5 | B §1/§2/§4/§10 | Duplicate thin patient appeal; no cost-sharing comparison | **Fixed** | "ask whether to sign their authorized-representative form so one well-documented appeal goes in" |
| C1 (Critical) | C §1/§4/§7/§10 | Urgent-appeal routing was broken | **Partly fixed; the remaining issue is now Minor**:<br>• the printed expedited line (1-855-555-0190) now appears in §1, §4, §6 and §10<br>• cross-references and "Do this first" are correct<br>• §7 still points the patient to the insurer's prescriber line to reach her doctor<br>• §4 tells the office to fax that phone line | "the prior authorization denial letter if a prescriber line is printed" |
| C2 | C §2/§3/§5/§9 | Delay was mislabeled a "contraindication" | **Partly fixed**:<br>• now framed as harm and expected ineffectiveness, and the "start azathioprine with a prednisone bridge" objection is answered<br>• that exception is now attributed to Harborline's own policy without support<br>• the peer-to-peer brief still says "contraindication"<br>• no combination-therapy offer<br>• methotrexate is lumped in with the thiopurines, though AGA 2021 does suggest it for induction | "[cite: … Harborline Policy RX-ST-114 exception criteria for harm or ineffectiveness of required step]" / "The contraindication is to the delay, not the drug class" |
| C3 | C §2/§9 | Asked for brand Humira instead of the preferred biosimilar | **Fixed** | "authorize adalimumab or the plan-preferred biosimilar equivalent" |
| C4 | C whole kit | No safety line | **Fixed** | "Contact Dr. Vasquez-Moreno today about the ongoing bloody diarrhea and weight loss" |
| D1 | D §3/§5 | Invented staffing contract; "serial" troponins | **Fixed** | "[The patient was observed for approximately 6 hours while serial studies were obtained …]" (now bracketed) |
| D2 | D §1/§2/§5 | No Surprises Act argument framed on "no choice"; diagnosis-code rule and ancillary-services rule missing | **Partly fixed**: §1 now states the rule correctly. "No choice" is still a pillar, proof of the group's contract is still requested, and 45 CFR 149.110(b)(4) and 149.420(b) are still absent. | "Documentation that the ER physician is employed or contracted by Cascade Emergency Physicians (to show you had no choice of clinician)" |
| D3 | D §4/§9 | Told to mark EXPEDITED because of collections | **Fixed** | "Urgent: No — standard review. The service was already received" |
| E1 | E §1–§5 | Wrong coding guidance ("as billed", "procedure tray") | **Partly fixed**: "as billed" and "tray" are gone, and a combined-code hint was added. The drug code (J3301) is still lumped into the combined-code question instead of being identified as separately billable, and §9 now asserts the code pair is correct. | "or should one combined code describe the injection procedure?" / "The billing office has confirmed the drug and ultrasound codes are correctly reported" |
| E2 | E §1/§3/§4 | Shoulder diagnosis not linked to the office visit; visit level | **Partly fixed**: the diagnosis linkage (the core point) is fixed everywhere; the warning that the visit level may drop is absent. | "Corrected claim with the shoulder diagnosis code(s) on the visit line (99214-25)" |
| E3 | E §9 | External-review template asserted what the visit note contains | **Regressed**: it still asserts the note's contents and now also states future steps as already done. | "documented in the visit note with a distinct diagnosis code. The corrected claim links the visit to the shoulder diagnosis" |
| F1 (Critical) | F §3/§5/§9 | Invented exam findings in the doctor's letter | **Partly fixed**: fecal incontinence, the joystick demonstration, intact cognition, falls, and oxygen attributed to the face-to-face note are all removed or bracketed. New unsourced findings appeared (see new defects). | "reports he cannot reach the bathroom in time, resulting in incontinence episodes" (fixed) vs new "resulting in urge incontinence" |
| F2 (Critical) | F §1/§2/§8/§10 | No representative authority for the son | **Fixed**. The option for the treating physician to file the appeal himself (42 CFR 422.578) is still not offered. | "a representative form comes first (CMS-1696 or power of attorney)" |
| F3 | F §1/§3/§4 | Relied on an after-the-fact letter; overstated the home assessment | **Fixed** | "A dated addendum to the 09/26/2026 visit note or a new visit note from Dr. Okoro" |
| F4 | F §3/§5 | Scooter (POV) never ruled out | **Partly fixed**: the scooter is now addressed, but with a reason the facts contradict (he walks a few steps). It misses the deciding reason, that bad shoulders can't steer a scooter's tiller. The peer-to-peer brief still has no scooter objection. | "it requires the user to ambulate to the device and transfer independently, which Mr. Nakamura cannot do" |
| F5 | F §9 | External-review template to the Medicare reviewer contradicted automatic forwarding | **Fixed** | "you do not file a separate external review" |

### 2. New defects not present in run 3 (most severe first)

1. **[Major] A §2/§3 and F §2/§3** — The ask now ends with "or the plan-preferred equivalent" even though neither notice names a preferred alternative. This looks like the C biosimilar fix over-generalized.
   - In A, it invites approval of a home test with effort belts. In F, it invites a scooter or a lower-group chair. Those are the options the letters argue against.
   - Quote: "or the plan-preferred equivalent study that includes differentiation of central and obstructive events" / "authorize the Group 2 power wheelchair (HCPCS K0823) or the plan-preferred equivalent"
   - Fix: offer an alternative only when the notice names one that meets the clinical need; otherwise ask for the specific service.

2. **[Major] F §5** — The doctor's peer-to-peer opening invents a diagnosis. The family described accidents from not reaching the bathroom in time. "Urge incontinence" is a bladder disorder, and a reviewer can say it's treatable without a wheelchair.
   - Quote: "resulting in urge incontinence and inability to complete toileting in time"
   - Fix: never turn a lay description into a diagnostic label in the clinician's voice.

3. **[Major] F §3** — The doctor's letter states what the supplier's home assessment found, though nobody has seen it.
   - Quote: "confirms the home environment is suitable for power wheelchair use"
   - Fix: a document that isn't in the source may be named but never characterized; its findings go in brackets.

4. **[Major] B §3** — The letter adds an unbracketed duration and a conclusion about safety. The insurer's letter documents diuresis over 36 hours, not IV therapy over 48+ hours.
   - Quote: "over 48+ hours required inpatient-level nursing care and could not have been safely delivered in an observation setting"
   - Fix: take durations only from source dates and numbers, and bracket level-of-care conclusions for the clinician.

5. **[Major] C §3** — Attributes a "harm or ineffectiveness" exception to Harborline's policy. The notice quotes only "inadequate response, intolerance, or contraindication."
   - Quote: "[cite: … Harborline Policy RX-ST-114 exception criteria for harm or ineffectiveness of required step]"
   - Fix: quote any exception from the notice, or name its outside source (for example, a state step-therapy law if the plan is fully insured), or frame it as a medical-necessity exception request.

6. **[Major] A §3** — The doctor's letter names adaptive servo-ventilation (ASV) as a central-apnea option for a heart-failure patient whose ejection fraction is unknown. ASV is contraindicated in heart failure with reduced ejection fraction (EF ≤45%) and predominant central apnea (SERVE-HF trial). The sentence also implies positive airway pressure isn't used for central apnea, though ASV itself is one. A sleep-boarded reviewer will read this as unsafe.
   - Quote: "central apneas may respond to heart failure optimization or adaptive servo-ventilation, whereas obstructive apneas require positive airway pressure"
   - Fix: name specific therapies only with their contraindications, or argue that treatment differs by apnea type without naming therapies.

7. **[Major] D §10** — The post-service decision clock is now wrong; run 3 had it right. A single-level plan has 60 days, and 30 days applies only per level when there are two (29 CFR 2560.503-1(i)(2)(iii)). B and E in this same run correctly say 60.
   - Quote: "The plan must decide your appeal within 30 days of receiving it (for a service already received, up to 60 days if the plan allows two internal appeal levels)."
   - Fix: compute decision clocks from service type and number of appeal levels using one shared table.

8. **[Minor] B §1** — Defines observation backwards; it is an outpatient status. The harm is limited because the kit tells the patient to get cost-sharing figures at each level. This is a regression of a run-3 Minor.
   - Quote: "it is not the same as outpatient care"
   - Fix: answer the patient's direct question accurately in one sentence.

9. **[Minor] B §1, C §1** — Each kit declares the plan "insured" or "fully insured" based on a group name, then contradicts itself with conditional routing in §9/§10.
   - Quote: "Employer plan, insured" / "Employer fully insured plan"
   - Fix: treat funding as unknown unless printed, and tell the patient to ask HR or check the plan document.

10. **[Minor] A §1, F §1/§4** — Urgency problems:
    - The urgency rationale asserts a stability nobody reported: "the condition is stable enough"; "a stable chronic condition".
    - F §4 tells the doctor "this is not an urgent case". That pre-empts the physician's right to have the plan expedite (42 CFR 422.584).
    - F §1 still lists "an expedited reconsideration filed at the same time".
    - Fix: present the urgency call as provisional, defer to the treating clinician, and keep one decision throughout.

11. **[Minor] F §3, A §3, C §3** — Bad citation and code hints:
    - F cites "42 CFR 410.38(g)", which doesn't exist; the face-to-face rule is at 410.38(d)(2).
    - A's header hint nudges coding "obstructive sleep apnea" before the study has been done.
    - C asks for "[CPT code from the prior authorization]" for a self-injected pen billed through pharmacy, where no procedure code applies.
    - Fix: no CFR paragraph citations or code hints outside a vetted table; tests done before a diagnosis use symptom codes; drugs are identified by name or NDC.

12. **[Minor] A §4, C §2, D §2/§4, F §2** — Statements attributed to the notice or written as already done:
    - "The patient's denial letter also requires a new prior authorization request"
    - "Dr. Vasquez-Moreno's office is submitting…"
    - "I have also reported the balance billing…"
    - "All required documentation is now included."
    - Fix: never attribute instructions to the notice unless quoted, and write pending actions as brackets the user confirms.

13. **[Minor] D §1/§4/§5** — Legal wording:
    - "at in-network rates": the No Surprises Act guarantees the patient in-network cost-sharing, not in-network payment to the provider.
    - "a question of law and plan processing, not clinical judgment": federal external-review rules treat whether care was an emergency as medical judgment (29 CFR 2590.715-2719(d)(1)(ii)).
    - Fix: distinguish patient cost-sharing from provider payment, and don't call eligibility-relevant determinations non-clinical.

14. **[Minor] D §8, C §7** — Two run-3 strengths were dropped:
    - D no longer sends the records request to Mercy Lakeside's records department, which holds the triage notes, vitals, EKG, labs and imaging.
    - C no longer asks about a manufacturer bridge supply while coverage is pending.
    - Fix: request records from every holder of the deciding documents; in urgent specialty-drug cases, ask about a bridge supply.

15. **[Minor] E §3, E §10** — Two wording problems:
    - E §3 says "I will schedule a follow-up visit to address coding if needed". A new visit can't support coding of the 08/21 office visit and reads as creating an encounter to fix a denial.
    - E §10 calls §3 "the billing office's documentation or letter", but §3 is the patient's own request to the billing office.
    - Fix: never suggest new encounters to cure a coding denial, and label cross-referenced sections by their actual author.

### 3. Bottom line

Urgency, external-review mechanics, safety lines, representative authority and "what you owe" are now right in all six kits.

**Patients:** all six could act on their kits safely, with two exceptions: D's §10 understates the plan's decision deadline, and E's §9 template asserts things the patient can't know, so it shouldn't be sent as written.

**Physicians:** a physician would sign A, C, D and F after normal bracket-filling plus striking one or two sentences each:
- A: the ASV sentence and "plan-preferred equivalent"
- C: the citation attributing the exception to Harborline's policy
- F: the home-assessment claim, plus "urge incontinence" in the peer-to-peer brief

B should not be signed as written, because of "treating hospitalist" and "48+ hours … could not have been safely delivered in an observation setting".

**Most important remaining weakness:** it is the same kind as before. Unsourced assertions still appear in the highest-authority text: the clinician letters, peer-to-peer scripts and external-review templates. A new over-generalized rule ("or the plan-preferred equivalent") now hands the insurer the cheaper option in A and F. Argument quality is the next gap:
- B argues the observation-window gap as proving itself, instead of documenting the continued IV therapy.
- D relies on "no choice" instead of the bright-line No Surprises Act rules (45 CFR 149.110(b)(4) and 149.420(b)).

Source checked this round: [42 CFR 410.38 (Cornell LII)](https://www.law.cornell.edu/cfr/text/42/410.38). It has paragraphs (a) through (e) only, with the face-to-face rule at (d)(2). The regulatory and guideline claims carried over from run 3 were verified in that round.

Kits reviewed are in qa/runs4/:
- A-sleep-paraphrase/kit.md
- B-inpatient-loc-photo/kit.md
- C-prior-auth-biologic/kit.md
- D-oon-er-eob/kit.md
- E-coding-bundling/kit.md
- F-medicare-advantage-pmd/kit.md