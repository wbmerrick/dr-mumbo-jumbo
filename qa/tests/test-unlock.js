const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
const path = require('path').join(__dirname, '../../lib/unlock.js');
const u = require(path);
const t = u.sign({ sid: 'cs_test_abc' });
assert(t && t.split('.').length === 2, 'token shape');
const p = u.verify(t);
assert(p && p.sid === 'cs_test_abc' && p.exp > p.iat, 'roundtrip');
assert.strictEqual(u.verify(t.slice(0, -2) + 'zz'), null, 'tampered sig');
const [data] = t.split('.');
assert.strictEqual(u.verify(data + '.' + Buffer.from('x').toString('base64')), null, 'wrong sig len');
// expired
const crypto = require('crypto');
const key = u.signingKey();
const body = Buffer.from(JSON.stringify({ sid: 'x', iat: 1, exp: 2 })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sig = crypto.createHmac('sha256', key).update(body).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
assert.strictEqual(u.verify(body + '.' + sig), null, 'expired');
assert.strictEqual(u.verify('garbage'), null, 'garbage');
// key changes when stripe key appears
process.env.STRIPE_SECRET_KEY = 'sk_test_zzz';
assert.strictEqual(u.verify(t), null, 'old token invalid after key change');
delete process.env.STRIPE_SECRET_KEY;
// handlers
function mockRes(){ const r = { code: 0, body: null, headers: {} }; r.setHeader = (k,v)=>{ r.headers[k]=v; }; r.status = (c)=>{ r.code=c; return r; }; r.json = (b)=>{ r.body=b; return r; }; return r; }
(async () => {
  const unlock = require('../../api/unlock.js');
  let res = mockRes(); await unlock({ method:'POST', body:{ code:'nope' } }, res); assert.strictEqual(res.code, 403, 'bad code 403');
  process.env.FIGHTPACK_PREVIEW_CODE = 'PREVIEW-1';
  res = mockRes(); await unlock({ method:'POST', body:{ code:'PREVIEW-1' } }, res); assert.strictEqual(res.code, 200); assert(res.body.token, 'preview token');
  const tok = res.body.token;
  res = mockRes(); await unlock({ method:'POST', body:{ session_id:'cs_test_abc' } }, res); assert.strictEqual(res.code, 503, 'no stripe → 503');
  res = mockRes(); await unlock({ method:'POST', body:{ session_id:'bad id' } }, res); assert.strictEqual(res.code, 400, 'bad session id');
  const fp = require('../../api/fightpack.js');
  res = mockRes(); await fp({ method:'POST', body:{ denial:'x' } }, res); assert.strictEqual(res.code, 401, 'no token → 401');
  res = mockRes(); await fp({ method:'POST', body:{ token: tok } }, res); assert.strictEqual(res.code, 400, 'empty → 400');
  delete process.env.ANTHROPIC_API_KEY;
  res = mockRes(); await fp({ method:'POST', body:{ token: tok, denial:'Denied CO-50', part: 2 } }, res); assert.strictEqual(res.code, 503, 'no api key → 503');
  res = mockRes(); await fp({ method:'POST', body:{ token: tok, denial:'x', file:{ kind:'image', media_type:'image/jpeg', data:'a'.repeat(4300001) } } }, res); assert.strictEqual(res.code, 400); assert.strictEqual(res.body.error, 'file_too_big');
  const checkout = require('../../api/checkout.js');
  res = mockRes(); await checkout({ method:'GET', headers:{} }, res); assert.deepStrictEqual(res.body, { configured:false, preview:true, free:true });
  // free mode (the default): any visitor gets a token, a few an hour; each token covers a few kits
  const ipA = { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }, ipB = { 'x-real-ip': '198.51.100.2' };
  const free = [];
  for (let i = 0; i < u.FREE_TOKENS_PER_HOUR; i++) { res = mockRes(); await unlock({ method:'POST', headers: ipA, body:{ free:true } }, res); assert.strictEqual(res.code, 200, 'free token ' + i); free.push(res.body.token); }
  assert.strictEqual(new Set(free).size, free.length, 'every free token is distinct');
  res = mockRes(); await unlock({ method:'POST', headers: ipA, body:{ free:true } }, res); assert.strictEqual(res.code, 429, 'per-visitor hourly limit'); assert.strictEqual(res.body.error, 'busy');
  res = mockRes(); await unlock({ method:'POST', headers: ipB, body:{ free:true } }, res); assert.strictEqual(res.code, 200, 'another visitor is not affected');
  const ft = res.body.token;
  assert.strictEqual(u.verify(ft).sid, 'free');
  for (let i = 1; i < u.FREE_CALLS_PER_TOKEN; i++) assert(u.verify(ft), 'free call ' + i);
  assert.strictEqual(u.verify(ft), null, 'a free token stops after its share of calls');
  const realNow = Date.now, H = 3600 * 1000;
  Date.now = () => realNow() + 2 * H;
  try { assert.strictEqual(u.verify(ft), null, 'a spent free token stays spent hours later (no hourly refill)'); } finally { Date.now = realNow; }
  // per visitor: a few tokens an hour and a capped number a day
  const ipC = { headers: { 'x-real-ip': '192.0.2.44' } }, t0 = realNow();
  let got = 0;
  for (let h = 0; h < 5; h++) for (let k = 0; k < u.FREE_TOKENS_PER_HOUR; k++) if (u.mintFree(ipC, t0 + h * 2 * H + k).token) got++;
  assert.strictEqual(got, u.FREE_TOKENS_PER_DAY, 'per-visitor daily limit');
  assert(u.mintFree(ipC, t0 + 33 * H).token, 'the next day starts fresh');
  assert(u.verify(tok) && u.verify(tok) && u.verify(tok), 'preview and paid tokens are never throttled');
  res = mockRes(); await fp({ method:'POST', body:{ token: ft, denial:'x' } }, res); assert.strictEqual(res.code, 401, 'spent free token → 401 (the page then asks for a new one)');
  process.env.FIGHTPACK_FREE = 'off';
  res = mockRes(); await unlock({ method:'POST', headers: ipB, body:{ free:true } }, res); assert.strictEqual(res.code, 403, 'free mode off → checkout only');
  res = mockRes(); await checkout({ method:'GET', headers:{} }, res); assert.strictEqual(res.body.free, false);
  delete process.env.FIGHTPACK_FREE;
  res = mockRes(); await checkout({ method:'POST', headers:{} }, res); assert.strictEqual(res.code, 503, 'unconfigured checkout');
  console.log('all unlock/handler tests passed');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
