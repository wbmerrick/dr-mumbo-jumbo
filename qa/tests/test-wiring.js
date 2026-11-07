// Static wiring check for the homepage: every control has a handler, and no handler calls
// a helper that does not exist.
//
// Why this exists: deleting the paid path meant cutting ranges out of fightpack.js, and two
// of those cuts took live code with them - the `buy` ("Build my Fight Pack") and `regen`
// ("Rebuild with edits") click handlers - leaving a homepage whose main button did nothing.
// A third left a call to a deleted clearStash() helper, which threw on every completed kit.
// None of it was caught by the test suite, and checking in a browser that the button EXISTS
// does not catch it either. This checks that it is wired.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

// ---------- 1. every control on the page is referenced by the script ----------
const controls = [...html.matchAll(/<(?:button|form|textarea|input|a)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
ok(controls.length >= 8, 'found the page controls (' + controls.length + ')');
const unwired = controls.filter((id) => !new RegExp("[('\"]" + id + "['\")]").test(js) && !new RegExp('\\b' + id + '\\b').test(js));
ok(unwired.length === 0, 'every control is referenced by fightpack.js; orphans: ' + unwired.join(', '));

// ---------- 2. the primary actions are actually bound to a listener ----------
// The homepage is one loop: paste -> build -> email. If any of these three is not bound to
// a handler, the site looks fine and does nothing.
const bound = (id) => new RegExp("(?:\\b" + id + "|\\$\\('" + id + "'\\))\\s*\\.addEventListener").test(js);
for (const id of ['buy', 'regen', 'mailform']) ok(bound(id), id + ' is bound to a listener');

// ---------- 3. no call to a helper that no longer exists ----------
const defined = new Set();
for (const m of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of js.matchAll(/(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
for (const m of js.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);          // var a = 1, b = 2
for (const m of js.matchAll(/function\s*[A-Za-z_$][\w$]*\s*\(([^)]*)\)|function\s*\(([^)]*)\)/g)) (m[1] || m[2] || '').split(',').forEach((p) => defined.add(p.trim()));
const GLOBALS = new Set(['if','for','while','switch','catch','return','typeof','function','new','else','do','String','Number','Boolean','Array','Object','JSON','Date','Math','Promise','RegExp','Error','URLSearchParams','FileReader','AbortController','setTimeout','clearTimeout','setInterval','clearInterval','fetch','encodeURIComponent','decodeURIComponent','parseInt','parseFloat','isNaN','alert','confirm','print','require','Set','Map','atob','btoa','Image','Blob','window','document','console','localStorage','sessionStorage','history','location','navigator']);
// Strip comments and string literals first: prose like "high contrast(ish)" is not a call,
// and allowlisting such words one by one would hide real misses behind the allowlist.
const code = js
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
  .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
  .replace(/`(?:\\.|[^`\\])*`/g, '``');
const called = new Set([...code.matchAll(/(?:^|[^\w$.])([a-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
const missing = [...called].filter((name) => !defined.has(name) && !GLOBALS.has(name));
ok(missing.length === 0, 'every helper called in fightpack.js is defined; missing: ' + missing.join(', '));

console.log('wiring tests passed (' + n + ' assertions, ' + controls.length + ' controls)');
