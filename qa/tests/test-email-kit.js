const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
delete process.env.MAILGUN_API_KEY; delete process.env.MAILGUN_DOMAIN; delete process.env.MAILGUN_API_BASE;
const u = require('../../lib/unlock.js');
const handler = require('../../api/email-kit.js');

function mockRes(){ const r = { code: 0, body: null, headers: {} }; r.setHeader = (k,v)=>{ r.headers[k]=v; }; r.status = (c)=>{ r.code=c; return r; }; r.json = (b)=>{ r.body=b; return r; }; return r; }
const token = u.sign({ sid: 'cs_test_kit' });
const KIT = 'LETTER OF MEDICAL NECESSITY\n\nDear reviewer, ...\n\n\nYOUR DEADLINES\n- Internal appeal: 2027-03-13 (180 days)';

// fetch stub: records calls, answers by host
let calls = [];
let mailgunOk = true, supabaseStatus = 201;
global.fetch = async (url, opts) => {
  // the funnel count is its own endpoint; keep it out of `calls` so the mailgun and
  // waitlist assertions below still see exactly the calls they are about
  if (String(url).includes('/rpc/dmj_count')) return { ok: true, status: 204 };
  calls.push({ url: String(url), opts });
  if (String(url).includes('mailgun')) return { ok: mailgunOk, status: mailgunOk ? 200 : 401 };
  if (String(url).includes('supabase')) return { ok: supabaseStatus < 300, status: supabaseStatus };
  throw new Error('unexpected fetch ' + url);
};

(async () => {
  let res;
  res = mockRes(); await handler({ method:'GET' }, res); assert.strictEqual(res.code, 405, 'GET 405');
  res = mockRes(); await handler({ method:'POST', body:{ email:'nope', kit:KIT, token } }, res); assert.strictEqual(res.code, 400, 'bad email'); assert.strictEqual(res.body.error, 'email');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:'   ', token } }, res); assert.strictEqual(res.code, 400, 'empty kit'); assert.strictEqual(res.body.error, 'empty');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:'x'.repeat(60001), token } }, res); assert.strictEqual(res.code, 413, 'too big');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token:'garbage' } }, res); assert.strictEqual(res.code, 401, 'bad token');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res); assert.strictEqual(res.code, 503, 'unconfigured'); assert.strictEqual(calls.length, 0, 'no network when unconfigured');

  process.env.MAILGUN_API_KEY = 'key-test'; process.env.MAILGUN_DOMAIN = 'dr-mumbo-jumbo.com';

  // send fails -> 502, address NOT kept
  mailgunOk = false; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(res.code, 502, 'send failure 502');
  assert.strictEqual(calls.filter(c => c.url.includes('supabase')).length, 0, 'no address kept when send failed');

  // success -> 200, mailgun called correctly, address kept with source kit-email
  mailgunOk = true; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'  Will@Example.COM ', kit:KIT, token } }, res);
  assert.strictEqual(res.code, 200, 'sent'); assert(res.body.ok, 'ok flag');
  const mg = calls.find(c => c.url.includes('mailgun'));
  assert(mg, 'mailgun called');
  assert.strictEqual(mg.url, 'https://api.mailgun.net/v3/dr-mumbo-jumbo.com/messages', 'mailgun url');
  assert.strictEqual(mg.opts.headers.Authorization, 'Basic ' + Buffer.from('api:key-test').toString('base64'), 'basic auth');
  const form = mg.opts.body; assert(form instanceof URLSearchParams, 'form body');
  assert.strictEqual(form.get('to'), 'will@example.com', 'to lowercased/trimmed');
  assert.strictEqual(form.get('from'), 'Dr Mumbo Jumbo <hello@dr-mumbo-jumbo.com>', 'from');
  assert.strictEqual(form.get('subject'), 'Your Fight Pack', 'subject');
  assert(form.get('text').startsWith(KIT), 'text carries the kit');
  assert(form.get('html').includes('&lt;') === false && form.get('html').includes('LETTER OF MEDICAL NECESSITY'), 'html carries the kit');
  const sb = calls.find(c => c.url.includes('supabase'));
  assert(sb, 'address kept');
  const row = JSON.parse(sb.opts.body)[0];
  assert.strictEqual(row.email, 'will@example.com'); assert.strictEqual(row.source, 'kit-email'); assert.strictEqual(row.fighting, null);
  assert.strictEqual(sb.opts.headers.Prefer, 'return=minimal', 'no upsert, no row returned');
  assert(!sb.url.includes('on_conflict'), 'no on_conflict (needs SELECT under RLS)');

  // duplicate address -> still 200
  supabaseStatus = 409; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(res.code, 200, 'duplicate address is fine');

  // EU region base
  process.env.MAILGUN_API_BASE = 'https://api.eu.mailgun.net/'; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert(calls.find(c => c.url === 'https://api.eu.mailgun.net/v3/dr-mumbo-jumbo.com/messages'), 'EU base honoured, trailing slash trimmed');

  // html escapes markup inside the kit
  process.env.MAILGUN_API_BASE = ''; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:'<script>x</script> & "q"', token } }, res);
  const h = calls.find(c => c.url.includes('mailgun')).opts.body.get('html');
  assert(h.includes('&lt;script&gt;') && h.includes('&amp;') && h.includes('&quot;q&quot;'), 'html escaped');

  console.log('test-email-kit: ok');
})().catch(e => { console.error(e); process.exit(1); });
