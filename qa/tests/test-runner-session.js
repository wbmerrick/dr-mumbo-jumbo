// The test runner (qa/fp-run.js) on the free path: a session the server stops taking is replaced.
//
// Why this exists: a free session covers 24 calls (lib/unlock.js), which is four kits with no retry.
// The page gets a new session when the server refuses the old one; the runner did not, so a ten-case
// run on the free path died at its fifth kit, and the header said to use the preview code instead.
// The run that checks a change to the AI's instructions has to be able to go through all ten cases.
//
// Runs the runner itself, as a child process, against a small stand-in for the site on this machine.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const qa = path.join(__dirname, '..');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };
let complete = false;
process.on('exit', () => { if (!complete) { console.error('test-runner-session.js stopped before its end'); process.exitCode = 1; } });

// A stand-in site: every session is good for `allow` calls, then refused, as a used-up free session is.
function site(allow) {
  const seen = { unlocks: 0, calls: [], refused: 0 };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      const json = (code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
      if (req.url === '/api/unlock') { seen.unlocks++; return json(200, { token: 'session-' + seen.unlocks }); }
      if (req.url !== '/api/fightpack') return json(404, {});
      const used = seen.calls.filter((c) => c.token === body.token).length;
      if (used >= allow) { seen.refused++; return json(401, { error: 'locked', message: 'Your session has expired.' }); }
      seen.calls.push({ token: body.token, part: body.part, live: body.live === true });
      const text = '## ' + body.part + '. Section ' + body.part + '\n\n**Type of denial:** Medical necessity.\n\n**Case strength:** Strong.';
      const done = { part: body.part, text, stop: 'end_turn', missing: [] };
      if (body.live !== true) return json(200, done);
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8' });
      res.write('data: ' + JSON.stringify({ from: 0, lines: ['## 1. Section 1'] }) + '\n\n');
      res.end('data: ' + JSON.stringify({ done }) + '\n\n');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ seen, base: 'http://127.0.0.1:' + server.address().port, close: () => server.close() })));
}
function run(base, env) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-run-'));
  const clean = Object.assign({}, process.env);
  ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy', 'NODE_USE_ENV_PROXY', 'FP_CODE', 'FP_FREE', 'FP_LIVE'].forEach((k) => delete clean[k]);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(qa, 'fp-run.js'), 'A-sleep-paraphrase'], { env: Object.assign(clean, { FP_BASE: base, FP_RUN: path.relative(qa, out), FP_CONC: '1' }, env) });
    let text = '';
    child.stdout.on('data', (d) => { text += d; });
    child.stderr.on('data', (d) => { text += d; });
    child.on('close', (code) => resolve({ code, text, kit: fs.existsSync(path.join(out, 'A-sleep-paraphrase', 'kit.md')) ? fs.readFileSync(path.join(out, 'A-sleep-paraphrase', 'kit.md'), 'utf8') : '' }));
  });
}
const partsOk = (text) => [2, 3, 4, 5, 6].filter((p) => new RegExp('part ' + p + ' ok').test(text));

(async () => {
  // 1. a session that runs out part-way through a kit: four calls, then refused
  {
    const s = await site(4);
    const r = await run(s.base, { FP_FREE: '1', FP_LIVE: '1' });
    s.close();
    ok(/decode ok/.test(r.text), 'the first section is built (' + r.text.split('\n').filter((l) => /decode|FAILED/.test(l)).join(' | ').slice(0, 160) + ')');
    same(partsOk(r.text), [2, 3, 4, 5, 6], 'and all five other parts, though the session ran out after four calls');
    ok(!/FAILED/.test(r.text), 'no part is reported failed');
    same(s.seen.refused, 2, '(two calls were refused together)');
    same(s.seen.unlocks, 2, 'one new session is asked for, for both of them, not one each');
    same([1, 2, 3, 4, 5, 6].filter((p) => new RegExp('^## ' + p + '\\. Section', 'm').test(r.kit)), [1, 2, 3, 4, 5, 6], 'the kit that is written holds all six parts');
    same(s.seen.calls.filter((c) => c.live).map((c) => c.part), [1], '(the first section was asked for live, once)');
  }
  // 2. the session is refused at the very first call: the live request is asked again under a new one
  {
    const s = await site(0);
    const r = await run(s.base, { FP_FREE: '1', FP_LIVE: '1' });
    s.close();
    ok(/part 1 FAILED 401/.test(r.text), 'a session refused twice running is a failure, reported as one (the runner replaces a session once per call)');
    ok(s.seen.unlocks === 2, 'after one replacement (' + s.seen.unlocks + ' sessions asked for)');
  }
  // 3. with the preview code there is nothing to replace: a refusal is the answer
  {
    const s = await site(0);
    const r = await run(s.base, { FP_CODE: 'not-the-code' });
    s.close();
    ok(/part 1 FAILED 401/.test(r.text) && s.seen.unlocks === 1, 'on the code path a refused session is not replaced (' + s.seen.unlocks + ' asked for)');
  }
  complete = true;
  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.join('\n  - '));
  console.log('runner-session tests passed (' + n + ' checks)');
})().catch((e) => { complete = true; console.error(e.stack || e); process.exit(1); });
