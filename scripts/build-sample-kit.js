// Rebuilds sample-kit.json: the finished kit the homepage shows when a visitor presses
// "Try an example".
//
// The sample is whatever the live site writes for its own example letter, unedited:
//   1. the example goes through the live site the way a visitor's build does
//      (qa/fp-run.js, the free path); the raw answers are kept in qa/evidence/sample/
//   2. the corpus checker scores them (qa/fp-check.js, with the case in qa/sample-case.js)
//   3. sample-kit.json is written only if the kit is whole and the checker finds no defect
// A build is one real kit: it spends one AI run and adds one kit to the counter.
//
//   node scripts/build-sample-kit.js           build on the live site, score, write
//   node scripts/build-sample-kit.js --check   score the stored build again and rewrite the file from it
//
// Run it again when the writing rules change (qa/tests/test-sample-kit.js says when the
// stored kit and the file disagree), and before the example letter's appeal deadline passes
// (its notice date plus 180 days): by then the letter in fightpack.js needs new dates.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const sample = require(path.join(root, 'qa', 'sample-case.js'));
const RUN = 'evidence/sample';
const runDir = path.join(root, 'qa', RUN);
const caseDir = path.join(runDir, sample.id);
const tool = (file, args, env) => spawnSync(process.execPath, ['-r', path.join(root, 'qa', 'sample-case.js'), path.join(root, 'qa', file)].concat(args),
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env: Object.assign({}, process.env, { FP_RUN: RUN }, env) });
const stop = (why) => { console.error('\nsample-kit.json was NOT written: ' + why); process.exit(1); };

// ---------- 1. build ----------
if (!process.argv.includes('--check')) {
  fs.rmSync(runDir, { recursive: true, force: true });
  const run = tool('fp-run.js', [sample.id], { FP_FREE: '1' });
  process.stdout.write(run.stdout || '');
  if (run.status !== 0) stop('the build did not run (' + (run.status === null ? 'no exit status' : 'exit ' + run.status) + ').');
  // what it was built from goes on record with it: the letter in fightpack.js can change later
  fs.writeFileSync(path.join(runDir, 'built.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), site: process.env.FP_BASE || 'https://dr-mumbo-jumbo.com', denial: sample.denial, extra: sample.extra }, null, 2) + '\n');
}
if (!fs.existsSync(path.join(runDir, 'built.json'))) stop('there is no stored build in qa/' + RUN + '. Run without --check.');
const built = JSON.parse(fs.readFileSync(path.join(runDir, 'built.json'), 'utf8'));
if (built.denial !== sample.denial || built.extra !== sample.extra) stop('the example letter in fightpack.js is no longer the one this kit was built from. Run without --check.');

// ---------- 2. whole? ----------
const parts = {};
for (let p = 1; p <= 6; p++) {
  const f = path.join(caseDir, 'part' + p + '.json');
  if (!fs.existsSync(f)) stop('part ' + p + ' never arrived.');
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const d = j.data || {};
  if (!j.ok || !d.text) stop('part ' + p + ' failed (' + j.status + ').');
  if (d.stop !== 'end_turn' && d.stop !== 'stop_sequence') stop('part ' + p + ' stops before its end (' + d.stop + ').');
  if ((d.missing || []).length) stop('part ' + p + ' is missing ' + d.missing.join(' and ') + '.');
  parts[p] = d.text;
}

// ---------- 3. score ----------
// "today" for the date checks is the day the kit was written, so a later --check reads it the same way
const check = tool('fp-check.js', [RUN, sample.id], { FP_TODAY: built.date });
if (check.status !== 0) stop('the checker did not run.');
const scored = JSON.parse(fs.readFileSync(path.join(runDir, 'report.json'), 'utf8')).find((r) => r.id === sample.id);
console.log('\nchecker: ' + scored.pass.length + ' pass, ' + scored.fail.length + ' fail, ' + scored.warn.length + ' warn (' + scored.stats.kit_words + ' words)');
scored.warn.forEach((w) => console.log('  warn: ' + w));
if (scored.fail.length) { scored.fail.forEach((x) => console.error('  FAIL: ' + x)); stop('the checker found ' + scored.fail.length + ' defect(s). Build again; do not edit the kit by hand.'); }

// ---------- 4. write ----------
const out = {
  about: "The kit the Fight Pack wrote for the homepage's own example letter, exactly as the site returned it. Never edit this file by hand: run scripts/build-sample-kit.js.",
  built: built.date,
  from: { denial: built.denial, extra: built.extra },
  parts: parts
};
fs.writeFileSync(path.join(root, 'sample-kit.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote sample-kit.json (' + fs.statSync(path.join(root, 'sample-kit.json')).size + ' bytes), built ' + built.date);
