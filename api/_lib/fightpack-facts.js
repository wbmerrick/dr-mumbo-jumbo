// Fight Pack facts (v9.10): three things code now states or removes itself, because the writers kept
// getting them wrong after the prompt said otherwise. api/fightpack.js applies them after the guards.

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

module.exports = { AMBULANCE_ASSIGNED, isAmbulance, owedLine, policyNumbers, doctorMayRequest, WHY_DOCTOR };
