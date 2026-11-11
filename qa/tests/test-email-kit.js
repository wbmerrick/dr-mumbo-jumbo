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
let checkinPlan = [];                      // what Resend answers to each scheduled (check-in) email, in order

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
    // A scheduled email is a check-in (see the last section). Each is answered from checkinPlan, in
    // order: 'ok' · 'hang' · [status, body, retry-after seconds]. 'ok' once the plan runs out.
    let scheduled = null;
    try { scheduled = JSON.parse(opts.body).scheduled_at || null; } catch (e) { scheduled = null; }
    if (scheduled) {
      const a = checkinPlan.length ? checkinPlan.shift() : 'ok';
      if (a === 'hang') return new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
      if (a === 'ok') return { ok: true, status: 200, text: async () => '{"id":"5f1c0a52-7d0e-4f0b-9d0c-1b8f6f0e2a11"}' };
      return { ok: false, status: a[0], headers: { get: (h) => (String(h).toLowerCase() === 'retry-after' && a[2] ? String(a[2]) : null) }, text: async () => a[1] };
    }
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

  // ---------- check-ins: two emails later, only if the reader asked ----------
  // Why this is here: an emailed kit was the last thing the site ever heard about an appeal. A
  // reader can now tick a box and be asked, 3 days on, whether it was sent, and about four weeks
  // on, what happened (lib/checkin.js writes the two emails; qa/tests/test-checkin.js checks them).
  // They are scheduled with Resend at the moment the kit goes out, so nothing on our side keeps a
  // list of who asked. What must hold: nobody gets one who did not ask; the kit email is never
  // held up or failed by them; the first email promises the second, so it only goes out if the
  // second is set; pressing the button twice does not double them; and the address stays out of
  // every count, as it always has.
  const ci = require('../../lib/checkin.js');
  const DAY = 86400000;
  const KID = 'usp722atowp1';
  const resendCalls = () => calls.filter(c => c.url.includes('api.resend.com'));
  const scheduledCalls = () => resendCalls().filter(c => JSON.parse(c.opts.body).scheduled_at);
  const lastCount = (evt) => counted.filter(c => c.evt === evt).pop();
  const linksIn = (text) => [...text.matchAll(/https:\/\/dr-mumbo-jumbo\.com\/checkin#\S+/g)].map(m => Object.fromEntries(new URLSearchParams(new URL(m[0]).hash.slice(1))));
  const send = async (more) => { const r = mockRes(); await handler({ method:'POST', body: Object.assign({ email:'will@example.com', kit:KIT, token }, more || {}) }, r); return r; };
  const fresh = () => { calls = []; counted.length = 0; checkinPlan = []; resendOk = true; resendHang = false; supabaseStatus = 201; };
  const PLAIN = 'Sent. Check your inbox — and spam, the first time.';

  // not asked: one email, as before
  for (const [what, more] of [['no word about check-ins', {}], ['check-ins declined', { checkin: false }], ['a "true" that is text, not a tick', { checkin: 'true' }], ['a 1', { checkin: 1 }]]) {
    fresh();
    res = await send(Object.assign({ kid: KID, src: 'reddit' }, more));
    assert.strictEqual(res.code, 200, what + ': the kit is sent');
    assert.strictEqual(resendCalls().length, 1, what + ': one email goes to Resend, the kit');
    assert.strictEqual(res.body.message, PLAIN, what + ': the reader is told what they were always told');
    assert.deepStrictEqual(lastCount('kit_emailed'), { evt: 'kit_emailed', src: 'reddit', checkins: 0 }, what + ': counted as a kit emailed, with the word for its source, and no check-ins');
  }
  fresh();
  res = await send({});
  assert.deepStrictEqual(lastCount('kit_emailed'), { evt: 'kit_emailed', src: 'unknown', checkins: 0 }, 'a page that names no source is counted as unknown');
  fresh();
  res = await send({ kid: '../../etc/passwd; DROP TABLE x', src: 'Reddit Thread?id=5&name=John Smith' });
  assert.deepStrictEqual(lastCount('kit_emailed'), { evt: 'kit_emailed', src: 'redditthreadid5namejohns', checkins: 0 }, 'the source word is cut down exactly as the build counter cuts it');
  // The kit's tag is not counted here, asked for or not. This request is the one that carries the
  // reader's address, and the address is kept (for launch news) in the same second: a tag in this
  // count line would sit beside it by time. The tag goes into the check-in links and nowhere else.
  assert(!JSON.stringify(counted).includes('etcpasswd'), 'the kit\'s tag is not written into the emailed-kit count');

  // asked: the kit, then the two check-ins
  fresh();
  const sent0 = Date.now();
  res = await send({ checkin: true, kid: KID, src: 'reddit' });
  const sent1 = Date.now();
  assert.strictEqual(res.code, 200, 'asked: the kit is sent');
  assert.strictEqual(resendCalls().length, 3, 'asked: three emails go to Resend');
  assert.strictEqual(JSON.parse(resendCalls()[0].opts.body).scheduled_at, undefined, 'asked: the kit goes first and goes now');
  assert.deepStrictEqual(Object.keys(JSON.parse(resendCalls()[0].opts.body)).sort(), ['from', 'html', 'subject', 'text', 'to'], 'asked: the kit email itself is unchanged, the same five fields');
  const sched = scheduledCalls();
  assert.strictEqual(sched.length, 2, 'asked: two check-ins are scheduled');
  const byStage = {};
  for (const c of sched) {
    const m = JSON.parse(c.opts.body);
    assert.strictEqual(c.url, RESEND_URL, 'check-in: sent to Resend\'s single-email endpoint, where scheduling is documented');
    assert.strictEqual(c.opts.method, 'POST', 'check-in: POST');
    assert.strictEqual(c.opts.headers.Authorization, 'Bearer re_test_key', 'check-in: bearer auth');
    assert.strictEqual(c.opts.headers['Content-Type'], 'application/json', 'check-in: json');
    assert(/\S/.test(c.opts.headers['User-Agent'] || ''), 'check-in: User-Agent set');
    assert.deepStrictEqual(Object.keys(m).sort(), ['from', 'html', 'scheduled_at', 'subject', 'text', 'to'], 'check-in: the five fields and the time, nothing else');
    assert.deepStrictEqual(m.to, ['will@example.com'], 'check-in: goes to the address the kit went to');
    assert.strictEqual(m.from, DEFAULT_FROM, 'check-in: from the same sender as the kit');
    assert(!m.text.includes('LETTER OF MEDICAL NECESSITY') && !m.html.includes('LETTER OF MEDICAL NECESSITY') && !/Dear reviewer|2027-03-13/.test(m.text + m.html), 'check-in: no part of the kit is in it');
    const links = linksIn(m.text);
    assert(links.length >= 2 && links.every(l => l.k === KID), 'check-in: its links carry the kit\'s own tag');
    const stage = Number(links[0].s);
    assert(links.every(l => { const k = ci.check(l); return k.ok && k.kid === KID && k.stage === stage; }), 'check-in: every link in it is one the answer endpoint takes');
    const due = Date.parse(m.scheduled_at) - ci.STAGES[stage].days * DAY;
    assert(due >= sent0 && due <= sent1, 'check-in ' + stage + ': scheduled ' + ci.STAGES[stage].days + ' days from now (' + m.scheduled_at + ')');
    const key = c.opts.headers['Idempotency-Key'];
    assert(typeof key === 'string' && key.length > 20 && key.length <= 256, 'check-in: carries an idempotency key');
    assert(!/@|will|example/.test(key), 'check-in: the key does not spell out the address (' + key + ')');
    byStage[stage] = { m, key };
  }
  assert.deepStrictEqual(Object.keys(byStage), ['1', '2'], 'asked: one check-in for each question');
  assert(byStage[1].key !== byStage[2].key, 'asked: each has its own idempotency key');
  // The first email says another is coming. So the second is set first, and the first only after it.
  assert.strictEqual(linksIn(JSON.parse(sched[0].opts.body).text)[0].s, '2', 'the week-4 email is scheduled before the day-3 one that promises it');
  assert(/check in/i.test(res.body.message) && /3 days/.test(res.body.message) && res.body.message.startsWith(PLAIN), 'asked: the reader is told the kit is sent and when the first check-in comes ("' + res.body.message + '")');
  assert.strictEqual(res.body.checkins, 2, 'asked: the page is told two were set');
  assert.deepStrictEqual(lastCount('kit_emailed'), { evt: 'kit_emailed', src: 'reddit', checkins: 2 }, 'asked: counted with how many check-ins were set');
  assert(!JSON.stringify(counted).includes(KID), 'asked: the tag in the links is in no count from this request, which is the one that holds the address');
  assert(!counted.some(c => c.evt === 'checkin_failed'), 'asked: nothing is counted as failed');
  assert.strictEqual(calls.filter(c => c.url.includes('supabase')).length, 1, 'asked: the address is kept once, as for any emailed kit');
  const firstKeys = [byStage[1].key, byStage[2].key];

  // pressing the button twice: the same keys, so Resend sets each check-in once
  fresh();
  res = await send({ checkin: true, kid: KID, src: 'reddit' });
  assert.deepStrictEqual(scheduledCalls().map(c => c.opts.headers['Idempotency-Key']).sort(), firstKeys.slice().sort(), 'the same kit to the same address carries the same idempotency keys');
  fresh();
  res = await send({ checkin: true, kid: KID, email: 'other@example.com' });
  assert(scheduledCalls().every(c => !firstKeys.includes(c.opts.headers['Idempotency-Key'])), 'the same kit to a corrected address is a different pair of check-ins');
  fresh();
  res = await send({ checkin: true, kid: 'c78pt31832ma' });
  assert(scheduledCalls().every(c => !firstKeys.includes(c.opts.headers['Idempotency-Key'])), 'and so is another kit to the same address');
  // Resend answers a repeat of a key it has already taken, with a new time in it, with a 409: it is already set.
  fresh();
  checkinPlan = [[409, '{"statusCode":409,"name":"invalid_idempotent_request","message":"Same idempotency key used with a different request payload."}'], [409, '{"statusCode":409,"name":"invalid_idempotent_request","message":"Same idempotency key used with a different request payload."}']];
  res = await send({ checkin: true, kid: KID });
  assert.strictEqual(res.body.checkins, 2, 'a check-in Resend already holds counts as set');
  assert(!counted.some(c => c.evt === 'checkin_failed'), 'and is not a failure');
  assert(/check in/i.test(res.body.message), 'and the reader is told they are coming');

  // a kit with no usable tag still gets its check-ins, under a fresh one
  fresh();
  res = await send({ checkin: true, kid: 'untagged' });
  const tags = [...new Set(scheduledCalls().flatMap(c => linksIn(JSON.parse(c.opts.body).text).map(l => l.k)))];
  assert(tags.length === 1 && /^[a-z0-9]{12}$/.test(tags[0]) && tags[0] !== 'untagged', 'a kit with no tag of its own: both emails carry one fresh tag (' + tags.join(',') + ')');

  // RESEND_FROM applies to them as it does to the kit
  process.env.RESEND_FROM = 'Dr Mumbo Jumbo <onboarding@resend.dev>'; fresh();
  res = await send({ checkin: true, kid: KID });
  assert(scheduledCalls().length === 2 && scheduledCalls().every(c => JSON.parse(c.opts.body).from === 'Dr Mumbo Jumbo <onboarding@resend.dev>'), 'RESEND_FROM is honoured for the check-ins too');
  delete process.env.RESEND_FROM;

  // the kit did not go out: nothing is scheduled
  fresh(); resendOk = false; resendStatus = 500; resendBody = '{"statusCode":500,"name":"application_error","message":"An unexpected error occurred."}';
  res = await send({ checkin: true, kid: KID });
  assert.strictEqual(res.code, 502, 'kit failed: still a 502');
  assert.strictEqual(scheduledCalls().length, 0, 'kit failed: no check-in is scheduled for a kit that was not sent');

  // The check-ins could not be set: the kit is still sent, the reader is told the truth, and the count says why.
  fresh();
  checkinPlan = [[422, '{"statusCode":422,"name":"validation_error","message":"The `scheduled_at` field must be within 30 days. Sent to will@example.com."}']];
  res = await send({ checkin: true, kid: KID });
  assert.strictEqual(res.code, 200, 'check-ins refused: the kit is still sent, and the reader still gets a 200');
  assert.strictEqual(res.body.ok, true, 'check-ins refused: ok');
  assert.strictEqual(scheduledCalls().length, 1, 'check-ins refused: when the week-4 email cannot be set, the day-3 one that promises it is not tried');
  assert.strictEqual(res.body.checkins, 0, 'check-ins refused: the page is told none were set');
  assert(/could not be set up/.test(res.body.message) && res.body.message.startsWith('Sent.') && !/3 days/.test(res.body.message), 'check-ins refused: the reader is told the kit went and the check-ins did not ("' + res.body.message + '")');
  assert.deepStrictEqual(lastCount('kit_emailed'), { evt: 'kit_emailed', src: 'unknown', checkins: 0 }, 'check-ins refused: the kit is counted as emailed, with none set');
  const cf = lastCount('checkin_failed');
  assert(cf, 'check-ins refused: the failure is counted');
  assert.deepStrictEqual(Object.keys(cf).sort(), ['detail', 'evt', 'fix', 'name', 'stage', 'status', 'why'], 'a failed check-in is counted as: which one, Resend\'s status and error name, the diagnosis. Nothing else');
  assert.deepStrictEqual([cf.stage, cf.status, cf.name, cf.why], [2, 422, 'validation_error', 'bad_request'], 'check-ins refused: which one, and why');
  assert(/<email>/.test(cf.detail) && !/will@example/.test(JSON.stringify(cf)), 'check-ins refused: an address Resend echoes back is scrubbed from the count');
  assert.strictEqual(calls.filter(c => c.url.includes('supabase')).length, 1, 'check-ins refused: the address is still kept, since the kit did go out');

  // the week-4 one is set and the day-3 one is not: one check-in, and the message says which
  fresh();
  checkinPlan = ['ok', [403, '{"statusCode":403,"name":"validation_error","message":"The dr-mumbo-jumbo.com domain is not verified."}']];
  res = await send({ checkin: true, kid: KID });
  assert.strictEqual(res.body.checkins, 1, 'day-3 refused: one check-in is set');
  assert(/four weeks/.test(res.body.message) && !/3 days/.test(res.body.message), 'day-3 refused: the reader is told about the one that is coming ("' + res.body.message + '")');
  assert.deepStrictEqual([lastCount('checkin_failed').stage, lastCount('checkin_failed').why], [1, 'domain_not_verified'], 'day-3 refused: counted with its diagnosis');
  assert.strictEqual(lastCount('kit_emailed').checkins, 1, 'day-3 refused: the kit is counted with one check-in');

  // too fast for Resend, or Resend having a moment: wait and ask once more
  for (const [what, refusal] of [
    ['rate limited', [429, '{"statusCode":429,"name":"rate_limit_exceeded","message":"Too many requests. Please limit the number of requests per second."}', 1]],
    ['a server error', [500, '{"statusCode":500,"name":"application_error","message":"An unexpected error occurred."}']]
  ]) {
    fresh();
    checkinPlan = [refusal];
    const w0 = Date.now();
    res = await send({ checkin: true, kid: KID });
    assert.strictEqual(res.body.checkins, 2, what + ': both check-ins are set in the end');
    assert.strictEqual(scheduledCalls().length, 3, what + ': the refused one is asked for once more');
    assert.strictEqual(scheduledCalls()[0].opts.headers['Idempotency-Key'], scheduledCalls()[1].opts.headers['Idempotency-Key'], what + ': with the same idempotency key, so it cannot be set twice');
    assert(Date.now() - w0 >= 900 && Date.now() - w0 < 5000, what + ': after a short wait (' + (Date.now() - w0) + ' ms)');
    assert(!counted.some(c => c.evt === 'checkin_failed'), what + ': nothing is counted as failed');
  }
  fresh();
  checkinPlan = [[500, 'upstream connect error'], [500, 'upstream connect error']];
  res = await send({ checkin: true, kid: KID });
  assert.strictEqual(scheduledCalls().length, 2, 'refused twice: asked twice and no more');
  assert.deepStrictEqual([res.code, res.body.checkins, lastCount('checkin_failed').why], [200, 0, 'resend_down'], 'refused twice: the kit is sent, no check-in is set, and the count says Resend was down');

  // a check-in call that never answers is cut off; the reader's kit is not held hostage to it
  fresh();
  checkinPlan = ['hang'];
  const h0 = Date.now();
  res = await send({ checkin: true, kid: KID });
  assert.deepStrictEqual([res.code, res.body.ok, res.body.checkins], [200, true, 0], 'hanging check-in: the kit is sent and the reader is answered');
  assert(Date.now() - h0 < 9000, 'hanging check-in: cut off well inside the function\'s 30 seconds (' + (Date.now() - h0) + ' ms)');
  assert.strictEqual(lastCount('checkin_failed').why, 'network_or_timeout', 'hanging check-in: counted as a timeout');

  // Across everything this file sent: no count line holds an address, or a field nobody named.
  fresh();
  await send({ checkin: true, kid: KID, src: 'reddit' });
  checkinPlan = [[422, '{"statusCode":422,"name":"validation_error","message":"bad"}']];
  await send({ checkin: true, kid: KID, src: 'reddit' });
  const HOLDS = { kit_emailed: ['evt', 'src', 'checkins'], checkin_failed: ['evt', 'stage', 'status', 'name', 'why', 'fix', 'detail'] };
  for (const c of counted) {
    assert(HOLDS[c.evt], 'a count this file did not expect: ' + c.evt);
    assert.deepStrictEqual(Object.keys(c).filter(k => !HOLDS[c.evt].includes(k)), [], c.evt + ' holds only ' + HOLDS[c.evt].join(', '));
    assert(!/[^\s@"<>]+@[^\s@"<>]+\.[a-z]{2,}/i.test(JSON.stringify(c)), c.evt + ': no address in a count');
  }

  console.log = realLog;
  console.log('test-email-kit: ok (including 502 diagnosis and check-ins)');
})().catch(e => { console.error(e); process.exit(1); });
