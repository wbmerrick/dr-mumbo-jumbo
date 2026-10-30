# Independent physician audit — run 6 (v7, all 8 kits)

Auditor: the same independent AI agent (physician-reviewer rubric, severity key: Critical = could cause a missed deadline, delayed urgent care, or a clinician signing a false statement; Major = likely to lose the appeal or mislead the patient; Minor = credibility or polish) that audited runs 3 and 4. It read the eight run-6 kits (qa/evidence/runs6) against the source documents, was told to ignore the checker's expectations in qa/manifest.js (notes, mustHave, mustNot) so its read stayed independent, and was told what had changed since run 4 so it could test those changes. Its findings drove the v8 changes; item numbers are referenced in docs/fightpack-qa.md.

## Run-6 audit (A–H)

### 1. Open run-4 items, A–F
| Item | Verdict | Evidence (run 6) |
|---|---|---|
| A2 HF severity | Partly | "significant heart disease" added, but "congestive heart failure makes this patient a complicated case" |
| A3 home-test absolutes | **Regressed** | "does not monitor heart rhythm, oxygen levels continuously" |
| A plan-preferred / ASV | Fixed | ask is now just "authorize attended polysomnography" |
| B1 unsignable letter | Fixed | "I am the treating [specialty] for Mr. Whitfield" |
| B2 gap argument / MCC | Partly | MCC now central; still "which shows the lower level of care was not adequate" |
| B observation | Fixed | "billed differently as outpatient" |
| C1 phone routing | Fixed | "What is the prescriber line again? [It's 1-855-555-0188 …]" |
| C2 contraindication | Partly | policy cite gone, combination therapy answered; §2 "I meet the exception because the required drugs' delayed onset of action makes them unsuitable" |
| D2 NSA framing | Fixed | "the patient's choice of emergency physician is irrelevant" |
| D decision clock | Fixed | "within 60 days of receiving your appeal (30 days per level …)" |
| E1 coding | J3301 fixed; 76942 **regressed** | "ultrasound guidance (76942) is separately reportable" |
| E2 E/M-level caveat | Not fixed | absent |
| E3 asserted facts | Not fixed | "The billing office has confirmed this was documented with the appropriate shoulder diagnosis code." |
| F1 unsourced findings | Partly | "urge incontinence" gone; home-assessment claim remains (item 8) |
| F4 scooter | Partly | "A scooter is not validated for indoor toileting MRADLs in typical home layouts" (no shoulder/tiller reason) |
| F plan-preferred | Fixed | "I request that the power wheelchair be authorized." |
| Run-4 Minors | Mostly fixed | Open: D "in-network rates"; E §10 cross-reference |

### 2. Critical and Major, all 8 kits
1. **[Critical] G §1/§7/§10** — New urinary hesitancy, saddle numbness and progressive weakness (suspected cauda equina) require immediate referral to the emergency department (ED) under the national pathway. The kit says "today" and lines up calls first, including asking the clinic for a same-day visit. Quote: "Go to an emergency department today" / "Can Dr. Achebe see me today". **Fix:** emergency red flags → "go to the ED now", before any other task; delegate calls.
2. **[Major] C §1** — Safety tiers inverted (run 4 was right). ED-level signs in a patient on steroids route only to a doctor call, and even that is conditional, though she already meets ACG's severe definition. Quote: "contact your doctor today if symptoms worsen (fever, severe abdominal pain, dizziness, heavy bleeding)". **Fix:** current severe symptoms → specialist today, unconditionally; listed red flags → ED now.
3. **[Major] A §1/§2/§3/§9** — False claim in the signed letter: AASM's adequate home test requires oximetry. Quote: "does not monitor heart rhythm, oxygen levels continuously". **Fix:** describe the alternative only as "not recommended/validated in [population]", never by channels it supposedly lacks.
4. **[Major] B §1/§2/§3/§5/§9** — Misquotes the insurer. The notice says the documentation "does not reflect" four findings; the kit says the criteria "require" them, in both signed letters, conceding a narrowed criterion set. Quote: "Your letter states that the MCG criteria require". **Fix:** quote denial reasons with their original verb.
5. **[Major] E §1/§2/§9** — The patient's letters argue a code pair CPT prohibits: 20610 + 76942, where an ultrasound-guided major-joint injection is 20611. They also assert unverifiable confirmations (E3). Quote: "separately reportable when the physician uses real-time imaging". **Fix:** route code-pair questions to the billing office; bracket third-party confirmations.
6. **[Major] H §1/§2/§5** — Treats consent as able to waive anesthesia protections; it can't (45 CFR 149.420(b)(1)(i); the exception in 29 CFR 2590.716-5 needs valid notice-and-consent). This contradicts H §3. Quote: "unless the patient gave informed consent in advance". **Fix:** for ancillary services, say consent cannot waive protection; drop lack of consent as an element.
7. **[Major] D §6** — Deadline rule is wrong: an oral date never extends the printed one. Quote: "if it differs from your letter, use the later date". **Fix:** always use the earlier date.
8. **[Major] F §3** — The doctor's letter describes a document no one has seen. Quote: "The supplier's home assessment from 09/30/2026 documents the specific functional limitations and safe operation of controls." **Fix:** name unseen documents; never state their findings.
9. **[Major] F §6** — Pushes an expedited appeal today with the representative form (CMS-1696) pending and before the addendum and home assessment exist. A 72-hour decision on the old record likely upholds the denial and auto-forwards to the independent reviewer (moderate confidence). Quote: "I will submit the signed CMS-1696 within 2 business days and need to file an expedited appeal today". **Fix:** start expedited clocks only once authority and curable documents are in hand, or have the physician file.
10. **[Major] G §3** — Unsourced fact in the doctor's letter. Quote: "has not yet started physical therapy or completed a course of conservative treatment". **Fix:** unsourced patient facts go in brackets.

**Minor:**
- A: the "approved instead" field says the home test was approved; ED advised for worsening drowsiness; "call the expedited line" if the deadline has passed.
- B: §9 asserts telemetry.
- C: covered alternatives listed as "approved instead"; "fax … at the prescriber line".
- D/H: "in-network rates" (the No Surprises Act protects patient cost-sharing, not the provider's payment).
- E: reason codes mapped to the wrong lines; wrong §10 cross-reference.
- F: "urinary", "walker with a seat" and "severe COPD" unsourced; the hedging produces "not validated" nonsense.
- G: "Dr. Achebe and I believe" unsourced; ICD hint "possible cauda equina syndrome"; general fax labeled "expedited"; "each hour of delay" overstated.
- H: §3 mistitled "Corrected-claim request"; "the facility assigned them" unsourced.

### 3. G and H
**G.** Safety direction is right: ED, 911, don't wait for the appeal, and ED care needs no prior approval (42 U.S.C. 1396u-2(b)(2)(A)(i)). The timing is wrong (item 1). Plan routing is correct per 42 CFR 438.402/438.408: appeal within 60 days, decided in 72 hours expedited or 30 days standard, then a State Hearing within 120 days. Gaps:
- deemed exhaustion if the plan misses its deadline
- expedited State Hearing (3 working days, 42 CFR 431.244(f)(2))
- DMHC Independent Medical Review, available within 180 days of the plan decision but lost once a State Hearing has been held (DHCS notice)

The document choice (doctor's letter plus updated order) is right.

**H.** No safety line needed. Routing is right:
- ERISA appeal within 180 days, decided in 60
- external review covers No Surprises Act disputes (29 CFR 2590.715-2719(d)(1))
- plan complaints go to EBSA; billing complaints go to the No Surprises Help Desk
- a surgery center counts as a covered facility (45 CFR 149.30)

The billing-office letter is the right document, and the peer-to-peer section is correctly marked unnecessary. The one error is item 6.

### 4. Bottom line
- **A** Patient: yes. Physician: after striking the false home-test sentence.
- **B** Patient: yes. Physician: after fixing "MCG criteria require".
- **C** Patient: after the safety tiers are fixed. Physician: yes.
- **D** Patient: yes, minus the "later date" line. Physician: yes.
- **E** Patient: billing and routing guidance yes; not §2/§9 as written. No clinician letter.
- **F** Patient: yes, if the expedited request waits for CMS-1696 and the documents. Physician: after striking the home-assessment sentence.
- **G** Patient: only once it says "now"; delay risk as written. Physician: yes, minus the physical-therapy claim.
- **H** Patient: yes, once the consent clauses are removed. No clinician letter needed.

Sources: [AASM HSAT](https://aasm.org/wp-content/uploads/2017/07/diagnostic-testing-OSA.pdf) · [CES pathway](https://www.csp.org.uk/journal/article/physiotherapy-journal-march-2024/national-suspected-cauda-equina-syndrome-pathway) · [ACG Crohn's](https://corporate.thermofisher.com/diagnostic-education/dam/clinical/documents/ACG-Clinical-Guideline-Management-Crohns.pdf) · [438.408](https://www.law.cornell.edu/cfr/text/42/438.408) · [1396u-2](https://www.law.cornell.edu/uscode/text/42/1396u-2) · [431.244](https://www.law.cornell.edu/cfr/text/42/431.244) · [DHCS notice](https://www.dhcs.ca.gov/formsandpubs/Documents/MMCDAPLsandPolicyLetters/APL2021/APL21-011-NAR-Your-Rights-Knox-Keene.pdf) · [2590.716-5](https://www.law.cornell.edu/cfr/text/29/2590.716-5) · [149.30](https://www.law.cornell.edu/cfr/text/45/149.30)