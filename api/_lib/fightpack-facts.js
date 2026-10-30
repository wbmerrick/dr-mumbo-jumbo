// Fight Pack facts (v9.10-v9.11): what code now states, removes or tells the writers itself, because the writers
// kept getting it wrong after the prompt said otherwise. api/fightpack.js applies them after the guards.

const MONEY = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/;

// ---------- an ambulance claim is always paid on assignment ----------
// Under 42 CFR 414.610(b) Medicare pays for ambulance services only on an assignment-related basis: the
// company must accept Medicare's approved amount as payment in full. Held-out case I's kits made what the
// family owes depend on whether the company "participates" or "accepts assignment" in every run from 16 to
// 21, through a prompt rule against stating billing rules from memory (run-16 audit I-1, "up to 115%";
// run-21 re-audit, "if the ambulance provider is non-participating ... the amount could be higher").
// In the decode, code writes the "What you may actually owe" line; parts 2-6 are told the rule.
const AMBULANCE_ASSIGNED = "AMBULANCE ON ORIGINAL MEDICARE (decided in code): every ambulance claim is paid on assignment. If Medicare approves the claim, the ambulance company must accept Medicare's approved amount as payment in full, and the patient owes only the Part B deductible, if it is not yet met, and the 20% coinsurance. Never ask whether the company participates in Medicare or accepts assignment, and never say that what the patient owes depends on it.";
function isAmbulance(text) {
  return /\bambulance\b|\bA0(?:42[0-9]|43[0-6])\b/i.test(String(text || ''));
}
const OWED_LINE = /^([ \t]*(?:[-*•][ \t]+)?\*\*What you may (?:actually )?owe:?\*\*:?[ \t]*)(.+)$/im;
function owedLine(decode, source) {
  const m = String(decode).match(OWED_LINE);
  if (!m) return decode;
  // the notice's own total ("Total You May Be Billed $1,398.10"), else its maximum on one line, else the
  // writer's figure only when the notice prints it too; never a figure the notice does not show
  const src = String(source || '');
  const printed = src.match(/total you may be billed[^$\n]{0,40}(\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i) || src.match(/maximum you may be billed[^$\n]{0,40}(\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  const theirs = (m[2].match(MONEY) || [])[0];
  const max = printed ? printed[1] : theirs && src.includes(theirs) ? theirs : null;
  const line = `${max ? `The notice shows ${max} as the most you may be billed. ` : ''}If Medicare approves the claim on appeal, the ambulance company must accept Medicare's approved amount as payment in full (every ambulance claim is paid on assignment), so the patient owes only the Part B deductible, if it is not yet met, and the 20% coinsurance. If the denial stands, the notice's maximum applies.`;
  return decode.replace(m[0], m[1] + line);
}

// ---------- a coverage-policy number comes from the documents, never from memory ----------
// Run 21's doctor's letter for case I told the physician to cite "National Coverage Determination (NCD)
// 20.4", which is the policy for implantable defibrillators (run-21 re-audit). F's notice prints NCD 280.3,
// and the kits quote it correctly. A number after NCD or LCD that the patient's documents do not contain is
// dropped and the policy's name kept, the same rule the kit already applies to phone numbers.
const POLICY_NUMBER = /\b(National Coverage Determination(?:[ \t]*\(NCD\))?|Local Coverage Determination(?:[ \t]*\(LCD\))?|NCD|LCD)([ \t]+(?:No\.?[ \t]*|number[ \t]+|section[ \t]+|§[ \t]*)?)(L?\d{1,5}(?:\.\d{1,3})*)\b/g;
function policyNumbers(text, trusted) {
  const known = String(trusted || '');
  // the number as a whole token: "20.4" is not in "$1,320.40"
  const inSource = (num) => new RegExp(`(?<![\\d.,])${num.replace(/\./g, '\\.')}(?![\\d]|\\.\\d)`).test(known);
  return String(text).replace(POLICY_NUMBER, (all, name, gap, num) => (inSource(num) ? all : name));
}

// ---------- in an urgent case the doctor can ask for the expedited appeal ----------
// api/fightpack.js expeditedFirst puts the expedited request first and says why the doctor can make it.
// When the writer already led with the request, that reason was missing: the production kit for held-out
// case J (30 October 2026) told the family to call but never said the doctor can request it directly
// (29 CFR 2560.503-1(m)(1); 42 CFR 422.584; 42 CFR 438.410). Code adds it once to "Do this first".
const DO_FIRST = /^([ \t]*(?:[-*•][ \t]+)?\*\*Do this first:?\*\*:?[ \t]*)(.+)$/im;
// already said: "the doctor can request it directly …" (expeditedFirst) or any "Dr. Lee may call … expedited"
const DOCTOR_CAN = /\b(?:doctor|physician|clinician|Dr\.?[ \t]+[A-Z][\w'-]+)\b[^.\n]{0,100}\b(?:can|may)[ \t]+(?:also[ \t]+)?(?:call|request|file|ask)\b[^.\n]{0,160}\b(?:expedit|fast|urgent)/i;
const WHY_DOCTOR = "The doctor can request the expedited appeal directly, and when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent.";
function doctorMayRequest(decode) {
  const m = String(decode).match(DO_FIRST);
  if (!m || DOCTOR_CAN.test(decode)) return decode;
  if (!/expedit|fast appeal|urgent appeal/i.test(m[2].split(/[.;:]\s/)[0])) return decode;
  const lead = m[2].trim();
  return decode.replace(m[0], `${m[1]}${lead}${/[.!?]$/.test(lead) ? '' : '.'} ${WHY_DOCTOR}`);
}

// ---------- where the records go, on Original Medicare ----------
// A redetermination is decided on what comes with the request: evidence that arrives later adds up to 14 days to
// the decision each time (42 CFR 405.946, 405.950(b)(3)), and a claim denied for medical necessity is appealed,
// not resubmitted. Held-out case I's kits sent the doctor's letter to Medicare on its own (run-16 audit I-4), then
// the ambulance and hospital records (run-21 re-audit I-4), and run 23 asked the ambulance company to "submit it
// to Medicare now as additional documentation" and offered "a corrected claim". The rule that everything goes in
// together reached only parts 2-6, so the decode, which every writer follows, never had it. Part 1 now reads the
// program from the notice itself; parts 2-6 from the decode.
const ORIGINAL_RECORDS = 'WHERE THE RECORDS GO (Original Medicare; decided in code): the ambulance company\'s report, the hospital\'s records and the doctor\'s letter are sent to the family, who mail them together with the redetermination request to the address the notice prints. Never ask anyone to send records to Medicare separately, "directly" or "as additional documentation", and never suggest a corrected claim: evidence that arrives after the request delays the decision, and a denied claim is appealed, not resubmitted. If the ambulance company or another provider wants to act itself, it can file its own redetermination request.';
function originalNotice(text) {
  const t = String(text || '');
  if (/Medicare Summary Notice|Medicare Part [AB] Claims Office|Attn:?[ \t]*Redeterminations/i.test(t)) return true;
  // "Original Medicare" in the patient's words, unless the papers are a Medicare Advantage plan's
  return /\bOriginal Medicare\b/i.test(t) && !/Medicare Advantage|Advantage plan|Integrated Denial Notice/i.test(t);
}
// ---------- a dated record keeps its own words ----------
// With records attached, run 21's kit for held-out case J said she tolerated 90 minutes "on 10/24 and 10/25 (when
// she was fatigued)" in four sections, the doctor's letter included; the 10/24 note says "fatigued after sessions"
// and the 10/25 note "participating fully" (run-21 re-audit J-6, Major). Run 16 had it right and run 23 had it
// right, so it is a slip the writers make sometimes, not always; the rule goes to every part when records come in.
const DATED_RECORDS = 'DATED RECORDS (decided in code): when the kit says what a dated note or record shows, it uses that note\'s own words for that date. A description from one date never moves to another, and a run of dates is never summed up with a word that only one of them uses.';

// Rules added to a part's instructions (api/fightpack.js). ctx: part, denial, extra, decode, records (attached),
// and for parts 2-6, read from the decode: original (Original Medicare).
function extraRules(ctx) {
  const source = [ctx.denial || '', ctx.extra || ''].join('\n');
  let r = '';
  if (ctx.records) r += DATED_RECORDS + '\n\n';
  const om = ctx.part === 1 ? originalNotice(source) : !!ctx.original;
  if (om) {
    r += ORIGINAL_RECORDS + '\n\n';
    if (isAmbulance([source, ctx.decode || ''].join('\n'))) r += AMBULANCE_ASSIGNED + '\n\n';
  }
  return r;
}

module.exports = { AMBULANCE_ASSIGNED, ORIGINAL_RECORDS, DATED_RECORDS, isAmbulance, originalNotice, extraRules, owedLine, policyNumbers, doctorMayRequest, WHY_DOCTOR };
