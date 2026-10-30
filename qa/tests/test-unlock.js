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
  res = mockRes(); await checkout({ method:'GET', headers:{} }, res); assert.deepStrictEqual(res.body, { configured:false, preview:true });
  res = mockRes(); await checkout({ method:'POST', headers:{} }, res); assert.strictEqual(res.code, 503, 'unconfigured checkout');
  console.log('all unlock/handler tests passed');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
