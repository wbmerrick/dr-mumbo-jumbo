// Replays the current code guards (lib/fightpack-guards.js postProcess, exactly as the server runs them)
// on a stored run's model outputs, to isolate what the deterministic layer alone changes.
// The stored text has already been through the guards of its own engine version; rerunning a guard that
// already ran is a no-op, so the replay adds only what newer guards would change.
// Usage: node replay-guards.js <fromRun> <toRun>
const fs = require('fs'), path = require('path');
const G = require(path.join(__dirname, '..', 'lib', 'fightpack-guards.js'));
const M = require(path.join(__dirname, 'manifest.js'));
const [from, to] = process.argv.slice(2).map((r) => path.resolve(__dirname, r));
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
const tot = {};
for (const c of fs.readdirSync(to).filter((d) => /^[A-H]-/.test(d))) {
  const m = M.find((x) => x.id === c) || {};
  const parts = {};
  const decode = JSON.parse(fs.readFileSync(path.join(to, c, 'part1.json'), 'utf8')).data.text;
  for (let p = 1; p <= 6; p++) {
    const f = path.join(to, c, `part${p}.json`);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = G.postProcess(j.data.text, { part: p, safety: p > 1 ? G.safetyOf(decode) : null, known: [m.denial || '', m.extra || '', p > 1 ? decode : ''].join('\n'), attachments: !!m.file, records: false });
    for (const [k, v] of Object.entries(r.counts)) tot[k] = (tot[k] || 0) + v;
    j.data.text = r.text; fs.writeFileSync(f, JSON.stringify(j, null, 2)); parts[p] = r.text;
  }
  fs.writeFileSync(path.join(to, c, 'kit.md'), [1, 2, 3, 4, 5, 6].map((p) => parts[p]).filter(Boolean).join('\n\n'));
}
console.log(JSON.stringify(tot));
