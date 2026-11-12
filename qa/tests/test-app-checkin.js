// Check-ins asked for from the app, not from "Email me my kit" (api/app-checkin.js).
//
// The app has no kit to email, so its check-ins cannot ride on a kit email. This endpoint is the
// app's way in: it hands back a signed ticket per question, so an answer tapped inside the app is
// counted by /api/checkin exactly as one tapped from an email is; and, only if the reader types an
// address, it schedules the same two emails the site sends, in the app's words.
//
// What can go wrong: an endpoint that emails any address it is given is a way to send mail to
// strangers, so it needs a session token and has its own allowance per visitor. Asking twice must
// not make four emails. The emails must not talk about a kit "in your inbox" that an app reader
// never had. The address must go to the email provider and nowhere else: not the waitlist, not a
// count. And none of it may break the app: with no email provider the in-app check-ins still work.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };

const counted = [];
const realLog = console.log;
console.log = (s) => { if (typeof s === 'string' && s.startsWith('[dmj] ')) counted.push(JSON.parse(s.slice(6))); else realLog(s); };
let calls = [];
let plan = [];   // what Resend answers to each scheduled email, in order: 'ok' or [status, body]. 'ok' once it runs out.
global.fetch = async (url, opts) => {
  if (String(url).includes('/rpc/dmj_count')) return { ok: true, status: 204 };
  calls.push({ url: String(url), opts });
  if (String(url).includes('api.resend.com')) {
    const a = plan.length ? plan.shift() : 'ok';
    if (a === 'ok') return { ok: true, status: 200, text: async () => '{"id":"5f1c0a52-7d0e-4f0b-9d0c-1b8f6f0e2a11"}' };
    return { ok: false, status: a[0], headers: { get: () => null }, text: async () => a[1] };
  }
  if (String(url).includes('supabase')) return { ok: true, status: 201 };
  throw new Error('unexpected fetch ' + url);
};

delete process.env.FIGHTPACK_SECRET; delete process.env.RESEND_API_KEY; delete process.env.RESEND_FROM;
const ci = require('../../lib/checkin.js');
const unlock = require('../../lib/unlock.js');
const handler = require('../../api/app-checkin.js');
const answers = require('../../api/checkin.js');

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 12, 16, 30, 0);
const KID = 'app7k2m9q4xz';
const query = (url) => Object.fromEntries(new URLSearchParams(new URL(url).hash.slice(1)));
const linksIn = (text) => [...text.matchAll(/https:\/\/dr-mumbo-jumbo\.com\/checkin#\S+/g)].map((m) => query(m[0]));
function mockRes() { const r = { code: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }
let ip = 0;
// each request comes from a new visitor unless one is named, so the allowance is tested where it is meant to be
async function post(body, opts) {
  const res = mockRes();
  const from = (opts && opts.ip) || '10.0.' + Math.floor(++ip / 250) + '.' + (ip % 250);
  await handler({ method: (opts && opts.method) || 'POST', body, headers: { 'x-real-ip': from } }, res);
  return res;
}
const scheduled = () => calls.filter((c) => c.url.includes('api.resend.com'));
const lastCount = (evt) => counted.filter((c) => c.evt === evt).pop();
const fresh = () => { calls = []; counted.length = 0; plan = []; };

(async () => {
  // ---------- 1. with no secret there is nothing to sign with ----------
  same(ci.ticket(KID, 1, NOW), null, 'no secret: no ticket is made');
  let res = await post({ token: 'x', kid: KID });
  ok(res.code === 401 || res.code === 503, 'no secret: the endpoint takes nothing (' + res.code + ')');
  same(counted.length, 0, 'no secret: nothing is counted');

  process.env.FIGHTPACK_SECRET = 'test-secret-123';
  const token = unlock.sign({ sid: 'cs_test_app' });

  // ---------- 2. a ticket: what the app holds to answer a question without an email ----------
  const t1 = ci.ticket(KID, 1, NOW);
  same(Object.keys(t1).sort(), ['d', 'k', 's', 't'], 'a ticket is the kit tag, the question, the day and a signature: what a link carries, less the answer');
  same([t1.k, t1.s, t1.d], [KID, '1', String(Math.floor(NOW / DAY))], 'for the tag and question asked, dated today');
  same(ci.check(t1, NOW), { ok: true, kid: KID, stage: 1 }, 'the answer endpoint takes it as it takes a link');
  same(query(ci.link(KID, 1, 'sent', NOW)).t, t1.t, 'it is signed exactly as a link is: one signature, not a second way in');
  same(ci.check(Object.assign({}, t1, { k: 'app000000000' }), NOW).ok, false, 'moved to another tag, it is not taken');
  same(ci.check(Object.assign({}, t1, { s: '2' }), NOW).ok, false, 'moved to the other question, it is not taken');
  same(ci.ticket(KID, 3, NOW), null, 'there is no ticket for a question that does not exist');
  same(ci.ticket('no good!', 1, NOW), null, 'nor for a tag that is not one');

  // ---------- 3. the app's two emails: the site's questions, the app's words ----------
  const site = ci.emails(KID, NOW);
  const app = ci.emails(KID, NOW, 'app');
  same(app.map((m) => [m.stage, m.scheduled_at, m.subject]), site.map((m) => [m.stage, m.scheduled_at, m.subject]), 'the same two questions, on the same days, under the same subjects');
  for (const m of app) {
    for (const body of [m.text, m.html]) {
      ok(body.includes(ci.STAGES[m.stage].ask), 'app email ' + m.stage + ' asks the question in the same words');
      ok(/in the Dr Mumbo Jumbo app/.test(body), 'app email ' + m.stage + ' says where the reader asked for it');
      ok(!/emailed yourself|your inbox|section \d|built a Fight Pack/i.test(body), 'app email ' + m.stage + ' does not speak of a kit email or numbered sections the app reader never had');
    }
    const links = linksIn(m.text);
    same(links.map((l) => l.a), ci.STAGES[m.stage].answers.map((a) => a[0]), 'app email ' + m.stage + ' has one link per answer');
    ok(links.every((l) => l.v === 'app'), 'app email ' + m.stage + ': each link says it came from the app, so the answer page can use the app\'s words');
    ok(links.every((l) => ci.check(l, NOW).ok), 'app email ' + m.stage + ': each link is taken by the answer endpoint');
    ok(!/@/.test(m.text.replace(/https:\S+/g, '')), 'app email ' + m.stage + ' holds no address');
  }
  ok(site.every((m) => linksIn(m.text).every((l) => !('v' in l))), 'the site\'s own emails are untouched: their links carry no such mark');
  ok(site.every((m) => /emailed yourself your kit/.test(m.text)), 'and they still say the reader asked when emailing a kit');

  // ---------- 4. the endpoint: who may ask ----------
  fresh();
  res = await post({ token, kid: KID }, { method: 'GET' });
  same(res.code, 405, 'GET is refused');
  res = await post('{not json');
  same(res.code, 400, 'a body that cannot be read is refused');
  res = await post({ token: 'garbage', kid: KID });
  same(res.code, 401, 'no session token: refused');
  res = await post({ token, kid: KID, email: 'nope' });
  same([res.code, res.body.error], [400, 'email'], 'an address that is not one is refused, not skipped');
  same(calls.length, 0, 'none of those reached the email provider');
  same(counted.length, 0, 'and none was counted');

  // ---------- 5. no address: in-app check-ins only ----------
  fresh();
  res = await post({ token, kid: KID });
  same(res.code, 200, 'no address: check-ins are on');
  same([res.body.ok, res.body.kid, res.body.checkins], [true, KID, 0], 'the app is told its tag and that no emails were set');
  same(Object.keys(res.body.tickets), ['1', '2'], 'and is handed a ticket for each question');
  same([ci.check(res.body.tickets[1]), ci.check(res.body.tickets[2])], [{ ok: true, kid: KID, stage: 1 }, { ok: true, kid: KID, stage: 2 }], 'each ticket is good for its own question');
  same(calls.length, 0, 'no address: nothing goes to the email provider, or anywhere');
  same(lastCount('app_checkin'), { evt: 'app_checkin', kid: KID, emails: 0 }, 'counted as the app turning check-ins on: the tag and how many emails, nothing else');
  // the ticket in use: an answer tapped in the app lands in the same count as one tapped from an email
  const ans = mockRes();
  await answers({ method: 'POST', body: Object.assign({ a: 'sent' }, res.body.tickets[1]), headers: {} }, ans);
  same(ans.code, 200, 'an answer sent with a ticket is taken');
  same(lastCount('checkin'), { evt: 'checkin', kid: KID, stage: 1, answer: 'sent' }, 'and counted as any check-in answer is');

  res = await post({ token });
  ok(res.code === 200 && /^[a-f0-9]{12}$/.test(res.body.kid), 'an app that sends no tag is given a fresh random one (' + res.body.kid + ')');
  res = await post({ token, kid: 'App-7k2m 9q4xz!!' });
  same(res.body.kid, 'App7k2m9q4xz', 'a tag is cut down exactly as the build counter cuts it');

  // an address is typed, but email is not switched on: the app still gets its tickets
  fresh();
  res = await post({ token, kid: KID, email: 'reader@example.com' });
  same([res.code, res.body.checkins, Object.keys(res.body.tickets)], [200, 0, ['1', '2']], 'email not switched on: the in-app check-ins still work, and the app is told no emails were set');
  ok(/none will come/i.test(res.body.message), 'and the reader is told so in words ("' + res.body.message + '")');
  same(calls.length, 0, 'email not switched on: nothing is sent');

  // ---------- 6. an address: the two emails, scheduled as the site schedules them ----------
  process.env.RESEND_API_KEY = 're_test_key';
  fresh();
  res = await post({ token, kid: KID, email: '  Reader@Example.COM ' });
  same([res.code, res.body.checkins], [200, 2], 'an address: both emails are set');
  ok(/3 days/.test(res.body.message), 'and the reader is told when the first comes ("' + res.body.message + '")');
  const sent = scheduled().map((c) => ({ headers: c.opts.headers, body: JSON.parse(c.opts.body) }));
  same(sent.length, 2, 'two emails go to the provider');
  same(sent.map((s) => s.body.subject), [app[1].subject, app[0].subject], 'the week-4 email is set before the day-3 email that promises it');
  for (const s of sent) {
    same(Object.keys(s.body).sort(), ['from', 'html', 'scheduled_at', 'subject', 'text', 'to'], 'the provider is given the message, the address and the time: nothing else');
    same(s.body.to, ['reader@example.com'], 'to the address typed, trimmed and lowercased');
    ok(/in the Dr Mumbo Jumbo app/.test(s.body.text), 'in the app\'s words');
    ok(linksIn(s.body.text).every((l) => l.k === KID && l.v === 'app'), 'with links for this tag, marked as the app\'s');
  }
  ok(Math.abs(Date.parse(sent[1].body.scheduled_at) - (Date.now() + 3 * DAY)) < 60000 && Math.abs(Date.parse(sent[0].body.scheduled_at) - (Date.now() + 28 * DAY)) < 60000, 'for 3 days and 28 days from now');
  const keys = sent.map((s) => s.headers['Idempotency-Key']);
  ok(keys.every((k) => typeof k === 'string' && k.startsWith('dmj-checkin/' + KID + '/')), 'each carries an idempotency key for this tag and question');
  ok(!calls.some((c) => c.url.includes('supabase')), 'the address is not kept: it goes to the email provider and nowhere else');
  same(lastCount('app_checkin'), { evt: 'app_checkin', kid: KID, emails: 2 }, 'counted with how many emails were set');
  ok(!JSON.stringify(counted).includes('example.com') && !JSON.stringify(res.body).includes('example.com'), 'no count and no answer to the app holds the address');

  // asked twice (a double tap, a retry on a bad connection): the same keys, so the provider sets them once
  fresh();
  res = await post({ token, kid: KID, email: 'reader@example.com' });
  same(scheduled().map((c) => c.opts.headers['Idempotency-Key']), keys, 'the same tag and address asked again carry the same idempotency keys');
  fresh();
  plan = [[409, '{"statusCode":409,"name":"invalid_idempotent_request","message":"Same idempotency key used with a different request payload."}'], [409, '{"statusCode":409,"name":"invalid_idempotent_request","message":"Same idempotency key used with a different request payload."}']];
  res = await post({ token, kid: KID, email: 'reader@example.com' });
  same(res.body.checkins, 2, 'emails the provider already holds count as set');

  // the week-4 email cannot be set: the day-3 email, which promises it, is not sent
  fresh();
  plan = [[403, '{"statusCode":403,"name":"validation_error","message":"The dr-mumbo-jumbo.com domain is not verified."}']];
  res = await post({ token, kid: KID, email: 'reader@example.com' });
  same([res.code, res.body.checkins, scheduled().length], [200, 0, 1], 'week 4 refused: day 3 is not tried, and the app still gets its answer');
  same(Object.keys(res.body.tickets), ['1', '2'], 'and its tickets');
  same([lastCount('checkin_failed').stage, lastCount('checkin_failed').why], [2, 'domain_not_verified'], 'the refusal is counted with its reason, as the site\'s is');
  ok(/none will come/i.test(res.body.message), 'and the reader is promised nothing ("' + res.body.message + '")');

  // ---------- 7. the allowance: one visitor cannot use this to send mail all day ----------
  fresh();
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await post({ token, kid: KID, email: 'reader' + i + '@example.com' }, { ip: '203.0.113.9' })).code);
  same(codes, [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 429, 429], 'one visitor gets ten requests a day, then is told to wait');
  same(scheduled().length, 20, 'and nothing is scheduled past the allowance');
  res = await post({ token, kid: KID }, { ip: '203.0.113.10' });
  same(res.code, 200, 'another visitor is not held up by it');

  // ---------- 8. the answer page: an app reader is not told about a kit in their inbox ----------
  const page = fs.readFileSync(path.join(__dirname, '../../checkin.html'), 'utf8');
  const block = (name) => { const m = new RegExp('var ' + name + ' = \\{([\\s\\S]*?)\\n  \\};').exec(page); return m ? m[1] : ''; };
  const keysOf = (src) => [...src.matchAll(/^\s+(\w+): \[/gm)].map((m) => m[1]);
  same(keysOf(block('AFTER_APP')), keysOf(block('AFTER')), 'the page has app wording for every answer it has site wording for');
  ok(keysOf(block('AFTER_APP')).length === 6, 'all six answers');
  ok(!/inbox|section \d|email we sent you|built the kit/i.test(block('AFTER_APP')), 'the app wording does not speak of a kit email or numbered sections');
  ok(/param\('v'\) === 'app'/.test(page), 'and the page uses it only for a link marked as the app\'s');

  // ---------- 9. it is deployed with room to finish ----------
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '../../vercel.json'), 'utf8'));
  ok(vercel.functions['api/app-checkin.js'] && vercel.functions['api/app-checkin.js'].maxDuration >= 30, 'the function is given as long as the kit email\'s, since it schedules the same two emails');

  console.log = realLog;
  if (fails.length) { console.log('app check-in tests FAILED (' + fails.length + ' of ' + n + '):'); fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
  console.log('app check-in tests passed (' + n + ' checks)');
})().catch((e) => { console.log = realLog; console.error(e); process.exit(1); });
