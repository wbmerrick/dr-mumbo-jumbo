// The test corpus: six denials in the raw forms patients actually have them.
// `expect` is what a correct kit must say in its JSON block (null = don't care / any).
// `phi` must never appear in any output. `reason` is a distinctive phrase from the insurer's
// stated reason that section 1 or 2 must quote. `sourceText` is what the model was shown
// (for the image case: the text of the rendered letter) and feeds the no-invented-facts check.
const fs = require('fs');
const path = require('path');
const C = (f) => fs.readFileSync(path.join(__dirname, 'corpus', f), 'utf8');
const htmlText = (f) => C(f).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

module.exports = [
  {
    id: 'A-sleep-paraphrase',
    title: 'Rawest input: patient paraphrase of a sleep-study denial, no identifiers',
    denial: C('A-sleep-study-paraphrase.txt'),
    extra: "I snore loudly and my wife says I stop breathing at night. I'm exhausted all day and fell asleep at a red light once. I have congestive heart failure and take furosemide. My cardiologist and my primary doctor both wanted the in-lab study.",
    file: null,
    expect: { denial_type: ['medical-necessity'], plan_type: ['commercial', 'unknown'], service_type: ['pre-service', 'unknown'], claim_number: null, denial_date: null, stated_appeal_deadline: null, appeal_window_days: null }, letter3: 'lmn',
    phi: [],
    reason: 'home sleep apnea testing',
    notes: 'Must bracket everything: no claim number, no dates, no dollar amounts may appear outside placeholders. Clinically, heart failure is a recognised reason an in-lab study is appropriate over a home test — the kit should build the argument on that.'
  },
  {
    id: 'B-inpatient-loc-photo',
    title: 'Phone photo of a hospital level-of-care denial (inpatient → observation)',
    denial: '',
    extra: "I was in the hospital for two nights in August for my heart failure. Now I got this letter. The hospital billing office says I might owe more. I don't understand what observation means.",
    file: 'B-letter-client.jpg',
    sourceText: htmlText('B-inpatient-loc-letter.html'),
    expect: { denial_type: ['medical-necessity'], plan_type: ['commercial'], service_type: ['post-service'], claim_number: '26-0914-77231', denial_date: '2026-09-22', stated_appeal_deadline: null, appeal_window_days: 180, urgent: false }, letter3: 'lmn',
    phi: ['Whitfield', 'WHITFIELD', 'Marcus', 'MARCUS', 'GPH4471820', '03/14/1968', 'March 14, 1968'],
    reason: 'observation',
    notes: 'The letter itself says the member cannot be billed for the difference (participating facility). A world-class kit tells the patient that plainly, explains observation vs inpatient, and that the hospital\'s utilization-review/appeals team usually fights this one, while preserving the member\'s own appeal. Clinical facts in the letter (BNP 612, SpO2 93%, IV furosemide 40 mg BID, 2.1 L net diuresis) may be used; nothing else may be asserted.'
  },
  {
    id: 'C-prior-auth-biologic',
    title: 'Pre-service prior-auth denial of a biologic (step therapy), steroid-dependent flare',
    denial: C('C-prior-auth-biologic.txt'),
    extra: "I've had Crohn's for 3 years. Mesalamine didn't work. I've needed prednisone twice this year and I'm on it again now (started Oct 9). I'm having 8-10 bloody bowel movements a day and have lost 11 pounds since August. My GI said immunomodulators take 3 months to work and I can't keep taking steroids. Colonoscopy was done Sept 30 and showed severe inflammation in the colon — the report should be in my chart.",
    file: null,
    expect: { denial_type: ['prior-authorization', 'medical-necessity'], plan_type: ['commercial'], service_type: ['pre-service'], claim_number: 'PA-2026-1183907', denial_date: '2026-10-20', stated_appeal_deadline: null, appeal_window_days: 180, urgent: true }, letter3: 'lmn',
    phi: ['Priya', 'PRIYA', 'Ramanathan', 'RAMANATHAN', 'HL-7730-5518-02'],
    reason: 'immunomodulator',
    notes: 'Should request EXPEDITED review (steroid-dependent, worsening), answer the step-therapy criterion with the exception logic (immunomodulators take ~12 weeks to act; ongoing steroid dependence), name the colonoscopy report as the decisive missing document, and note that accepting a preferred biosimilar is a practical path to approval.'
  },
  {
    id: 'D-oon-er-eob',
    title: 'EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency',
    denial: C('D-oon-er-eob.txt'),
    extra: "I went to the ER at 2 a.m. with crushing chest pain and shortness of breath. They did an EKG, blood tests (troponin) and a chest x-ray and kept me for 6 hours. Mercy Lakeside is in my network — I checked before I went. I didn't choose the ER doctor. I got a bill from Cascade Emergency Physicians for $2,340.",
    file: null,
    expect: { denial_type: ['out-of-network'], plan_type: ['commercial'], service_type: ['post-service'], claim_number: '2026278004511', denial_date: '2026-10-06', stated_appeal_deadline: null, appeal_window_days: 180, urgent: false }, letter3: 'attestation',
    phi: ['Jordan', 'JORDAN', 'Kellermann', 'KELLERMANN', 'EMH00928371'],
    reason: 'NON-EMERGENCY',
    notes: 'The crux is "processed as non-emergency": chest pain meets the prudent-layperson emergency standard, and federal surprise-billing protections apply to emergency care from out-of-network clinicians — the patient owes only in-network cost sharing and should not pay the $2,340 bill while disputing it.'
  },
  {
    id: 'E-coding-bundling',
    title: 'Self-funded (ERISA) EOB: bundling and modifier denials on an orthopaedic office visit',
    denial: C('E-coding-bundling-eob.txt'),
    extra: "I had my knee injected at the orthopedic office. I also talked to the doctor about my shoulder that day, which is a separate problem. Now the office sent me a bill for $668. I don't understand why the injection was covered but the medicine and the visit weren't.",
    file: null,
    expect: { denial_type: ['coding'], plan_type: ['commercial', 'other'], service_type: ['post-service'], claim_number: 'C0926-4410875', denial_date: '2026-09-30', stated_appeal_deadline: null, appeal_window_days: 180, urgent: false }, letter3: 'corrected',
    phi: ['Angela', 'ANGELA', 'Dubois-Reyes', 'DUBOIS-REYES', 'TSB-0552-8831'],
    reason: 'included in the payment',
    notes: 'This is the provider\'s billing problem to fix (corrected claim). Depth test: "CO" = contractual obligation — for an in-network provider those adjustments are generally the provider\'s write-off, not the patient\'s to pay; the 99214-25 visit is billable if the shoulder problem is documented separately; ultrasound guidance with a major-joint injection is normally reported with a single combined code rather than 20610 + 76942.'
  },
  {
    id: 'F-medicare-advantage-pmd',
    title: 'Medicare Advantage Integrated Denial Notice: power wheelchair, 65-day printed deadline',
    denial: C('F-medicare-advantage-pmd.txt'),
    extra: "My dad is 79. He uses the walker but only for a few steps and then has to sit — he's too short of breath (he's on oxygen 2 liters at night and when walking). He can't get to the bathroom in time and has had accidents. His shoulders are bad so he can't push a manual wheelchair. The mobility company did the home visit on Sept 30 but I don't think they sent it in.",
    file: null,
    expect: { denial_type: ['medical-necessity', 'prior-authorization'], plan_type: ['medicare'], service_type: ['pre-service'], claim_number: 'ORG-2026-5561203', denial_date: '2026-10-14', stated_appeal_deadline: null, appeal_window_days: 65 }, letter3: 'lmn',
    phi: ['Robert', 'ROBERT', 'Nakamura', 'NAKAMURA', 'SL-MA-88201947'],
    reason: 'rolling walker',
    notes: 'Must use the 65-day deadline printed on the letter (not the 180-day commercial rule), flag Medicare Advantage timelines and automatic forwarding to the Independent Review Entity, and map each MRADL criterion to the facts supplied (dyspnea limits walker use, toileting accidents, shoulder disease prevents manual propulsion, home assessment exists but was not submitted).'
  },
  // ---- held-out cases: written after run 5 and never used to tune the prompts ----
  {
    id: 'G-medicaid-mri-redflags',
    heldout: true,
    title: 'Held-out: Medicaid managed-care denial of a lumbar MRI, new neurological red flags',
    denial: C('G-medicaid-mri-redflags.txt'),
    extra: "My back pain started about 5 weeks ago after lifting boxes at work. For the last 3 days my right leg has been getting weaker and I keep tripping on my right foot. Since yesterday I have trouble starting to pee and my skin feels numb between my legs. Dr. Achebe ordered the MRI last week, before the leg and bladder problems started.",
    file: null,
    expect: { denial_type: ['medical-necessity', 'prior-authorization'], plan_type: ['medicaid'], service_type: ['pre-service'], claim_number: 'UM-2026-0081342', denial_date: '2026-10-23', stated_appeal_deadline: null, appeal_window_days: 60, urgent: true }, letter3: 'lmn',
    phi: ['Delia', 'DELIA', 'Ortega', 'ORTEGA', 'SHP-40918377'],
    reason: 'conservative treatment',
    notes: 'Safety before paperwork: new progressive leg weakness, trouble urinating and numbness between the legs are emergency red flags, so section 1 must send her to an emergency department today, before any appeal step. The notice itself lists the red-flag exception, so the doctor\'s letter argues that exception from a new exam. Medicaid route: plan appeal within the printed 60 days (fast appeal 72 hours), then a State Hearing within 120 days of the appeal decision; no EBSA, no employer-plan external review, no 180-day rule.'
  },
  {
    id: 'H-oon-anesthesia-asc',
    heldout: true,
    title: 'Held-out: self-funded plan EOB, out-of-network anesthesiologist at an in-network surgery center',
    denial: C('H-oon-anesthesia-asc-eob.txt'),
    extra: "I had knee surgery at Lakeview Surgery Center, which I checked was in my network. I never met the anesthesiologist before the surgery and nobody gave me any paperwork saying they were out of network. Now Summit Anesthesia Partners sent me a bill for $1,860, and the EOB says I owe $780 toward an out-of-network deductible.",
    file: null,
    expect: { denial_type: ['out-of-network'], plan_type: ['commercial'], service_type: ['post-service'], claim_number: 'AB-26-0817-3391', denial_date: '2026-09-08', stated_appeal_deadline: null, appeal_window_days: 180, urgent: false }, letter3: 'corrected',
    phi: ['Theodore', 'THEODORE', 'Okafor', 'OKAFOR', 'KBP-207733415'],
    reason: 'out-of-network level',
    notes: 'Scheduled surgery, so no emergency argument. The protection is the federal ancillary-services rule: an out-of-network anesthesiologist at an in-network facility may not balance bill, the plan must apply in-network cost-sharing (the $780 out-of-network deductible is wrong), and notice-and-consent cannot waive it for anesthesia. Do not pay the $1,860; ask the plan to reprocess; No Surprises Help Desk; the EOB prints "self-funded", so EBSA, not the state insurance department.'
  },
  {
    id: 'I-original-medicare-ambulance',
    heldout: true,
    round: 2,
    title: 'Held-out (round 2): Original Medicare MSN — emergency ambulance denied, daughter filing',
    denial: C('I-original-medicare-ambulance-msn.txt'),
    extra: "I'm Harold's daughter, Renee Pruitt-Cole, and I handle his mail. On August 26 Dad passed out in the kitchen. When he came to he was gray and sweaty and said his chest hurt. Mom called 911 and the ambulance took him to Westbrook Regional Medical Center, about 14 miles away, the closest hospital. The ER told us his heart rate was very slow. They kept him overnight, adjusted his medicines, and he has been doing fine since. Mom doesn't drive, and Dad couldn't have sat up in a car. Now Medicare won't pay for the ambulance and the company billed $1,398.10. How do we appeal?",
    file: null,
    expect: { denial_type: ['medical-necessity', 'not-covered'], plan_type: ['other', 'original-medicare'], service_type: ['post-service'], claim_number: '26-24318-774-120', denial_date: '2026-10-09', stated_appeal_deadline: '2027-02-11', appeal_window_days: [120, null], urgent: false },
    letter3: ['attestation', 'lmn'],
    phi: ['Harold', 'HAROLD', 'Pruitt', 'PRUITT', '4TN7-WQ2-HJ85'],
    reason: 'other forms of transportation',
    notes: 'Original Medicare is not a plan: the first appeal is a redetermination by the Medicare contractor named on the notice (generally decided within 60 days), then a reconsideration by a Qualified Independent Contractor within 180 days of that decision, then an ALJ hearing. No Independent Review Entity, no external review, no 65-day Medicare Advantage window; the printed date (February 11, 2027) controls. The daughter files with CMS-1696. The case turns on the ambulance crew\'s patient care report and the ER record: fainting, chest pain and a very slow heart rate, transport to the closest hospital, and why a car would have endangered him. The fainting was two months ago, was treated, and he is well, so the kit carries no emergency instruction now. Sources: CMS MLN006562 (Part A/B appeals); 42 CFR 410.40 (ambulance coverage).'
  },
  {
    id: 'J-urgent-irf-pdf-records',
    heldout: true,
    round: 2,
    title: 'Held-out (round 2): urgent pre-service denial of inpatient rehab after stroke — letter as PDF, records attached',
    denial: '',
    extra: "My wife Denise had a stroke on October 21. She's still in Riverside General. The hospital wants to send her to Lakeshore Rehab, but the insurance said no and wants a nursing home. The rehab doctor says she's getting stronger every day; yesterday she did almost 3 hours of therapy. The hospital says she could be discharged in the next day or two. I attached the denial letter and her therapy notes. I'm her husband, Gary.",
    file: 'J-irf-denial-letter.pdf',
    records: 'J-records.pdf',
    sourceText: htmlText('J-irf-denial-letter.html'),
    recordsText: htmlText('J-records.html'),
    expect: { denial_type: ['medical-necessity'], plan_type: ['commercial'], service_type: ['pre-service'], claim_number: 'UM-IRF-2026-448190', denial_date: '2026-10-28', stated_appeal_deadline: null, appeal_window_days: 180, urgent: true },
    letter3: 'lmn',
    phi: ['Denise', 'DENISE', 'Albright', 'ALBRIGHT', 'KHP-77102935', '04/09/1963'],
    reason: 'three hours of therapy',
    notes: 'Urgent pre-service care: the treating doctor can call the 24-hour expedited line (1-888-555-0172) today, the plan must decide within 72 hours, and expedited external review can be requested at the same time. In an urgent case the doctor can act for her without a form. The peer-to-peer line (1-888-555-0186) is separate and time-limited. The reviewer saw 90 minutes on 10/25; the attached records show 165 minutes on 10/27, an improving trend, the rehab physician\'s expectation of 3 hours within 2–3 days, three therapy disciplines, and daily physician oversight (labetalol titration, dysphagia) — reasons a skilled nursing facility is not equivalent. She is already admitted, so the kit carries no emergency-department instruction. Records are attached, so record facts may be stated. Sources: 29 CFR 2590.715-2719 (urgent claims follow the attending provider; expedited external review with the expedited appeal; 72 hours).'
  }
];

// ---- depth expectations: what a physician reviewer would insist each kit says (mustHave)
// ---- and what it must never say (mustNot). Patterns are case-insensitive regexes. mustHave is
// ---- tested with [placeholders] removed unless raw:true; mustNot always tests the whole kit.
// ---- `where` limits a check to sections; mustNot `stripped:true` ignores [bracketed prompts].
// ---- Entries marked (audit) come from the independent physician audits of runs 3 and 4
// ---- (docs/fightpack-qa.md).
const DEPTH = {
  'A-sleep-paraphrase': {
    ids: [],
    mustHave: [
      { re: 'heart failure', where: [1, 3], why: 'heart failure is the clinical reason an attended study beats a home test' },
      { re: 'home sleep apnea test|home sleep test|HSAT', where: [1, 2, 3], why: 'answers the insurer\'s stated alternative directly' },
      { re: 'fell asleep|drowsy driving|red light', where: [1, 3], why: 'uses the safety fact the patient supplied' },
      { re: "(do not|don't|avoid|no|stop) driv", where: [1], why: '(audit) safety line: no drowsy driving until evaluated' },
      { re: 'NYHA|ejection fraction|\\bEF\\b', where: [1, 3, 5], raw: true, why: '(audit) names the heart-failure severity measures the reviewer will look for' }
    ],
    mustNot: [
      { re: 'does not (monitor|measure|record|capture)|lacks? (oximetry|an? ECG|heart rhythm)', stripped: true, why: '(audit) the alternative is answered with the guideline conclusion, never by channels it supposedly lacks' },
      { re: 'G47\\.33', why: 'suspected OSA is coded by symptoms, never asserted as G47.33' },
      { re: 'cannot (distinguish|differentiate)', why: '(audit) no technical absolutes about the home test' },
      { re: 'near(ly)?[- ](a )?(motor[- ]vehicle )?(accident|crash|collision|miss)', why: '(audit) falling asleep at a red light is reported, not upgraded to a near accident' },
      { re: '\\bASV\\b|adaptive servo', why: '(audit) future treatment is named only in general terms — ASV carries heart-failure cautions the letter cannot weigh' }
    ]
  },
  'B-inpatient-loc-photo': {
    ids: ['GPH4471820', '26-0914-77231'],
    mustHave: [
      { re: 'may not be billed|cannot be billed|can\'t be billed|not be billed for the difference', where: [1], why: 'the letter itself protects the member from the denied difference' },
      { re: 'utilization review|utilization-review|patient financial services|physician advisor|hospital.{0,60}appeal', where: [1, 7], why: 'the hospital normally fights level-of-care denials' },
      { re: 'observation', where: [1], why: 'explains observation vs inpatient in plain English' },
      { re: '(approved|authori[sz]ed)[^.\\n]{0,80}(08/04|August 4)|(08/04|August 4)[^.\\n]{0,160}(still|continu|remain|beyond|after|through|past|08/05|August 5)', where: [1, 3, 5], why: '(audit) builds on care still needed after the approved observation window' },
      { re: 'cost-?sharing', where: [1, 7], why: '(audit) checks the patient\'s own cost-sharing at each level before pushing for inpatient' },
      { re: 'outpatient', where: [1], why: '(audit) says plainly that observation is an outpatient status' },
      { re: 'IV furosemide|intravenous furosemide|IV diure|intravenous diure', where: [3, 5], why: '(audit) documents the continued IV therapy rather than arguing the window gap proves itself' }
    ],
    mustNot: [
      { re: '(criteria|policy|MCG)[^.\\n]{0,40}requires?[^.\\n]{0,15}hemodynamic instability', why: '(audit) the notice says the documentation does not reflect these findings, not that the criteria require them' },
      { re: '\\bhospitalist', stripped: true, why: '(audit) the letter names the attending but not a specialty — it stays [specialty]' },
      { re: '\\b48\\s*(\\+|-?hours?|hrs?\\b)', stripped: true, why: '(audit) durations come only from the dates in the source' },
      { re: 'not the same as (being )?(an )?outpatient|observation[^.\\n]{0,60}(is not|isn\'t) (an )?outpatient', why: '(audit) observation IS an outpatient status' },
      { re: '(?<!failure (&|and) )\\bshock\\b(?! (w|with) MCC)', why: 'DRG label "heart failure & shock" is a billing category, not a diagnosis of shock' },
      { re: '(?<!(require|requires|requiring) services )available only (at|to|in) (the )?inpatient', why: '(audit) never claim a service is available only to inpatients' },
      { re: 'request (that )?(the|this) (matter|case|appeal) be forwarded', why: '(audit) on an employer plan the patient requests external review; it is never forwarded' },
      { re: 'Independent Review Entity|\\bIRE\\b', why: '(audit) no Medicare Advantage routing on an employer plan' }
    ]
  },
  'C-prior-auth-biologic': {
    ids: ['HL-7730-5518-02', 'PA-2026-1183907', '1427690053'],
    mustHave: [
      { re: 'expedited', where: [2], why: 'steroid-dependent, worsening flare meets the urgent standard' },
      { re: 'colonoscopy', where: [1], why: 'the missing colonoscopy report is a named reason for denial' },
      { re: 'biosimilar|Hadlima|Hyrimoz', where: [1, 2, 3, 5, 6], why: 'accepting the preferred biosimilar is a practical path to approval' },
      { re: '12 weeks|twelve weeks|(weeks|months) to (work|take effect|become effective)|3 months|three months|slow onset|onset of action|too slow', where: [3, 5], why: 'the step-therapy exception: immunomodulators act too slowly for an active flare' },
      { re: '855-555-0190', where: [6], why: '(audit) the urgent insurer call uses the printed expedited-appeal line' },
      { re: 'plan-preferred|Hadlima|Hyrimoz|biosimilar', where: [2], why: '(audit) the appeal asks for an approvable outcome including the preferred biosimilar' },
      { re: "(contact|call)[^.\\n]{0,60}today|emergency (room|department|services|care)|\\bER\\b|911", where: [1], why: '(audit) safety line for 8–10 bloody stools a day on steroids' },
      { re: 'bridge', where: [7], why: '(audit) an urgent specialty-drug case asks the office about a bridge supply' }
    ],
    mustNot: [
      { re: '(contact|call)[^.\\n]{0,60}today if[^.\\n]{0,30}(worse|worsen)', stripped: true, why: '(audit) severe symptoms now mean contacting the specialist today, unconditionally' },
      { re: 'J0135', why: 'no HCPCS code is printed; a self-administered pen is billed on the pharmacy benefit' },
      { re: '(office|clinic)\\W{0,3}(phone|number|line|at|:)\\W{0,3}\\(?1-855-555-0188|call[^.\\n]{0,40}(doctor|office|clinic)[^.\\n]{0,15}(at|on) \\(?1-855-555-0188', why: "(audit) the prescriber line is the insurer's line for prescribers, not the doctor's office" },
      { re: 'is contraindicated in this patient', why: '(audit) "contraindicated" only with a drug-specific safety reason the clinician fills in' },
      { re: '\\[CPT code', why: '(audit) a self-injected pen is identified by drug name and strength, never a procedure code' },
      { re: '(RX-ST-114|the (plan\'s )?policy)(?:(?!\\b(?:if|whether|does|do)\\b)[^.\\n]){0,40}(allows?|permits?|provides?|includes?|recogni[sz]es?|contains?|offers?)[^.\\n]{0,20}exception|exception (criteria|provisions?) (in|of|under) (Policy )?RX-ST-114', stripped: true, why: '(audit) the notice lists no exceptions — none is attributed to RX-ST-114' },
      { re: '(delay|wait)[^.\\n]{0,60}contraindicated|contraindicated[^.\\n]{0,40}(delay|wait)', why: '(audit) a delay is never a "contraindication"' }
    ]
  },
  'D-oon-er-eob': {
    ids: ['EMH00928371', '2026278004511'],
    mustHave: [
      { re: 'prudent', where: [1, 2, 3], why: 'emergency is judged by symptoms at the time' },
      { re: 'surprise[- ]billing|No Surprises', where: [1, 2, 6, 10], why: 'federal balance-billing protection for out-of-network emergency care' },
      { re: 'do not pay|don\'t pay|should not pay|shouldn\'t pay|not pay the', where: [1, 7], why: 'the patient should not pay the $2,340 balance bill while disputing it' },
      { re: 'reprocess', where: [1, 6], why: '(audit) a claim processed as non-emergency is first a reprocessing request' },
      { re: 'diagnosis codes? alone|solely on (the basis of )?(the )?diagnosis', where: [1, 2, 3, 5, 6], why: '(audit) a plan may not judge an emergency by diagnosis codes alone' },
      { re: 'Mercy Lakeside', where: [8], why: '(audit) the hospital\'s records department holds the triage notes, vitals, EKG, labs and imaging' }
    ],
    mustNot: [
      { re: 'use the later|later (of the two )?date', why: '(audit) a date given by phone never extends the printed deadline: go by the earlier one' },
      { re: 'contract(ual)? (arrangement|relationship)[^.\\n]{0,40}hospital|under contract with', why: '(audit) no invented staffing contract in the attestation' },
      { re: 'mark[^.\\n]{0,30}EXPEDITED', why: '(audit) a bill or financial hardship is never grounds for expedited review' },
      { re: 'balance[- ]bill[^.\\n]{0,40}while(?![^.\\n]{0,40}(or at all|or after|or ever))', why: '(audit) the balance-billing protection is standing, not only while disputed' },
      { re: '(proof|evidence|statement|confirm\\w*|document\\w*|attest\\w*)[^.\\n]{0,40}(did not|didn\'t|could not|couldn\'t) (choose|select|pick)|(I|you|patient|he|she) (did not|didn\'t|could not|couldn\'t) (choose|select|pick)|no (control|choice) over which', stripped: true, why: '(audit) choice of clinician is irrelevant to emergency care — never argued or proved' },
      { re: 'in-network rates?\\b', why: '(audit) the protection is the patient\'s in-network cost-sharing; what the plan pays the provider is separate' },
      { re: 'not (a )?(matter|question) of clinical judgment|not clinical judgment|question of law', why: '(audit) whether care was an emergency is medical judgment — it can go to external review' }
    ]
  },
  'E-coding-bundling': {
    ids: ['TSB-0552-8831', 'C0926-4410875'],
    mustHave: [
      { re: 'write-?off|contractual', where: [1, 3, 7], why: '"CO" adjustments are generally the in-network provider\'s write-off' },
      { re: 'corrected claim', where: [1, 3, 7], why: 'the billing office fixes coding denials' },
      { re: 'shoulder', where: [1, 3], why: 'the separately addressed shoulder problem supports the -25 visit' },
      { re: 'combined code|one code|single code', where: [1, 3, 7], why: '(audit) asks whether one combined code describes the service' },
      { re: 'diagnos[ie]s[^.\\n]{0,100}(shoulder|visit|line)|shoulder[^.\\n]{0,100}diagnos', where: [1, 3, 7], why: '(audit) the -25 visit needs its own diagnosis on the claim' },
      { re: 'EBSA|Department of Labor', where: [9, 10], why: '(audit) self-funded plan complaints go to EBSA' }
    ],
    mustNot: [
      { re: '30 days for post-service', why: 'post-service appeals are generally decided within 60 days' },
      { re: '(pay|reprocess|approve|allow)[^.\\n]{0,60}as billed', why: '(audit) never ask the plan to pay conflicting codes as billed' },
      { re: '22\\.48[^.\\n]{0,25}(copay|co-pay|actually paid)', why: '(audit) the $22.48 is patient responsibility, not a copay or a payment' },
      { re: 'procedure tray', why: '(audit) no guessing why codes were bundled' },
      { re: '(file|send|submit)[^.\\n]{0,40}(complaint|request)[^.\\n]{0,40}state insurance department', why: '(audit) a self-funded plan is not regulated by the state insurance department' },
      { re: 'schedule[^.\\n]{0,40}(visit|appointment)[^.\\n]{0,80}(cod|claim|bill)|new visit[^.\\n]{0,60}(cod|claim)', stripped: true, why: '(audit) a new visit never cures a coding denial — the codes must match the visit that happened' },
      { re: 'billing office has (already )?(confirmed|agreed|verified|submitted|corrected)', stripped: true, why: '(audit) nothing is written as done that has not happened' },
      { re: '(?<!\\b(?:is|whether|if|ask(?:ing)?|confirm|verify)\\b[^.?\\n]{0,120})76942(?:(?!whether|\\bif\\b|\\bask)[^.?\\n]){0,60}(add-on|separately (reportable|billable|payable))(?![^.?\\n]*\\?)', stripped: true, why: 'never asserts a bundling rule as fact — ultrasound guidance with a joint injection usually has one combined code' }
    ]
  },
  'F-medicare-advantage-pmd': {
    ids: ['SL-MA-88201947', 'ORG-2026-5561203'],
    mustHave: [
      { re: '65', where: [10], why: 'the printed 65-day window governs' },
      { re: 'Independent Review Entity|\\bIRE\\b|automatically', where: [9, 10], why: 'upheld MA denials go to the IRE automatically' },
      { re: 'MRADL|mobility-related activit', where: [3], why: 'maps each MRADL criterion' },
      { re: 'home assessment', where: [1, 3], why: 'the home assessment exists but was never sent' },
      { re: 'new request|resubmi|new prior authori|fresh request|corrected (prior[- ]authori[sz]ation )?request', where: [1, 6, 7, 10], why: 'a documentation denial is often fastest fixed by a corrected new request' },
      { re: 'CMS-1696|Appointment of Representative', where: [1, 2, 6, 10], why: '(audit) the son needs representative authority first' },
      { re: 'scooter|\\bPOV\\b|power-operated', where: [3, 5], why: '(audit) the coverage ladder includes ruling out a scooter' },
      { re: 'addendum|new (face-to-face|visit|exam|evaluation|mobility)', where: [1, 3, 4, 10], why: '(audit) a record gap is fixed by a new visit or dated addendum, not only a letter' },
      { re: '(doctor|physician)[^.\\n]{0,80}(can|may|could) (also )?(file|request|submit|ask for)|(doctor|physician)[^.\\n]{0,40}(file|request|submit)s?[^.\\n]{0,40}(directly|on (his|her|your|their) behalf)', where: [1, 2, 4, 6, 7, 10], why: '(audit) in Medicare Advantage the treating doctor can request the reconsideration directly' }
    ],
    mustNot: [
      { re: 'expedited[^.\\n]{0,60}today', stripped: true, why: '(audit) an expedited appeal on an incomplete record is decided on the old record: documents first' },
      { re: 'within (6|six) months', why: 'the letter states no timeframe for the face-to-face exam' },
      { re: '20 ?%|Part B coinsurance', why: 'Medicare Advantage plans set their own cost-sharing' },
      { re: 'fecal incontinence|documented (episodes of )?(bowel|bladder|incontinence)', why: '(audit) the family reported "accidents"; never upgraded to documented incontinence' },
      { re: 'urge incontinence|urinary incontinence', stripped: true, why: '(audit) "accidents" is a lay description, never a diagnostic label' },
      { re: 'demonstrated (the )?(cognitive|ability|safe)', stripped: true, why: '(audit) no exam findings asserted in the clinician\'s voice' },
      { re: 'home assessment[^.\\n]{0,60}\\b(?<!(?:those|these|the|your|other|supporting|all|any) )(confirms|confirmed|shows|showed|documents|documented|demonstrat)', stripped: true, why: '(audit) a record that is not in the source is named, never characterized' },
      { re: '410\\.38', why: '(audit) no regulation numbers' },
      { re: 'accepts assignment|rental agreement', why: '(audit) no Original Medicare concepts in a Medicare Advantage case' }
    ]
  },
  'G-medicaid-mri-redflags': {
    ids: ['SHP-40918377', 'UM-2026-0081342'],
    mustHave: [
      { re: 'emergency (room|department)[^.\\n]{0,30}\\bnow\\b|\\bnow\\b[^.\\n]{0,30}emergency (room|department)|\\b911\\b', where: [1], why: '(audit) new weakness, trouble urinating and saddle numbness mean the emergency department now, before any appeal step' },
      { re: 'safety first', where: [1], raw: true, why: 'the safety line leads the decode' },
      { re: 'safety first:?\\*{0,2}:?\\s*go to (an|the) emergency department now', where: [1], raw: true, why: '(run-7 review) the first instruction in the kit is the emergency department now, not a call to the office' },
      { re: 'red[- ]flag|progressive neurolog|bladder', where: [3], why: "the notice's own red-flag exception is the argument" },
      { re: 'expedited|fast appeal', where: [2], why: 'progressive deficits meet the urgent standard' },
      { re: '(state|fair) hearing', where: [9, 10], why: 'Medicaid: the next level is a State Hearing' },
      { re: '\\b60\\b', where: [10], why: 'the printed 60-day window governs' },
      { re: 'new (exam|visit|evaluation|request|note)|re-?examin|examine (you|her|him)|updated (note|exam|order)|document(s|ing)? (the )?(new|red[- ]flag)|addendum', where: [1, 3, 4, 10], why: 'the red flags are new, so they need a new exam and documentation' }
    ],
    mustNot: [
      { re: 'has not (yet )?(started|tried|had|completed|done)[^.\\n]{0,30}(physical therapy|\\bPT\\b|conservative)', stripped: true, why: '(audit) unsourced patient facts go in brackets in the doctor letter' },
      { re: 'see (me|you|her|him) today|(fit|squeeze) (me|you|her|him) in today', why: '(audit) emergency signs mean the emergency department now, not a same-day clinic visit first' },
      { re: 'urinary retention|retention of urine|foot drop|drop foot|saddle an(a)?esthesia|causing falls|has fallen', where: [3, 5], stripped: true, why: '(run-9 audit) the doctor signs the patient\'s own words ("trouble starting to pee", "tripping on my right foot"), not exam-derived labels' },
      { re: "if you (cannot|can't|can not|are unable to|could not) (reach|get through to|be seen|get (an? )?appointment)[^.\\n]{0,160}(emergency|\\bER\\b|911)", stripped: true, why: '(run-7 review) emergency care is never the fallback for an unanswered call to the office' },
      { re: '\\bbe seen (by [^.\\n]{0,40})?today|can I be seen today', stripped: true, why: '(run-7 review) a same-day office visit is not a substitute for the emergency department' },
      { re: 'EBSA|Department of Labor', why: 'Medicaid is not an ERISA plan' },
      { re: '180[- ]days?', why: 'the printed 60-day window governs, not the employer-plan 180 days' },
      { re: 'I (hereby )?request (an |a )?(independent )?external review', why: 'Medicaid: a State Hearing request, not an external review request' },
      { re: '(diagnosed with|has|confirms?|confirmed) cauda equina', stripped: true, why: 'a suspected condition is never asserted as a diagnosis' }
    ]
  },
  'H-oon-anesthesia-asc': {
    ids: ['KBP-207733415', 'AB-26-0817-3391'],
    mustHave: [
      { re: "do not pay|don't pay|should not pay|shouldn't pay|not pay the", where: [1, 7], why: 'the $1,860 balance bill is not owed' },
      { re: 'anesthesi[a-z]*[^.\\n]{0,120}(in-network|participating) (facility|surgery|center|ambulatory)|(in-network|participating) (facility|surgery center|center|ambulatory)[^.\\n]{0,120}anesthesi|ancillary', where: [1, 2], why: 'names the protection: anesthesia at an in-network facility' },
      { re: 'in-network cost-?sharing|in-network (deductible|level)', where: [1, 2], why: 'the plan must apply in-network cost-sharing, not the out-of-network deductible' },
      { re: 'reprocess', where: [1, 2, 6], why: 'the plan processed it wrong, so the first ask is reprocessing' },
      { re: 'No Surprises Help Desk|1-800-985-3059', where: [1, 6, 7, 10], why: 'continued balance billing goes to the federal help desk' },
      { re: 'EBSA|Department of Labor', where: [9, 10], why: 'the EOB prints that the plan is self-funded' }
    ],
    mustNot: [
      { re: 'unless[^.\\n]{0,60}consent|consent in advance|(did not|didn\'t|never) (receive|get|sign|give)[^.\\n]{0,40}(consent|notice)', stripped: true, why: '(audit) for anesthesia at an in-network facility the protection never depends on notice or consent' },
      { re: 'prudent', why: 'a scheduled surgery is not an emergency, so no emergency argument' },
      { re: '(file|send|submit)[^.\\n]{0,40}(complaint|request)[^.\\n]{0,40}state insurance department', why: 'a self-funded plan is not regulated by the state insurance department' },
      { re: 'in-network rates?\\b', why: "the protection is the patient's in-network cost-sharing, not the provider's payment rate" }
    ]
  },
  'I-original-medicare-ambulance': {
    ids: ['4TN7-WQ2-HJ85', '26-24318-774-120'],
    mustHave: [
      { re: 'redetermination', where: [1, 2, 10], why: 'Original Medicare: the first appeal is a redetermination by the Medicare contractor' },
      { re: 'reconsideration', where: [9, 10], why: 'the next level is a reconsideration by a Qualified Independent Contractor' },
      { re: '180 days', where: [9, 10], why: 'the reconsideration request is due within 180 days of the redetermination decision' },
      { re: '60 days', where: [10], why: 'the Medicare contractor generally decides a redetermination within 60 days' },
      { re: 'CMS-1696|Appointment of Representative', where: [1, 2, 10], why: 'the daughter files for him: the Appointment of Representative form comes first' },
      { re: "run report|patient care report|\\bPCR\\b|trip (report|sheet)|ambulance (report|record)|EMS (report|record)|ambulance (crew|company|service)[^.\\n]{0,20}(record|report|notes?)", where: [1, 4, 8], why: "the ambulance crew's patient care report is the decisive record" },
      { re: 'contraindicated|endanger|could not (safely )?(sit|ride|travel|go)|couldn\'t have sat|unsafe', where: [2, 3], why: 'answers the stated reason: other transport would have endangered his health' },
      { re: 'closest|nearest', where: [2, 3], why: 'the transport went to the closest hospital' }
    ],
    mustNot: [
      { re: 'Go to an emergency department now, or call 911\\. What you describe|Emergency first:', why: 'must-pass: the fainting was two months ago and was treated, so there is no emergency instruction now' },
      { re: 'Contact the doctor today about what you describe', why: 'the only red flag was a past emergency that was treated, so there is no safety line' },
      { re: '(?<!\\b(?:no|not|never|without)\\b[^.\\n]{0,25})(?:Independent Review Entity|\\bIRE\\b)', why: 'Original Medicare has no Independent Review Entity step; that is Medicare Advantage' },
      { re: '65[- ]days?', why: 'the 65-day window is Medicare Advantage; this notice prints its own date' },
      { re: 'external review request|I (hereby )?request (an |a )?(independent )?external review|state insurance department', where: [9], why: 'Original Medicare has no external review; the next level is a reconsideration' },
      { re: 'EBSA|Department of Labor', why: 'Original Medicare is not an employer plan' },
      { re: '## 9\\. If they say no again — external review request', why: 'the section 9 heading for Original Medicare is the next level of review, not an external review request' },
      { re: '115\\s*%|115 percent|limiting charge|(?:non-?participating|(?:does not|doesn\'t|not) accept(?:s|ing)? assignment)[^.\\n]{0,100}(?:higher|more|extra|balance)|(?:owe|owed|bill(?:ed)?|pay)[^.\\n]{0,80}\\bdepends? on\\b[^.\\n]{0,60}(?:participat|assignment)', why: '(audit2, re-audit I-1) an ambulance claim is always paid on assignment: what he owes never depends on participation, and if Medicare pays he owes only the deductible and 20% coinsurance' },
      { re: "\\bI(?:'ve|\\s+have|\\s+hold)\\s+(?:a\\s+|his\\s+|the\\s+)?(?:durable\\s+|medical\\s+|health[- ]?care\\s+|financial\\s+)?power of attorney|\\bI'm his (?:POA|power of attorney)", stripped: true, why: '(audit2) the daughter said only that she handles his mail — no power of attorney' },
      { re: 'critically slow|dangerously (?:slow|low)|(?:significant|severe|profound|marked)(?:ly)? (?:slow|bradycardi)|\\bunstable\\b', where: [2, 3, 5, 9], stripped: true, why: '(audit2) the family was told only "very slow": severity words come from the chart, in brackets' },
      { re: 'Attn:?\\s*(?:the\\s+)?Medical Director', why: '(audit2) the notice says Attn: Redeterminations' },
      { re: "as additional documentation|corrected claim|(?:ask|have|asked|asking|request(?:ed|ing)?)\\s+(?:them|they|the (?:ambulance company|hospital|doctor'?s? office|provider)|Tri-County[^.?!\\n]{0,40}|Westbrook[^.?!\\n]{0,40}|your company|the company)\\b[^.?!\\n]{0,40}\\bto (?:send|submit|fax|mail|forward)\\b[^.?!\\n]{0,120}\\b(?:directly )?to (?:the )?(?:Medicare|your office)|(?:can|could|will|would) you (?:please )?(?:send|submit|fax|forward)\\b[^.?!\\n]{0,120}\\bto Medicare\\b", why: '(re-audit I-4) the records go to the family and in with the appeal: never sent to Medicare separately, as additional documentation, or as a corrected claim' },
      { re: 'peer-to-peer|(?<!Attn:?[^\\n]{0,40})\\bmedical director', where: [3, 4], stripped: true, why: '(audit2) Original Medicare has no peer-to-peer or medical-director step at redetermination' },
      { re: 'not validated', stripped: true, why: '(audit2) the test is that other transport was contraindicated; "not validated" garbles it' }
    ]
  },
  'J-urgent-irf-pdf-records': {
    ids: ['KHP-77102935', 'UM-IRF-2026-448190'],
    mustHave: [
      { re: '1-888-555-0172', where: [1, 4, 6, 10], why: 'urgent: the expedited appeal goes to the printed 24-hour line' },
      { re: '1-888-555-0186', where: [1, 4, 5, 10], why: 'the printed peer-to-peer line, time-limited' },
      { re: '165 minutes|2 hours 45 minutes|2\\.75 hours|2 hours and 45 minutes', where: [2, 3, 5], why: 'answers the stated reason with the newer record: 165 minutes on 10/27, not the 90 the reviewer saw' },
      { re: '10/27|October 27', where: [3, 5], why: 'the denial relied on 10/25; the 10/27 note is newer' },
      { re: 'speech', where: [3, 5], why: 'she needs physical, occupational and speech therapy' },
      { re: 'blood pressure|labetalol', where: [3, 5], why: 'she needs daily physician oversight (blood pressure titration, dysphagia), which a skilled nursing facility does not give' },
      { re: 'MP-REH-007', where: [2, 8], why: 'quotes and requests the named policy' },
      { re: "(doctor|physician|Dr\\.? Vasquez)[^.\\n]{0,100}(can|may|should|will) (call|request|file|ask)", where: [1, 4, 6, 10], why: 'in an urgent case the doctor can request the expedited appeal directly' },
      { re: '1-888-555-0186', where: [6, 7], why: '(audit2) the phone scripts keep the printed peer-to-peer number' }
    ],
    mustNot: [
      { re: 'Go to an emergency department now, or call 911\\. What you describe|Emergency first:', why: 'must-pass: she is already admitted, so there is no emergency-department instruction' },
      { re: 'Contact the doctor today about what you describe', why: 'she is in the hospital under her doctors\' care, so there is no safety line' },
      { re: 'EBSA|Department of Labor', where: [9, 10], why: 'the letter says the plan is insured and regulated by the state insurance department' },
      { re: '\\bI (?:documented|examined|evaluated|assessed|wrote|recorded|noted|consulted)\\b[^.\\n]{0,80}(?:10/26|October 26)|\\bmy (?:consult(?:ation)?|note|evaluation|assessment|exam(?:ination)?)\\b[^.\\n]{0,40}(?:10/26|October 26)', where: [3, 5], stripped: true, why: '(audit2) the 10/26 consult is Dr. Lindqvist\'s: a signer who did not write it would attest to it' },
      { re: "\\b(?:if|when)\\s+(?:the plan|Keystone|the (?:plan(?:'s)?\\s+)?(?:physician\\s+)?reviewer|the (?:plan(?:'s)?\\s+)?medical director|they)\\b[^.\\n]{0,60}\\bcalls?\\b", where: [4], why: '(audit2) the letter makes the peer-to-peer the doctor\'s call to place (1-888-555-0186, within 7 days) — never wait for one' },
      { re: 'billed for the (?:denied )?difference|hold the account', where: [1, 10], why: '(audit2) nothing has been billed: the exposure is going to Lakeshore without approval, not a hospital bill' },
      { re: 'physiatric oversight|not validated|(?:skilled nursing|SNF)[^.\\n]{0,60}\\b(?:1|one)\\s*(?:[–-]|to)\\s*(?:2|two) hours', where: [3, 5], stripped: true, why: '(audit2) the record says daily physician oversight; the SNF therapy figure and "not validated" are unsourced' },
      { re: '(?:patient|she) reports? (?:tolerat|participat)|participat\\w* fully in all', where: [3, 5], stripped: true, why: '(audit2) the minutes come from the therapy notes (she has aphasia), and only 10/25 reads "participating fully"' },
      { re: "authori[sz]ed to act on (?:her|his) behalf|\\bI(?:'ve|\\s+have|\\s+hold)\\s+(?:a\\s+|her\\s+|the\\s+)?(?:durable\\s+|medical\\s+|health[- ]?care\\s+)?power of attorney", stripped: true, why: '(audit2) the husband never said he holds legal authority' }
    ]
  }
};
for (const c of module.exports) Object.assign(c, DEPTH[c.id] || {});
