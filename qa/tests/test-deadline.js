// The appeal deadline is the one number in the kit that must never be wrong.
// These cases pin the calculator against hand-checked answers, including month ends,
// a leap year, every date format a decode might use, and the cases it must refuse.
const assert = require('assert');
const { computeDeadline, parseDate } = require('../../api/fightpack.js')._test;
const iso = (d) => d && d.toISOString().slice(0, 10);
const block = (notice, printed) => `## 1. Your denial, decoded\n**Read from your letter — check these against the original:**\n- Patient: X\n- Notice date: ${notice}\n- Appeal deadline as printed: ${printed}\n- Send appeals to: P.O. Box 1\n`;
const cases = [
  // [notice, printed, expected ISO or null, why]
  ['October 14, 2026', 'within 65 calendar days from the date of this notice', '2026-12-18', 'Medicare Advantage 65-day window (Oct has 31 days)'],
  ['10/06/2026', 'within 180 days of this statement date', '2027-04-04', 'commercial 180 days across a year end'],
  ['September 22, 2026', 'within 180 days of the date of this notice', '2027-03-21', 'photo letter (case B)'],
  ['2026-10-20', 'within 180 days of the date of this letter', '2027-04-18', 'ISO notice date'],
  ['September 30, 2026', '180 days', '2027-03-29', 'bare day count'],
  ['Aug 31, 2027', 'within 180 days', '2028-02-27', 'leap year (Feb 2028 has 29 days)'],
  ['January 31, 2028', 'within 30 days', '2028-03-01', 'leap-year February crossing'],
  ['**October 14, 2026**', '**within 65 calendar days**', '2026-12-18', 'markdown bold values'],
  ['[not on the letter]', 'within 180 days', null, 'no notice date → no computed date'],
  ['October 14, 2026', '[not on the letter]', null, 'no window → no computed date'],
  ['October 14, 2026', 'within 30 business days', null, 'business days are left to the letter'],
  ['October 14, 2026', 'December 1, 2026', '2026-12-01', 'a printed date wins over arithmetic'],
  ['February 30, 2026', 'within 60 days', null, 'impossible date is rejected, not rolled over'],
];
let n = 0;
for (const [notice, printed, want, why] of cases) {
  const got = computeDeadline(block(notice, printed));
  assert.strictEqual(got ? iso(got.date) : null, want, `${why}: notice="${notice}" printed="${printed}" → ${got ? iso(got.date) : null}, want ${want}`);
  n++;
}
// label variants the model might produce
assert.strictEqual(iso(computeDeadline('- **Notice date:** 10/14/2026\n- **Appeal deadline as printed:** "within 65 calendar days of this notice"').date), '2026-12-18', 'bold labels + quotes');
assert.strictEqual(computeDeadline(''), null, 'empty decode');
assert.strictEqual(computeDeadline(null), null, 'null decode');
assert.strictEqual(iso(parseDate('3/1/2026')), '2026-03-01', 'single-digit m/d');
assert.strictEqual(parseDate('13/01/2026'), null, 'month 13 rejected');
// cross-check against an independent day count (ms arithmetic) for every day of a year
for (let i = 0; i < 366; i++) {
  const start = new Date(Date.UTC(2026, 0, 1) + i * 864e5);
  const label = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  for (const days of [30, 60, 65, 180]) {
    const got = computeDeadline(block(label, `within ${days} days`));
    assert.strictEqual(iso(got.date), iso(new Date(start.getTime() + days * 864e5)), `${label} + ${days}`);
    n++;
  }
}
console.log(`deadline calculator: ${n} cases passed`);
