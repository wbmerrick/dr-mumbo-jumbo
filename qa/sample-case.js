// The homepage's own example, described the way manifest.js describes a corpus case, so the
// corpus tools can build it and score it. It is NOT in manifest.js: a corpus run stays ten cases.
// Preload this file to add it for one command:
//   FP_FREE=1 FP_RUN=evidence/sample node -r ./qa/sample-case.js qa/fp-run.js S-homepage-example
//   node -r ./qa/sample-case.js qa/fp-check.js evidence/sample S-homepage-example
// scripts/build-sample-kit.js runs both and writes sample-kit.json, the kit the page shows
// when a visitor presses "Try an example".
//
// The letter and the note are read out of fightpack.js, so the sample is always built from
// exactly what that button puts in the two boxes. Everything under `expect` was worked out
// by hand from that letter, not from a kit.
const fs = require('fs');
const path = require('path');
const page = fs.readFileSync(path.join(__dirname, '..', 'fightpack.js'), 'utf8');
function literal(name) {
  const m = page.match(new RegExp('var ' + name + " = ('(?:[^'\\\\\\n]|\\\\.)*');"));
  if (!m) throw new Error(name + ' is not in fightpack.js');
  return new Function('return ' + m[1])();
}

const sample = {
  id: 'S-homepage-example',
  title: "The homepage's own example: a lumbar MRI denied as not medically necessary",
  denial: literal('EXAMPLE_DENIAL'),
  extra: literal('EXAMPLE_EXTRA'),
  file: null,
  // Notice dated 10/02/2026, 180 days to appeal (so the deadline is 2027-03-31), service already
  // received on 09/14/2026 (so the review is never expedited), reference 00000000. The letter
  // does not say what kind of plan it is.
  expect: { denial_type: ['medical-necessity'], plan_type: ['commercial', 'unknown'], service_type: ['post-service'], claim_number: '00000000', denial_date: '2026-10-02', stated_appeal_deadline: null, appeal_window_days: 180, urgent: false },
  letter3: 'lmn',
  phi: [],
  reason: 'conservative therapy',
  ids: ['00000000'],
  notes: 'Policy IMG-204 asks for six weeks of conservative therapy unless red-flag findings are present. The patient had eight weeks of physical therapy and naproxen, and new left-leg weakness and numbness: the rule is met and its own exception applies. A good kit argues both, and brackets everything the letter does not give (the member, the doctor, the plan).',
  mustHave: [
    { re: '(eight|8) weeks', where: [1, 2, 3], why: 'eight weeks of therapy before the MRI answer the six-week rule' },
    { re: 'red[- ]flag', where: [1, 2, 3, 5], why: "the policy's own exception: red-flag findings" },
    { re: 'weakness', where: [2, 3], why: 'the new leg weakness is the red-flag finding' }
  ],
  mustNot: []
};

module.exports = sample;
const cases = require('./manifest.js');
if (!cases.some((c) => c.id === sample.id)) cases.push(sample);
