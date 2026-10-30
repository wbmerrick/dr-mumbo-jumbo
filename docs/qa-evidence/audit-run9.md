# Independent physician audit — run 9 (v9.1, all 8 kits)

Auditor: the same independent AI agent and severity key as runs 3, 4 and 6 (Critical = could cause a missed deadline, delayed urgent care, or a clinician signing a false statement; Major = likely to lose the appeal or mislead the patient; Minor = credibility or polish). It read the run-9 kits (qa/evidence/runs9) against the source documents, was told to ignore the checker's expectations in qa/manifest.js, and was told what had changed since run 6. Its findings drove v9.2 (docs/fightpack-qa.md, section 5).

## Run-9 audit (v9.1)

No Critical defects remain. Seven Majors do: two are run-6 items still open (B, F) and five are new or partly fixed.

### 1. Run-6 Critical/Major items
| Run-6 item | Verdict | Evidence (run 9) |
|---|---|---|
| G emergency "today", calls first (Critical) | Fixed | "Go to an emergency department now, or call 911 … Do this before anything else in this kit" |
| C safety tiers | Fixed | "Contact the doctor today about what you describe — 8-10 bloody bowel movements a day" (unconditional) |
| A false home-test claim | Fixed | "may miss central sleep apnea and Cheyne-Stokes respiration" |
| B "criteria require" | Partly | §2/§5/§9 now quote "does not document"; §3 still "requires documentation of hemodynamic instability, escalating oxygen requirement…" |
| E 76942 claim + asserted facts | Partly | now hedged ("may be separately payable depending on the joint and the plan's policy"); §9 "The visit note documents that separate evaluation." 20611 hint gone |
| H consent can waive anesthesia | Partly | §2/§3/§5 right; §1 "unless you signed a valid notice-and-consent form in advance"; §9 same |
| D "use the later date" | Fixed | "go by the earlier date" |
| F home-assessment contents | Not fixed | §3 "which documents the home layout and safe operation" |
| F expedited before form and documents | Fixed | "Do this first: Complete the Medicare Appointment of Representative form (CMS-1696)" |
| G "not yet started PT" | Fixed | "[Initial treatments tried and durations …]" |

### 2. Critical and Major in run 9
**No Critical.** Majors, most severe first:
1. **[Major] H §1/§9** — The consent exception survives in the decode and in the external-review request the patient signs. It contradicts §1's own "cannot be waived" line; the correct rule is 45 CFR 149.420(b)(1)(i). Quote: "unless a valid notice-and-consent form was signed in advance". **Fix:** run the ancillary rule as a post-check on every section and template.
2. **[Major] G §1/§3/§5** — The doctor's letter and P2P turn "trouble starting to pee" into "urinary retention" and tripping into "foot drop". In cauda equina syndrome (CES), retention ("painless retention of urine with overflow") is the later, worse-prognosis stage; difficulty voiding with control intact is the earlier one. A normal residual-urine check would contradict the letter. Quote: "she has experienced urinary retention (difficulty initiating urination)". **Fix:** use the patient's words; exam-derived labels go in "[if documented: …]".
3. **[Major] B §3** — The doctor's letter keeps "requires" and adds an invented rule. Quote: "Observation status is not validated for patients requiring IV diuretics beyond 24 hours or for those with an MCC". **Fix:** use the denial's own verb; no level-of-care rules that aren't in the notice or a cited guideline.
4. **[Major] C §7** — Regression of the run-3 Critical: the insurer's prescriber line is offered as the route to the doctor. Quote: "Dr. Vasquez-Moreno's office, Bayview Digestive Health — the prescriber line is 1-855-555-0188". **Fix:** bind each number to the party printed beside it.
5. **[Major] F §2/§3** — Invented diagnosis in the son's signed letter, plus findings attributed to an unseen document. Quotes: "due to osteoarthritis in both shoulders"; "which documents the home layout and safe operation". **Fix:** keep "his shoulders are bad" or bracket it; name unseen documents, never their findings.
6. **[Major] E §9** — The patient-signed template asserts record contents. Quote: "The visit note documents that separate evaluation." **Fix:** bracket it until the note is in hand.

**Minor:**
- A: decode says "Approved … instead: home sleep apnea testing" and claims "the plan has indicated it would cover that"; assumes "his wife" (the source says husband and wife); OSA ICD hint; "AASM … identify heart failure as an indication" (AASM's wording is "significant cardiorespiratory disease").
- B: §1 lists "presence of a major complicating condition" among MCG criteria; MCC is a coding category, not an MCG criterion.
- C: P2P says "The exception criteria allow approval…" (unknown policy text); "does not recommend immunomodulator monotherapy" also sweeps in methotrexate, which AGA suggests for induction; "malnutrition" ICD hint.
- D/H: the Help Desk is said to "place a hold on collections" or "tell Summit to stop billing". CMS describes review, investigation and referral only, so the hold must be asked of the provider.
- E: §2 asserts "properly billed with modifier -25"; drug payment understated ("some plans pay"); §10 calls §3 "the billing office's letter".
- F: "[NYHA class or GOLD stage] COPD" (NYHA is a heart-failure scale); scooter reason invents "frequent position changes"; ICD hints J44.9/M17.0.
- G: "seen urgently today", "urgent visit today or tomorrow"; P2P "within hours, not days … same-day or next-day"; "expedited appeals fax"; "possible CES" ICD hint; "My doctor is concerned" unsourced.
- H: "without prior authorization" applies emergency-services wording to a non-emergency claim; §1 "Do this first" is the Help Desk rather than the plan reprocessing call.

### 3. Code rewrites that produced wrong or awkward text
- **"today"→"now"**: correct where it fired; the unrewritten variants above remain in G.
- **"[Only if this has happened: …]"** kept a false clause: H §3 "…to the No Surprises Help Desk …, as required under the federal surprise-billing protections. — otherwise delete this sentence." Nothing requires a report. Missed instances: H §4 "I called the No Surprises Help Desk … as the federal rules require"; H §7 "I've appealed to the plan and reported…"; D §7 "I've also contacted the No Surprises Help Desk".
- **"[Only if the billing office confirms it: …]"** wraps a self-contradiction in E §9: "medically necessary components of the procedure and should be separately payable" (M15 defines components as bundled).
- **Injected MA rule**: F §4 has the doctor file a standard reconsideration "by calling 1-800-555-0166". The letter makes that the fast-appeal line; written appeals go to the P.O. box or fax 0167.
- **Injected Medicaid rule**: G §9 says "If waiting 120 days could seriously jeopardize your health, you can ask for an expedited State Hearing". 120 days is the filing window (42 CFR 438.408(f)(2)), not the wait for a decision.
- **Guideline-conclusion prompt → "not validated"** on things that are never validated: B "Observation status is not validated…"; F "A standard mobility scooter is not validated…"; G "physical therapy is not validated…"; C "not validated for controlling an active severe flare". Only A's use matches AASM.
- **Clean**: "with in-network cost-sharing" (D: "must be processed with in-network cost-sharing") and "go by the earlier one".

### 4. Bottom line
- **A** — Patient: yes. Physician: yes, after fixing pronouns and the AASM line.
- **B** — Patient: yes. Physician: not until the "requires" sentence and invented rule are struck.
- **C** — Patient: yes, once §7 stops routing to the insurer's line. Physician: yes.
- **D** — Patient: yes (ask Cascade, not the Help Desk, for the hold). Physician: yes.
- **E** — Patient: yes on billing; bracket the §9 note claim. No clinician letter.
- **F** — Patient: after removing "osteoarthritis in both shoulders". Physician: after striking the home-assessment characterization.
- **G** — Patient: yes, the safety instruction is now right. Physician: after replacing "urinary retention"/"foot drop".
- **H** — Patient: not §1/§9 until the consent exception is removed. No clinician letter.

Sources: [CES classification](https://link.springer.com/10.1007/s00264-021-05273-1) · [CMS complaints](https://www.cms.gov/medical-bill-rights/help/submit-a-complaint) · [45 CFR 149.420](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-149/subpart-E/section-149.420) · [42 CFR 438.408](https://www.law.cornell.edu/cfr/text/42/438.408) · [AASM](https://aasm.org/wp-content/uploads/2017/07/DTO-Guidelines-at-a-Glance.pdf) · [AGA summary](https://gastroenterology.acponline.org/archives/2021/06/25/2.htm)
