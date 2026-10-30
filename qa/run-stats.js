// Per-run summary from report.json: kits, checks, fails (dev / held-out), deadline exactness, identifiers.
const fs = require('fs');
const M = require(require('path').join(__dirname, 'manifest.js'));
const held = new Set(M.filter((c) => c.heldout).map((c) => c.id));
const out = [];
for (const r of process.argv.slice(2)) {
  const rep = JSON.parse(fs.readFileSync(require('path').resolve(__dirname, r, 'report.json'), 'utf8'));
  const s = { run: r.replace('rescore/', ''), kits: rep.length, checks: 0, fails: 0, devFails: 0, devKits: 0, hoFails: 0, hoKits: 0, deadlineOk: 0, deadlineN: 0, idOk: 0, idN: 0 };
  for (const k of rep) {
    const n = k.pass.length + k.fail.length; s.checks += n; s.fails += k.fail.length;
    if (held.has(k.id)) { s.hoFails += k.fail.length; s.hoKits++; } else { s.devFails += k.fail.length; s.devKits++; }
    for (const p of k.pass) { if (/deadline equals the hand-derived|no deadline invented/.test(p)) { s.deadlineOk++; s.deadlineN++; } if (/^identifier .* never appears altered|decode read the/.test(p)) { s.idOk++; s.idN++; } }
    for (const f of k.fail) { if (/deadline equals the hand-derived|no deadline invented/.test(f)) s.deadlineN++; if (/^identifier .* never appears altered|decode read the/.test(f)) s.idN++; }
  }
  s['fails/kit dev'] = (s.devFails / s.devKits).toFixed(1);
  s['fails/kit held-out'] = s.hoKits ? (s.hoFails / s.hoKits).toFixed(1) : '—';
  s['checks/kit'] = Math.round(s.checks / s.kits);
  s.deadline = `${s.deadlineOk}/${s.deadlineN}`; s.ids = `${s.idOk}/${s.idN}`;
  out.push(s);
}
console.table(out.map(({ run, kits, fails, ['fails/kit dev']: d, ['fails/kit held-out']: h, ['checks/kit']: c, deadline, ids }) => ({ run, kits, fails, 'fails/kit dev': d, 'fails/kit held-out': h, 'checks/kit': c, deadline, ids })));
