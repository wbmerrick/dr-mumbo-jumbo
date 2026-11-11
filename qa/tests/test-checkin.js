// The check-ins: two short emails a reader can ask for when they email themselves a kit, and
// the one-tap answers that come back from them.
//
// Why this exists: the site could count kits built and kits emailed, and then went dark. Whether
// an appeal was ever sent, and whether it won, is the only result that matters, and nothing
// measured it. Day 3 asks "has it been sent?"; week 4 asks "what happened?".
//
// What can go wrong is mostly on the privacy page's side of the line. The answer has to be
// counted against the kit (a random tag) and never against a person: the address is not in a
// link, not in a count, and this code is never handed it. A link must not be forgeable, or the
// one number worth having is whatever a stranger with curl says it is: every link is signed for
// one kit and one question, and stops working after six months. An email scanner that opens
// every link in a message must not be able to answer for the reader, so nothing is counted on
// a GET. And none of it may be able to break: with no secret configured there are no links and
// no emails, and a counter that is down still lets the reader's tap succeed.
const assert = require('assert');
const crypto = require('crypto');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };

// what the counter wrote, and whether the durable write was attempted
const counted = [];
const realLog = console.log;
console.log = (s) => { if (typeof s === 'string' && s.startsWith('[dmj] ')) counted.push(JSON.parse(s.slice(6))); else realLog(s); };
let rpcMode = 'ok';
const rpc = [];
global.fetch = async (url, opts) => {
  if (String(url).includes('/rpc/dmj_count')) {
    rpc.push(JSON.parse(opts.body));
    if (rpcMode === 'throw') throw new Error('network down');
    return { ok: true, status: 204 };
  }
  throw new Error('unexpected fetch ' + url);
};

delete process.env.FIGHTPACK_SECRET;
const ci = require('../../lib/checkin.js');
const unlock = require('../../lib/unlock.js');
const handler = require('../../api/checkin.js');

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 11, 16, 30, 0);          // 2026-11-11 16:30 UTC
const KID = 'usp722atowp1';
// What a link carries. It rides after the #, which a browser keeps to itself: see section 3.
const query = (url) => Object.fromEntries(new URLSearchParams(new URL(url).hash.slice(1)));
function mockRes() { const r = { code: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }
async function post(body, method) { const res = mockRes(); await handler({ method: method || 'POST', body, headers: {} }, res); return res; }

(async () => {
  // ---------- 1. the two questions, and what Resend will take ----------
  same(Object.keys(ci.STAGES), ['1', '2'], 'there are two check-ins');
  same(ci.STAGES[1].answers.map((a) => a[0]), ['sent', 'notyet'], 'day 3 asks whether it was sent: yes or not yet');
  same(ci.STAGES[2].answers.map((a) => a[0]), ['won', 'lost', 'waiting', 'nosend'], 'week 4 asks what happened: approved, denied again, still waiting, never sent');
  same(ci.STAGES[1].days, 3, 'the first goes out 3 days after the kit');
  ok(ci.STAGES[2].days > ci.STAGES[1].days && ci.STAGES[2].days <= 29, 'the second goes out about four weeks on, inside the 30 days Resend will hold an email (' + ci.STAGES[2].days + ')');

  // ---------- 2. with no secret there is nothing: no link, no email, no answer taken ----------
  same(ci.link(KID, 1, 'sent', NOW), null, 'no secret: no link is made');
  same(ci.emails(KID, NOW), null, 'no secret: no emails are written');
  same(ci.check({ k: KID, s: '1', d: '20403', t: 'x'.repeat(22) }, NOW), { ok: false, error: 'unconfigured' }, 'no secret: no link is taken');
  let res = await post({ k: KID, s: '1', d: '20403', t: 'x'.repeat(22), a: 'sent' });
  same(res.code, 503, 'no secret: the endpoint says it is not switched on');
  same(counted.length, 0, 'no secret: nothing is counted');

  process.env.FIGHTPACK_SECRET = 'test-secret-123';

  // ---------- 3. a link: where it goes, what it carries ----------
  const url = ci.link(KID, 1, 'sent', NOW);
  ok(typeof url === 'string' && url.startsWith('https://dr-mumbo-jumbo.com/checkin#'), 'a link opens the site\'s own check-in page (' + url + ')');
  // Everything the link carries comes after the #. A browser does not send that part to the server
  // when it opens a page, so opening a check-in link tells our host (and its request log) only that
  // /checkin was opened: not which kit, not which answer. They are sent when the reader taps one.
  same([new URL(url).pathname, new URL(url).search], ['/checkin', ''], 'the address the browser asks the server for is /checkin and nothing more');
  const q = query(url);
  same(Object.keys(q).sort(), ['a', 'd', 'k', 's', 't'], 'a link carries the kit tag, the question, the day it was made, a signature and the answer: nothing else');
  same([q.k, q.s, q.a], [KID, '1', 'sent'], 'the tag, the question and the answer are the ones asked for');
  same(q.d, String(Math.floor(NOW / DAY)), 'the day is the day the kit was emailed');
  ok(/^[A-Za-z0-9_-]{22}$/.test(q.t), 'the signature is 22 url-safe characters (' + q.t + ')');
  ok(!/@|%40/.test(url), 'no address is in a link');
  same(ci.check(q, NOW), { ok: true, kid: KID, stage: 1 }, 'the link it made is the link it takes');
  same(query(ci.link(KID, 1, 'notyet', NOW)).t, q.t, 'both answers to one question carry the same signature: the reader chooses the answer');
  same(ci.link(KID, 1, 'won', NOW), null, 'no link is made for an answer that is not one of that question\'s');
  same(ci.link(KID, 3, 'sent', NOW), null, 'nor for a question that does not exist');
  same(ci.link('../x', 1, 'sent', NOW), null, 'nor for a tag that is not a tag');

  // ---------- 4. a link cannot be made up, moved to another kit, or moved to the other question ----------
  for (const [what, change] of [
    ['another kit\'s tag', { k: 'c78pt31832ma' }],
    ['the other question', { s: '2' }],
    ['another day', { d: String(Number(q.d) - 1) }],
    ['a signature one character off', { t: (q.t[0] === 'A' ? 'B' : 'A') + q.t.slice(1) }],
    ['a signature cut short', { t: q.t.slice(0, 10) }],
    ['no signature', { t: '' }],
    ['a question that does not exist', { s: '3' }],
    ['a tag with a path in it', { k: '../../etc' }],
    ['a day that is not a number', { d: '2e4' }],
    ['a tag that is not text', { k: { toString: () => KID } }],
    ['a signature that is not text', { t: [q.t] }]
  ]) same(ci.check(Object.assign({}, q, change), NOW), { ok: false, error: 'link' }, 'not taken: ' + what);
  same(ci.check(null, NOW), { ok: false, error: 'link' }, 'not taken: nothing at all');
  process.env.FIGHTPACK_SECRET = 'another-secret';
  same(ci.check(q, NOW), { ok: false, error: 'link' }, 'not taken: a link signed with another secret (rotating FIGHTPACK_SECRET closes every link)');
  process.env.FIGHTPACK_SECRET = 'test-secret-123';
  // the session token and the check-in signature are not each other
  const session = unlock.sign({ sid: 'free', n: 'abc' });
  same(ci.check(Object.assign({}, q, { t: session }), NOW), { ok: false, error: 'link' }, 'not taken: a session token in place of the signature');
  same(unlock.verify(q.t), null, 'and a check-in signature is not a session token');
  same(unlock.verify(q.k + '.' + q.t), null, 'however it is dressed');

  // ---------- 5. a link answers for six months, then stops ----------
  same(ci.LINK_DAYS, 180, 'a link is good for 180 days');
  same(ci.check(q, NOW + 28 * DAY), { ok: true, kid: KID, stage: 1 }, 'still good when the second email goes out');
  same(ci.check(q, NOW + 180 * DAY), { ok: true, kid: KID, stage: 1 }, 'still good on day 180');
  same(ci.check(q, NOW + 181 * DAY), { ok: false, error: 'expired' }, 'closed on day 181');
  same(ci.check(q, NOW - 3 * DAY), { ok: false, error: 'link' }, 'a link dated in the future is not taken');

  // ---------- 6. the tag a kit's check-ins go under ----------
  same(ci.tagFor(KID), KID, 'the kit\'s own tag is kept, so an answer lands beside that kit\'s build counts');
  same(ci.tagFor('usp722-atowp1!'), KID, 'cut down to letters and digits, as the build counter does');
  same(ci.tagFor('z'.repeat(50)), 'z'.repeat(24), 'and to 24 characters');
  for (const [bad, what] of [[undefined, 'none sent'], ['', 'an empty one'], ['abc', 'one too short to be a tag'], ['untagged', 'the build counter\'s own word for "none"'], [{ toString: () => KID }, 'one that is not text']]) {
    const made = ci.tagFor(bad);
    ok(/^[a-z0-9]{12}$/.test(made) && made !== 'untagged', 'a kit with ' + what + ' gets a fresh random tag (' + made + ')');
    ok(ci.tagFor(bad) !== made, 'a different one each time (' + what + ')');
  }

  // ---------- 7. the two emails ----------
  const mails = ci.emails(KID, NOW);
  same(mails.length, 2, 'two emails are written');
  same(mails.map((m) => m.stage), [1, 2], 'the first question, then the second');
  same(mails[0].scheduled_at, new Date(NOW + 3 * DAY).toISOString(), 'the first is set for 3 days after the kit, as an ISO time');
  same(mails[1].scheduled_at, new Date(NOW + ci.STAGES[2].days * DAY).toISOString(), 'the second for about four weeks after');
  ok(mails.every((m) => Date.parse(m.scheduled_at) - NOW <= 30 * DAY - 3600000), 'both are inside Resend\'s 30 days, with an hour to spare');
  same(mails.map((m) => Object.keys(m).sort().join(',')), ['html,scheduled_at,stage,subject,text', 'html,scheduled_at,stage,subject,text'], 'each is a time, a subject and a body in text and HTML');
  for (const m of mails) {
    const stage = ci.STAGES[m.stage];
    const links = [...m.text.matchAll(/https:\/\/dr-mumbo-jumbo\.com\/checkin#\S+/g)].map((x) => x[0]);
    same(links.map((l) => query(l).a), stage.answers.map((a) => a[0]), 'email ' + m.stage + ': one link for each answer to its question, in order, and no other check-in link');
    ok(links.every((l) => { const c = ci.check(query(l), NOW + stage.days * DAY); return c.ok && c.kid === KID && c.stage === m.stage; }), 'email ' + m.stage + ': every link is taken on the day the email arrives');
    for (const [key, label] of stage.answers) ok(m.text.includes(label) && m.html.includes(label.replace(/'/g, '&#39;')), 'email ' + m.stage + ': says "' + label + '" in the text and in the HTML');
    ok(m.text.includes(stage.ask) && m.html.includes(stage.ask), 'email ' + m.stage + ': asks its question');
    const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, '&'));
    same(hrefs.filter((h) => h.includes('/checkin#')), links, 'email ' + m.stage + ': the HTML links are the same links');
    ok(hrefs.every((h) => h.startsWith('https://dr-mumbo-jumbo.com/')), 'email ' + m.stage + ': every link goes to the site and nowhere else');
    ok(!/<script|<img|<iframe|\/_vercel\//i.test(m.html), 'email ' + m.stage + ': the HTML has no script, picture or tracker in it');
    ok(!/[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/i.test(m.text + m.html), 'email ' + m.stage + ': no address is written into the body');
    ok(/You asked for this check-in/.test(m.text), 'email ' + m.stage + ': says why it was sent');
    ok(m.subject.length > 5 && m.subject.length < 60 && !/!/.test(m.subject), 'email ' + m.stage + ': a plain subject line ("' + m.subject + '")');
  }
  // What each email promises about the next one has to be what happens.
  ok(/once more/.test(mails[0].text) && /four weeks/.test(mails[0].text) && /last/.test(mails[0].text), 'the first says one more is coming, in about four weeks, and that it is the last');
  ok(/reply/i.test(mails[0].text), 'and how to stop it: by replying');
  ok(/last/.test(mails[1].text) && !/once more|four weeks from now/.test(mails[1].text), 'the second says it is the last and promises no other');
  ok(mails[0].text !== mails[1].text && mails[0].subject !== mails[1].subject, 'they are two different emails');

  // ---------- 8. an answer: only by POST, only from a link, only an answer to that question ----------
  counted.length = 0; rpc.length = 0;
  res = await post(q, 'GET');
  same(res.code, 405, 'a GET counts nothing: an email scanner that opens every link cannot answer for the reader');
  same(res.headers.Allow, 'POST', 'and is told what would');
  res = await post(q);
  same([res.code, res.body && res.body.ok], [200, true], 'the answer on the link is taken');
  same(res.headers['Cache-Control'], 'no-store', 'and is not cached');
  same(counted, [{ evt: 'checkin', kid: KID, stage: 1, answer: 'sent' }], 'it is counted as: which kit, which question, which answer. Nothing else');
  same(rpc, [{ p_evt: 'checkin', p_data: { kid: KID, stage: 1, answer: 'sent' } }], 'and written to the durable count the same way');
  res = await post(JSON.stringify(Object.assign({}, q, { a: 'notyet' })));
  same(res.code, 200, 'a body that arrives as text is read too');
  same(counted[counted.length - 1].answer, 'notyet', 'a reader can change their answer; the latest one is the one read');

  counted.length = 0;
  for (const [what, body, code, error] of [
    ['an answer to the other question', Object.assign({}, q, { a: 'won' }), 400, 'answer'],
    ['an answer that is not one', Object.assign({}, q, { a: 'sent; drop table' }), 400, 'answer'],
    ['no answer', Object.assign({}, q, { a: undefined }), 400, 'answer'],
    ['a link that was made up', Object.assign({}, q, { t: 'A'.repeat(22) }), 403, 'link'],
    ['a link moved to another kit', Object.assign({}, q, { k: 'c78pt31832ma' }), 403, 'link'],
    ['nothing', {}, 403, 'link'],
    ['a body that cannot be read', '{not json', 400, 'bad_request']
  ]) {
    res = await post(body);
    same([res.code, res.body && res.body.error], [code, error], 'not counted: ' + what);
    ok(res.body && typeof res.body.message === 'string' && res.body.message.length > 8, 'and the reader is told something they can act on (' + what + ')');
  }
  same(counted.length, 0, 'none of those reached the count');
  const old = query(ci.link(KID, 2, 'won', NOW - 181 * DAY));
  res = await post(old);
  same([res.code, res.body && res.body.error], [410, 'expired'], 'a link older than six months is closed');
  same(counted.length, 0, 'and not counted');

  // ---------- 9. it cannot be used to fill the count, and it cannot be broken by it ----------
  const k2 = query(ci.link('kit2aaaaaaaa', 2, 'won', NOW));
  let taken = 0, refused = 0;
  for (let i = 0; i < 14; i++) { res = await post(k2); if (res.code === 200) taken++; else if (res.code === 429) refused++; }
  same([taken, refused], [10, 4], 'one kit\'s question takes ten answers a day, then stops');
  res = await post(query(ci.link('kit3aaaaaaaa', 2, 'lost', NOW)));
  same(res.code, 200, 'another kit\'s answer is still taken');
  rpcMode = 'throw';
  res = await post(query(ci.link('kit4aaaaaaaa', 1, 'sent', NOW)));
  same(res.code, 200, 'the reader\'s tap succeeds when the counter is down');
  rpcMode = 'ok';

  // ---------- 10. nothing here ever holds an address ----------
  ok(!/[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/i.test(JSON.stringify(counted) + JSON.stringify(rpc)), 'no count holds an address');
  // The emails are written from the kit's tag and the time. Hand it more and it is not used.
  same(JSON.stringify(ci.emails(KID, NOW, 'reader@example.com', 'LETTER OF MEDICAL NECESSITY for Priya')), JSON.stringify(mails), 'an address or a kit passed to the email writer changes nothing in what it writes');

  console.log = realLog;
  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 14).join('\n  - ') + (fails.length > 14 ? '\n  … and ' + (fails.length - 14) + ' more' : ''));
  console.log('check-in tests passed (' + n + ' checks)');
})().catch((e) => { console.log = realLog; console.error(e && e.stack ? e.stack : e); process.exit(1); });
