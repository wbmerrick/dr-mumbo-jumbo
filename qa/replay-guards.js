// Replays the current deterministic layer (api/_lib/fightpack-guards.js postProcess, and for part 6 the
// tracker-json overwrite from the decode, exactly as the server runs them) on a stored run's model
// outputs, to isolate what the deterministic layer alone changes.
// The stored text has already been through the guards of its own engine version; rerunning a guard that
// already ran is a no-op, so the replay adds only what newer guards would change.
// Usage: node replay-guards.js <fromRun> <toRun>
const fs = require('fs'), path = require('path');
const G = require(path.join(__dirname, '..', 'api', '_lib', 'fightpack-guards.js'));
const H = require(path.join(__dirname, '..', 'api', 'fightpack.js'))._test;
const M = require(path.join(__dirname, 'manifest.js'));
const [from, to] = process.argv.slice(2).map((r) => path.resolve(__dirname, r));
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
const tot = {};
for (const c of fs.readdirSync(to).filter((d) => /^[A-J]-/.test(d))) {
  const m = M.find((x) => x.id === c) || {};
  const parts = {};
  const decode = JSON.parse(fs.readFileSync(path.join(to, c, 'part1.json'), 'utf8')).data.text;
  for (let p = 1; p <= 6; p++) {
    const f = path.join(to, c, `part${p}.json`);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = G.postProcess(j.data.text, { part: p, safety: p > 1 ? G.safetyOf(decode) : null, known: [m.denial || '', m.extra || '', p > 1 ? decode : ''].join('\n'), attachments: !!(m.file || m.records), records: !!m.records });
    for (const [k, v] of Object.entries(r.counts)) tot[k] = (tot[k] || 0) + v;
    // the handler's own code steps after the guards, as the server runs them (v9.8.1)
    const funding = H.fundingOf ? H.fundingOf(decode, m.denial || '') : null;
    const routed = p > 1 && H.oneRoute ? H.oneRoute(r.text, funding) : r.text;
    const out = p === 6 ? H.fixMeta(routed, H.decodeFacts(decode), H.fallbackFacts ? H.fallbackFacts(decode) : undefined)
      : p === 1 && H.expeditedFirst ? H.expeditedFirst(H.twoRequests(routed), r.level || G.safetyOf(routed)) : routed; // a stored decode is already rendered
    j.data.text = out; fs.writeFileSync(f, JSON.stringify(j, null, 2)); parts[p] = out;
  }
  fs.writeFileSync(path.join(to, c, 'kit.md'), [1, 2, 3, 4, 5, 6].map((p) => parts[p]).filter(Boolean).join('\n\n'));
}
console.log(JSON.stringify(tot));
