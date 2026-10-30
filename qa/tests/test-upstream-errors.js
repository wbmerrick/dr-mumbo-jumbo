// What the reader sees when the model API refuses a request (v9.9). The account's spend limit or credit
// balance is said plainly ('budget'), not as a hiccup worth retrying; an unreadable or oversized attachment
// asks for a better copy; a plain rate limit asks for a minute; anything else stays a retryable hiccup.
// Runs in its own process because it swaps the mocked model API for one that fails.
const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
delete process.env.FIGHTPACK_FREE;
const u = require('../../lib/unlock.js');
const tok = u.sign({ sid: 'preview' });
function mockRes() { const r = { code: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }
let upstream = null; // [status, body]; body undefined = the reply is not JSON
global.fetch = async () => ({ ok: false, status: upstream[0], json: async () => { if (upstream[1] === undefined) throw new Error('not json'); return upstream[1]; } });
const fp = require('../../api/fightpack.js');
async function call(extra) { const res = mockRes(); await fp({ method: 'POST', body: Object.assign({ token: tok, part: 2, denial: 'x', decode: '## 1. x' }, extra || {}) }, res); return res; }
const err = (type, message, details) => ({ type: 'error', error: Object.assign({ type, message }, details ? { details } : {}) });

const refusals = [
  [400, err('invalid_request_error', 'You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC.'), 503, 'budget'],
  [400, err('invalid_request_error', 'You have reached your specified workspace API usage limits. You will regain access on 2026-12-01 at 00:00 UTC.'), 503, 'budget'],
  [400, err('invalid_request_error', 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.'), 503, 'budget'],
  [429, err('rate_limit_error', 'Spend limit reached.', { error_code: 'enforced_spend_limit_reached' }), 503, 'budget'],
  [402, err('billing_error', 'There is an issue with your account.'), 503, 'budget'],
  [400, err('invalid_request_error', 'messages.0.content.1.image.source.base64: image exceeds 5 MB maximum: 5300000 bytes > 5242880 bytes'), 400, 'file_unreadable'],
  [400, err('invalid_request_error', 'messages.0.content.1.document.source.base64.data: The PDF specified was not valid.'), 400, 'file_unreadable'],
  [400, err('invalid_request_error', 'A maximum of 100 PDF pages may be provided.'), 400, 'too_long'],
  [400, err('invalid_request_error', 'prompt is too long: 214000 tokens > 200000 maximum'), 400, 'too_long'],
  [413, err('request_too_large', 'Request exceeds the maximum allowed number of bytes.'), 400, 'too_long'],
  [429, err('rate_limit_error', 'Number of request tokens has exceeded your per-minute rate limit'), 429, 'upstream'],
  [529, err('overloaded_error', 'Overloaded'), 502, 'upstream'],
  [500, undefined, 502, 'upstream'],
  [400, err('invalid_request_error', 'max_tokens: Field required'), 502, 'upstream'],
];

(async () => {
  for (const [status, body, code, error] of refusals) {
    upstream = [status, body];
    const r = await call();
    assert.strictEqual(`${r.code} ${r.body && r.body.error}`, `${code} ${error}`, `upstream ${status}: ${body ? body.error.message : '(not json)'}`);
    // only a passing fault is called a hiccup; a cause that retrying cannot fix is named
    assert.strictEqual(/hiccup/i.test(r.body.message), code === 502, `wording for ${status} ${error}`);
  }
  // budget wording follows the mode: free by default, paid when FIGHTPACK_FREE=0
  upstream = refusals[0].slice(0, 2);
  let r = await call();
  assert(/free Fight Pack has reached its limit/.test(r.body.message), 'free-mode budget wording');
  process.env.FIGHTPACK_FREE = '0';
  r = await call();
  assert(/paused on our side/.test(r.body.message) && !/free/i.test(r.body.message), 'paid-mode budget wording');
  const locked = mockRes(); await fp({ method: 'POST', body: { denial: 'x' } }, locked);
  assert(locked.code === 401 && /checkout/.test(locked.body.message), 'paid-mode 401 wording');
  delete process.env.FIGHTPACK_FREE;
  const lockedFree = mockRes(); await fp({ method: 'POST', body: { denial: 'x' } }, lockedFree);
  assert(lockedFree.code === 401 && /free session/.test(lockedFree.body.message) && !/checkout/.test(lockedFree.body.message), 'free-mode 401 wording');
  // the free appeal letter and translator say the same plainly
  const appeal = require('../../api/appeal.js'), translate = require('../../api/translate.js');
  for (const [name, handler, body] of [['appeal', appeal, { denial: 'Denied CO-50.' }], ['translate', translate, { text: 'Hgb 9.1, BUN 32' }]]) {
    upstream = refusals[0].slice(0, 2);
    let x = mockRes(); await handler({ method: 'POST', body }, x);
    assert(x.code === 503 && x.body.error === 'budget' && /reached its limit/.test(x.body.message), name + ': budget');
    upstream = [500, undefined];
    x = mockRes(); await handler({ method: 'POST', body }, x);
    assert(x.code === 502 && /hiccup/.test(x.body.message), name + ': a passing fault is still a hiccup');
    upstream = [429, err('rate_limit_error', 'Number of request tokens has exceeded your per-minute rate limit')];
    x = mockRes(); await handler({ method: 'POST', body }, x);
    assert(x.code === 429, name + ': a rate limit is still a rate limit');
  }
  // past the visitor's free allowance the reader is told so and the model is not called; a request turned
  // away before the model (empty, too long) does not use the allowance
  let calls = 0; const failing = global.fetch; global.fetch = async (...a) => { calls++; return failing(...a); };
  upstream = [500, undefined];
  for (const [name, handler, body, empty] of [['appeal', appeal, { denial: 'Denied CO-50.' }, { denial: '' }], ['translate', translate, { text: 'Hgb 9.1, BUN 32' }, { text: '' }]]) {
    const headers = { 'x-real-ip': name === 'appeal' ? '198.51.100.7' : '198.51.100.8' };
    const perHour = u.FREE_USE[name][0];
    calls = 0;
    for (let i = 0; i < 40; i++) { const x = mockRes(); await handler({ method: 'POST', headers, body: empty }, x); assert.strictEqual(x.code, 400); }
    for (let i = 0; i < perHour; i++) { const x = mockRes(); await handler({ method: 'POST', headers, body }, x); assert.strictEqual(x.code, 502, `${name}: call ${i + 1} reaches the model`); }
    const x = mockRes(); await handler({ method: 'POST', headers, body }, x);
    assert(x.code === 429 && x.body.error === 'busy' && calls === perHour, `${name}: past the hourly allowance, no model call (${calls} calls)`);
    assert(/last hour/.test(x.body.message) && !/hiccup/.test(x.body.message), `${name}: the busy wording`);
    if (name === 'appeal') assert(/appeal deadline/.test(x.body.message), 'appeal: the deadline reminder');
    const other = mockRes(); await handler({ method: 'POST', headers: { 'x-real-ip': '203.0.113.9' }, body }, other);
    assert.strictEqual(other.code, 502, `${name}: another visitor still reaches the model`);
  }
  global.fetch = failing;
  console.log(`upstream-refusal tests passed (${refusals.length} refusals, both modes; appeal and translator too, with their per-visitor allowance)`);
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });
