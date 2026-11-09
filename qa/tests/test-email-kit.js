const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
delete process.env.RESEND_API_KEY; delete process.env.RESEND_FROM;
const u = require('../../lib/unlock.js');
const handler = require('../../api/email-kit.js');

function mockRes(){ const r = { code: 0, body: null, headers: {} }; r.setHeader = (k,v)=>{ r.headers[k]=v; }; r.status = (c)=>{ r.code=c; return r; }; r.json = (b)=>{ r.body=b; return r; }; return r; }
const token = u.sign({ sid: 'cs_test_kit' });
const KIT = 'LETTER OF MEDICAL NECESSITY\n\nDear reviewer, ...\n\n\nYOUR DEADLINES\n- Internal appeal: 2027-03-13 (180 days)';
const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Dr Mumbo Jumbo <hello@dr-mumbo-jumbo.com>';

// fetch stub: records calls, answers by host
let calls = [];
let resendOk = true, supabaseStatus = 201;
let resendStatus = 401, resendBody = '';   // used when resendOk is false
let resendHang = false;                    // never answers: the timeout must cut it

// what the counter wrote, so the diagnosis can be asserted
const counted = [];
const realLog = console.log;
console.log = (s) => { if (typeof s === 'string' && s.startsWith('[dmj] ')) counted.push(JSON.parse(s.slice(6))); else realLog(s); };
global.fetch = async (url, opts) => {
  // the funnel count is its own endpoint; keep it out of `calls` so the resend and
  // waitlist assertions below still see exactly the calls they are about
  if (String(url).includes('/rpc/dmj_count')) return { ok: true, status: 204 };
  calls.push({ url: String(url), opts });
  if (String(url).includes('api.resend.com')) {
    if (resendHang) return new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    if (resendOk) return { ok: true, status: 200, text: async () => '{"id":"49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"}' };
    return { ok: false, status: resendStatus, text: async () => resendBody };
  }
  if (String(url).includes('supabase')) return { ok: supabaseStatus < 300, status: supabaseStatus };
  throw new Error('unexpected fetch ' + url);
};
const resendCall = () => calls.find(c => c.url.includes('api.resend.com'));
const sentJson = () => JSON.parse(resendCall().opts.body);

(async () => {
  let res;
  res = mockRes(); await handler({ method:'GET' }, res); assert.strictEqual(res.code, 405, 'GET 405');
  res = mockRes(); await handler({ method:'POST', body:{ email:'nope', kit:KIT, token } }, res); assert.strictEqual(res.code, 400, 'bad email'); assert.strictEqual(res.body.error, 'email');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:'   ', token } }, res); assert.strictEqual(res.code, 400, 'empty kit'); assert.strictEqual(res.body.error, 'empty');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:'x'.repeat(60001), token } }, res); assert.strictEqual(res.code, 413, 'too big');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token:'garbage' } }, res); assert.strictEqual(res.code, 401, 'bad token');
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res); assert.strictEqual(res.code, 503, 'unconfigured'); assert.strictEqual(calls.length, 0, 'no network when unconfigured');

  // One variable switches email on. There is no domain variable: the sending domain is whatever
  // the from address uses, and Resend checks it against the domains verified in the account.
  process.env.RESEND_API_KEY = 're_test_key';

  // send fails -> 502, address NOT kept
  resendOk = false; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(res.code, 502, 'send failure 502');
  assert.strictEqual(calls.filter(c => c.url.includes('supabase')).length, 0, 'no address kept when send failed');

  // success -> 200, resend called correctly, address kept with source kit-email
  resendOk = true; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'  Will@Example.COM ', kit:KIT, token } }, res);
  assert.strictEqual(res.code, 200, 'sent'); assert(res.body.ok, 'ok flag');
  const rs = resendCall();
  assert(rs, 'resend called');
  assert.strictEqual(rs.url, RESEND_URL, 'resend url');
  assert.strictEqual(rs.opts.method, 'POST', 'POST');
  assert.strictEqual(rs.opts.headers.Authorization, 'Bearer re_test_key', 'bearer auth');
  assert.strictEqual(rs.opts.headers['Content-Type'], 'application/json', 'json content type');
  assert(/\S/.test(rs.opts.headers['User-Agent'] || ''), 'User-Agent set (Resend\'s edge rejects requests without one as a 403, error 1010)');
  assert.strictEqual(typeof rs.opts.body, 'string', 'body is a JSON string');
  const msg = JSON.parse(rs.opts.body);
  assert.deepStrictEqual(msg.to, ['will@example.com'], 'to lowercased/trimmed, as an array');
  assert.strictEqual(msg.from, DEFAULT_FROM, 'from');
  assert.strictEqual(msg.subject, 'Your Fight Pack', 'subject');
  assert(msg.text.startsWith(KIT), 'text carries the kit');
  assert(msg.html.includes('&lt;') === false && msg.html.includes('LETTER OF MEDICAL NECESSITY'), 'html carries the kit');
  assert.deepStrictEqual(Object.keys(msg).sort(), ['from', 'html', 'subject', 'text', 'to'], 'exactly the five fields: nothing else about the visitor goes to Resend');
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

  // RESEND_FROM overrides the sender. This is how the pipeline gets proven before the domain is
  // verified: Resend's own test sender delivers to the account owner's address and nobody else.
  process.env.RESEND_FROM = 'Dr Mumbo Jumbo <onboarding@resend.dev>'; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(sentJson().from, 'Dr Mumbo Jumbo <onboarding@resend.dev>', 'RESEND_FROM honoured');
  process.env.RESEND_FROM = '   '; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(sentJson().from, DEFAULT_FROM, 'blank RESEND_FROM falls back to the real sender');
  delete process.env.RESEND_FROM; calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(sentJson().from, DEFAULT_FROM, 'unset RESEND_FROM is the real sender');

  // html escapes markup inside the kit
  calls = [];
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:'<script>x</script> & "q"', token } }, res);
  const h = sentJson().html;
  assert(h.includes('&lt;script&gt;') && h.includes('&amp;') && h.includes('&quot;q&quot;'), 'html escaped');

  // ---------- the 502 explains itself ----------
  // Each body is a refusal Resend actually sends (resend.com/docs/api-reference/errors). The
  // shape is {statusCode, name, message}; `name` is recorded alongside the diagnosis.
  const cases = [
    // key problems. Note the second: Resend calls a bad key a validation_error, so the name
    // alone would send you to fix the message fields.
    [401, '{"statusCode":401,"name":"missing_api_key","message":"Missing API Key"}',                       'key_rejected',           /RESEND_API_KEY/],
    [401, '{"statusCode":401,"name":"validation_error","message":"API key is invalid"}',                   'key_rejected',           /RESEND_API_KEY/],
    [403, '{"statusCode":403,"name":"restricted_api_key","message":"API key is not active"}',              'key_rejected',           /RESEND_API_KEY/],
    [403, '{"statusCode":403,"name":"suspended_api_key","message":"This API key is suspended"}',           'key_rejected',           /RESEND_API_KEY/],
    // domain problems: the two 403s that will actually happen between "key added" and "DNS verified"
    [403, '{"statusCode":403,"name":"validation_error","message":"The dr-mumbo-jumbo.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"}', 'domain_not_verified', /resend\.com\/domains/],
    [403, '{"statusCode":403,"name":"validation_error","message":"You can only send testing emails to your own email address (will@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."}', 'recipient_not_authorized', /RESEND_FROM/],
    // message problems
    [422, '{"statusCode":422,"name":"missing_required_field","message":"The request body is missing one or more required fields."}', 'bad_request', /message itself/],
    [400, '{"statusCode":400,"name":"validation_error","message":"An error was found with one or more fields in the request."}',     'bad_request', /message itself/],
    // quota and rate: three different 429s, three different fixes
    [429, '{"statusCode":429,"name":"daily_quota_exceeded","message":"You have reached your daily email quota."}',     'daily_quota_exceeded',   /100.*day|24 ?h/i],
    [429, '{"statusCode":429,"name":"monthly_quota_exceeded","message":"You have reached your monthly email quota."}', 'monthly_quota_exceeded', /3,000.*month|upgrade/i],
    [429, '{"statusCode":429,"name":"rate_limit_exceeded","message":"Too many requests. Please limit the number of requests per second."}', 'rate_limited', /retry/i],
    // a 403 whose words say nothing recognisable, and a non-JSON body (Resend's edge answers
    // 403 "error code: 1010" when a request has no User-Agent): neither may crash the parser
    [403, '{"statusCode":403,"name":"validation_error","message":"Forbidden"}',                            'forbidden',              /Verified/],
    [403, 'error code: 1010',                                                                              'forbidden',              /Verified/],
    [404, '{"statusCode":404,"name":"not_found","message":"The requested endpoint does not exist."}',       'endpoint_not_found',     /email-kit\.js/],
    [500, '{"statusCode":500,"name":"application_error","message":"An unexpected error occurred."}',        'resend_down',            /retry/i],
    [503, '{"statusCode":503,"name":"service_unavailable","message":"API is temporarily unavailable"}',     'resend_down',            /retry/i]
  ];
  for (const [status, body, why, fixRe] of cases) {
    resendOk = false; resendStatus = status; resendBody = body; counted.length = 0; calls = [];
    res = mockRes();
    await handler({ method:'POST', body:{ email:'will@example.com', kit:KIT, token } }, res);
    assert.strictEqual(res.code, 502, status + ' ' + why + ' -> still a 502 to the visitor');
    const f = counted.find(c => c.evt === 'kit_email_failed');
    assert(f, status + ' ' + why + ' -> failure was counted');
    assert.strictEqual(f.status, status, status + ' ' + why + ' -> status recorded');
    let expectName = null; try { expectName = JSON.parse(body).name || null; } catch (e) { expectName = null; }
    assert.strictEqual(f.name, expectName, status + ' ' + why + ' -> Resend error name recorded (null when the body is not JSON)');
    assert.strictEqual(f.why, why, status + ' ' + why + ' -> diagnosed');
    assert(fixRe.test(f.fix), status + ' ' + why + ' -> fix names the thing to change: ' + f.fix);
    // the visitor's address must never reach a log line, even though Resend echoed it
    const blob = JSON.stringify(f);
    assert(!/will@example\.com/.test(blob), status + ' ' + why + ' -> address not logged');
    assert(!/[^\s@"<>]+@[^\s@"<>]+\.[a-z]{2,}/i.test(blob), status + ' ' + why + ' -> no address at all, not even in the fix text');
    assert.strictEqual(calls.filter(c => c.url.includes('supabase')).length, 0, status + ' ' + why + ' -> address not kept on failure');
  }

  // Resend echoing the account owner's address back is scrubbed, not stored
  resendOk = false; resendStatus = 403; resendBody = '{"statusCode":403,"name":"validation_error","message":"You can only send testing emails to your own email address (will@example.com)."}';
  counted.length = 0;
  res = mockRes(); await handler({ method:'POST', body:{ email:'will@example.com', kit:KIT, token } }, res);
  const scrubbed = counted.find(c => c.evt === 'kit_email_failed');
  assert(/<email>/.test(scrubbed.detail), 'echoed address replaced with a placeholder');
  assert(!/will@example/.test(scrubbed.detail), 'echoed address gone');

  // a hanging Resend is cut off, not left to burn the function's 30s
  resendHang = true; counted.length = 0;
  const t0 = Date.now();
  res = mockRes(); await handler({ method:'POST', body:{ email:'a@b.co', kit:KIT, token } }, res);
  assert.strictEqual(res.code, 502, 'hanging send -> 502');
  assert(Date.now() - t0 < 20000, 'hanging send is cut off by the timeout');
  assert.strictEqual(counted.find(c => c.evt === 'kit_email_failed').why, 'network_or_timeout', 'hang diagnosed as timeout');
  resendHang = false;

  console.log = realLog;
  console.log('test-email-kit: ok (including 502 diagnosis)');
})().catch(e => { console.error(e); process.exit(1); });
