// Fight Pack facts (v9.10-v9.13): what code now states, removes or tells the writers itself, because the writers
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
// v9.12: the rule says only what to do. Its v9.11 wording quoted the phrases to avoid ("as additional
// documentation", "a corrected claim"), and run 24 wrote both of them again; negative examples prime the error.
// v9.13: the run-26 audit (I-R3-2) found "mail … by February 11" and "120 days from the notice date": the request
// is filed when the contractor receives it, and the 120 days run from receipt of the notice, presumed 5 days after
// its date (42 CFR 405.942(a)).
const ORIGINAL_RECORDS = "WHERE THE RECORDS GO (Original Medicare; decided in code): every record (the provider's own records, for an ambulance its trip report; the hospital's records; the doctor's letter) is sent to the family, who mail them in one package with the redetermination request to the address the notice prints. On Original Medicare a denied claim is appealed, and that package is how the documentation reaches Medicare. A provider that wants to act itself files its own redetermination request. A record that arrives after the request was mailed goes to the same address with the claim number, and each later submission can add up to 14 days to the decision. The request counts as filed on the day the contractor receives it, so the deadline is the day it must arrive: the family mails it at least a week early by a trackable method. The 120 days run from the day the notice was received, which Medicare presumes is 5 days after the date on it.";

// ---------- v9.13: the expedited external review on an insured employer plan ----------
// The run-26 audit (J-R3-2, borderline Critical): J's kit had the concurrent expedited external review request
// faxed to the plan. On an insured plan the state's process applies, and under the NAIC model act it is filed with
// the state insurance commissioner, who assigns the reviewer; the reviewer may decide the expedited internal appeal
// must finish first; and if the plan upholds the denial, expedited external review can be asked for that day
// (45 CFR 147.136(c)(2)(iii), (d)). The decode's "Two requests at once" line (api/fightpack.js) and the writers
// say where it goes.
const EXTERNAL_ROUTE = {
  insured: " On an insured plan it generally goes to your state's insurance department, which assigns the independent reviewer; the department or the plan's expedited line can tell you how to file it today. The reviewer may decide the plan's expedited appeal has to finish first.",
  'self-funded': " On a self-funded plan it goes to the plan, which must send it to an independent review organization.",
};
const EXTERNAL_UPHELD = ' If the plan upholds the denial, ask for the expedited external review that same day.';
const INSURED_EXTERNAL = "EXPEDITED EXTERNAL REVIEW ON THIS INSURED PLAN (decided in code): the expedited external review request is addressed to the state insurance department, the regulator the letter names, which assigns the independent reviewer. The kit tells the family to call the department, or the plan's expedited line, to learn how to file it today, and that the reviewer may decide the plan's expedited appeal has to finish first. If the plan upholds the denial, the family asks for the expedited external review that same day.";

// ---------- v9.12: the provider's part, on Original Medicare ----------
// The billing-office script's own spec told every writer to "ask whether the provider will submit a corrected
// claim, add documentation, or appeal" (right for a commercial plan's coding error). On Original Medicare a denied
// claim is appealed, so case I's kits asked the ambulance company to send its records to Medicare itself, or to
// file a corrected claim, in 7 of the 8 runs from 16 to 24, through the v9.11 rule against it: the spec outvoted
// the rule. Code now gives the writer the Original Medicare version of that line, and takes the provider route
// out of what the writers still produce (medicareRoute).
const PROVIDER_ASK = "ask whether the provider will submit a corrected claim, add documentation, or appeal on the patient's behalf (for coding, authorization, or level-of-care denials this is usually the fastest fix)";
const PROVIDER_ASK_ORIGINAL = 'ask them to send you their records for the date of service (for an ambulance, the trip report) so the records go in with your redetermination request, and whether they will also file their own redetermination request';
// The doctor's letter has the same conflict: its spec offers "a peer-to-peer discussion", which Original Medicare
// does not have at redetermination, and run 25's letter offered one ("[If peer-to-peer is offered, I am available
// at …]") under the rule that says there is none.
const P2P_OFFER = 'if the notice prints a peer-to-peer line, say the clinician will call it within the window it gives; otherwise offer a peer-to-peer discussion at [best days/times and direct phone]';
const P2P_OFFER_ORIGINAL = "the contractor decides on the written record, so close with the clinician's direct line for any question about the letter: [best days/times and direct phone]";
function specFor(spec, ctx) {
  return ctx && ctx.original ? String(spec).split(PROVIDER_ASK).join(PROVIDER_ASK_ORIGINAL).split(P2P_OFFER).join(P2P_OFFER_ORIGINAL) : spec;
}
// An alternative that sends records to Medicare apart from the appeal, a corrected claim or a resubmission;
// never one that sends them to the family or with the provider's own redetermination request.
function providerRoute(x) {
  if (/\bto (?:me|us|you|the family)\b|\bown redetermination\b|\bwith (?:my|our|your|the) (?:appeal|request|redetermination)\b/i.test(x)) return false;
  return /corrected claim|resubmi|(?:additional|more|supporting|further) documentation|\bto Medicare\b|\bsubmit\b[^,]{0,40}\b(?:documentation|records?|trip (?:report|sheet)|run (?:report|sheet))\b/i.test(x);
}
const PROVIDER_EDITS = [
  // "Will your company submit additional documentation or appeal on Harold's behalf?" → "… appeal on Harold's behalf?"
  [/\b((?:re)?submit\b[^?.!;\n]{0,90}?),?[ \t]+or[ \t]+(?=(?:file|start|support|request|appeal)\b)/gi, (all, x) => (providerRoute(x) ? '' : all)],
  // "… file an appeal or submit additional documentation on the patient's behalf?" → "… file an appeal on …"
  [/(\b(?:file|start|support)\b[^?.!;\n]{0,60}?)[ \t]+or[ \t]+((?:re)?submit\b[^?.!;\n]{0,60}?)(?=[ \t]+on\b[^?.!;\n]{0,40}\bbehalf\b|[ \t]*[?.!;]|$)/gim, (all, a, x) => (providerRoute(x) ? a : all)],
  // a clause that sends the records to Medicare on their own
  [/,?[ \t]+or ask (?:the|your|them|him|her)\b[^.?!;\n]{0,100}?\bto (?:submit|send)\b[^.?!;\n]{0,60}?\bto Medicare\b[^.?!;\n]*/gi, ''],
  [/[ \t]*(?:—|–|;|,)[ \t]*if not, ask (?:them|it|the\b[^.?!;\n]{1,40}?) to (?:submit|send) (?:it|them)\b[^.?!;\n]{0,40}?\bto Medicare\b[^.?!;\n]*/gi, ''],
  [/[ \t]+or will be (?:submitted|sent)\b[^.?!;\n]{0,40}?\bas additional documentation\b/gi, ''],
  [/,[ \t]*or should (?:the|your)\b[^.?!;\n]{0,60}?\b(?:submit|send) (?:it|them)\b[^.?!;\n]{0,20}?\bdirectly to Medicare\b/gi, ''],
  // a question asking the provider to send its records to Medicare: they come to the family instead
  [/\b(can|could|will|would) (you|your company|your office|they)( be willing to)? (?:re)?submit (it|them|documentation|records|the [\w -]{1,40}?|your [\w -]{1,40}?)((?: now)?(?: directly)? to Medicare(?: now)?(?: as additional documentation)?|(?: now)? as additional documentation)\b/gi,
    (all, v, who, will, obj, tail) => `${v} ${who}${will || ''} send ${/^(?:it|them)$/i.test(obj) ? obj + ' to me' : 'me ' + obj}${/\bnow\b/i.test(tail) ? ' now' : ''}`],
  // "ask them to submit it to Medicare now …" → "ask them to send it to you"
  [/\bask (them|him|her|the\b[^.?!;\n]{1,60}?) to (?:submit|send|fax|mail) (it|them|the\b[^.?!;\n]{1,40}?)(?: directly)? to Medicare\b(?: now)?(?: as additional documentation)?/gi, (all, who, obj) => `ask ${who} to send ${obj} to you`],
  // the optional sentence a letter carries about a provider sending records to Medicare, and the offer to a
  // doctor's office to send the letter to Medicare itself
  [/[ \t]*\[I have (?:also )?asked\b[^\[\]\n]{0,160}?\bto Medicare\b[^\[\]\n]*\]/gi, ''],
  [/[ \t]*\bIf you prefer to (?:send|submit|fax|mail)\b[^.?!\n]{0,60}?\bdirectly to (?:Medicare|the Medicare|the contractor)\b[^.?!\n]*[.?!]/gi, ''],
  // run 26 (§4, the run-26 audit's I-4 residue): "If you prefer, your office can fax the letter and records directly
  // to the Medicare contractor and send the family a copy for their records."
  [/[ \t]*\bIf you(?: would)? prefer,?[ \t]+(?:you|your (?:office|practice|team|company))[ \t]+(?:can|could|may)[ \t]+(?:also[ \t]+)?(?:fax|send|mail|submit|forward)\b[^.?!\n]{0,100}?\b(?:directly|straight)[ \t]+to[ \t]+(?:the[ \t]+)?(?:Medicare|contractor)\b[^.?!\n]*[.?!]/gi, ''],
];
// The run-21 forms (the re-audit's own I-4 examples): "ask Tri-County … and Westbrook … to send their records to
// the Medicare claims office", "Can you send the emergency department records … to Medicare and to me?", and the
// letter's "[I have asked … to send … directly to your office …]". Who receives the records instead depends on who
// is speaking: the family is "you" in the decode and the deadlines, and speaks as "me" in its own letters and
// scripts, as "us" in its note to the doctor's office; the doctor's letter and brief say "the family".
const SEND_TO = { 1: 'you', 2: 'me', 3: 'the family', 4: 'us', 5: 'the family', 6: 'me', 7: 'me', 8: 'me', 9: 'me', 10: 'you' };
const TO_MEDICARE = String.raw`(?:directly[ \t]+)?to[ \t]+(?:the[ \t]+)?Medicare\b(?:'s)?(?:[ \t]+(?:Part[ \t]+[AB][ \t]+)?(?:claims|appeals)[ \t]+office|[ \t]+address(?:[ \t]+on[ \t]+the[ \t]+(?:letter|notice))?|[ \t]+contractor|[ \t]+appeals)?`;
// what is sent: never across a comma or a new clause ("… to you, and you mail everything to Medicare" is the family's own step)
const SENT = String.raw`(?:(?!\b(?:and|then|so)[ \t]+(?:you|I|we)\b|\bto[ \t]+(?:me|us|you|the[ \t]+family)\b)[^.?!;,\n]){1,140}?`;
const ROUTE_ASK = new RegExp(String.raw`(\b(?:ask|asked|asking|have|request(?:ed|ing)?)\b[^.?!;,\n]{1,140}?\bto[ \t]+(?:send|submit|fax|mail|forward)\b${SENT})${TO_MEDICARE}`, 'gi');
const ROUTE_CAN = new RegExp(String.raw`(\b(?:can|could|will|would)[ \t]+(?:you|your[ \t]+(?:company|office|team)|they)(?:[ \t]+please)?(?:[ \t]+be[ \t]+willing[ \t]+to)?[ \t]+(?:send|fax|forward|mail)\b${SENT})${TO_MEDICARE}(?:[ \t]+and[ \t]+(?:to[ \t]+)?(?:me|us))?`, 'gi');
const ROUTE_BRACKET = /[ \t]*\[I(?:'ve| have)? (?:also )?asked\b[^\[\]\n]{0,200}?\bto (?:send|submit|fax|mail|forward)\b[^\[\]\n]{0,160}?\b(?:directly to (?:your office|you)|to (?:the )?Medicare\b)[^\[\]\n]*\]/gi;
function medicareRoute(text) {
  let sec = 0;
  return String(text).split('\n').map((line) => {
    const h = line.match(/^##[ \t]+(\d{1,2})\./);
    if (h) { sec = Number(h[1]); return line; }
    let l = line;
    for (const [re, to] of PROVIDER_EDITS) l = l.replace(re, to);
    const who = SEND_TO[sec] || 'you';
    l = l.replace(ROUTE_BRACKET, '').replace(ROUTE_ASK, `$1to ${who}`).replace(ROUTE_CAN, `$1to ${who === 'the family' ? 'the family' : 'me'}`);
    // with one alternative left, "Which is faster?" has nothing to compare
    if (l !== line) l = l.replace(/(\?)[ \t]+Which (?:one )?(?:is|would be) (?:faster|quicker|better|easier)\?/gi, '$1');
    return l;
  }).join('\n');
}
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
  if (ctx.part > 1 && ctx.urgent === true && ctx.plan === 'commercial' && ctx.funding === 'insured' && ctx.care !== 'post') r += INSURED_EXTERNAL + '\n\n';
  return r;
}

module.exports = { AMBULANCE_ASSIGNED, ORIGINAL_RECORDS, DATED_RECORDS, PROVIDER_ASK, PROVIDER_ASK_ORIGINAL, P2P_OFFER, P2P_OFFER_ORIGINAL, EXTERNAL_ROUTE, EXTERNAL_UPHELD, INSURED_EXTERNAL, isAmbulance, originalNotice, extraRules, specFor, medicareRoute, owedLine, policyNumbers, doctorMayRequest, WHY_DOCTOR };
