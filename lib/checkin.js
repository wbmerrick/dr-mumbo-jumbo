// Dr Mumbo Jumbo — check-ins.
//
// A reader who emails themselves a kit can ask for two short emails afterwards: one 3 days on
// ("has it been sent?") and one about four weeks on ("what happened?"). Each has a link per
// answer. This file makes those links and writes those emails; api/email-kit.js schedules them
// with the email provider, and api/checkin.js takes the answers.
//
// Nothing here is ever handed the reader's address or their kit. A link says which kit (the
// random tag the build counter already uses), which question, and the day it was made, and it is
// signed, so an answer cannot be made up or moved to another kit. The signing key comes from
// FIGHTPACK_SECRET, like the session tokens in unlock.js but under its own name, so neither can
// stand in for the other. Rotating FIGHTPACK_SECRET closes every link that is out.
//
// Resend holds a scheduled email for 30 days at most, which is why the second check-in is at four
// weeks and there is no third.
const crypto = require('crypto');
const { signingKey } = require('./unlock.js');

const SITE = 'https://dr-mumbo-jumbo.com';
const DAY = 86400000;
const LINK_DAYS = 180;   // a link takes an answer for six months, then stops

// The two questions. Each answer is [the word that is counted, the words the reader sees].
// checkin.html shows the same questions and answers (qa/tests/test-checkin-page.js keeps them the same).
const STAGES = {
  1: { days: 3, ask: 'Has your appeal been sent?', answers: [['sent', "Yes, it's sent"], ['notyet', 'Not yet']] },
  2: { days: 28, ask: 'What happened with your appeal?', answers: [['won', 'They approved it'], ['lost', 'They denied it again'], ['waiting', 'Still waiting'], ['nosend', 'I never sent it']] }
};

function subkey() {
  const key = signingKey();
  return key ? crypto.createHmac('sha256', key).update('dmj-checkin-v1').digest() : null;
}
function sign(key, kid, stage, day) {
  return crypto.createHmac('sha256', key).update(kid + '|' + stage + '|' + day).digest().subarray(0, 16)
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const isTag = (s) => typeof s === 'string' && /^[A-Za-z0-9]{1,24}$/.test(s);

// The tag a kit's check-ins are counted under: the kit's own, cut down as the build counter cuts
// it, so an answer lands beside that kit's other counts. A kit that has none (one saved by the
// page before it kept the tag) gets a fresh random one.
function tagFor(kid) {
  const k = (typeof kid === 'string' ? kid : '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  return k.length >= 6 && k !== 'untagged' ? k : crypto.randomBytes(6).toString('hex');
}

// The link for one answer to one question about one kit, or null if there is none to make.
// What it carries rides after the #. A browser keeps that part to itself when it opens a page, so
// opening a check-in link tells our host only that /checkin was opened; which kit and which answer
// are sent when the reader taps one, in the body of a POST, which the host's request log does not keep.
function link(kid, stage, answer, now = Date.now()) {
  const key = subkey();
  const st = STAGES[stage];
  if (!key || !st || !isTag(kid) || !st.answers.some((a) => a[0] === answer)) return null;
  const day = Math.floor(now / DAY);
  return SITE + '/checkin#k=' + kid + '&s=' + stage + '&d=' + day + '&t=' + sign(key, kid, String(stage), String(day)) + '&a=' + answer;
}

// Is this what a link of ours carried? q is { k, s, d, t } as it arrived, from anyone.
function check(q, now = Date.now()) {
  const key = subkey();
  if (!key) return { ok: false, error: 'unconfigured' };
  const str = (v) => (typeof v === 'string' ? v : '');
  const kid = str(q && q.k), stage = str(q && q.s), day = str(q && q.d), given = Buffer.from(str(q && q.t));
  if (!isTag(kid) || !Object.prototype.hasOwnProperty.call(STAGES, stage) || !/^\d{1,6}$/.test(day)) return { ok: false, error: 'link' };
  const want = Buffer.from(sign(key, kid, stage, day));
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return { ok: false, error: 'link' };
  const age = Math.floor(now / DAY) - Number(day);
  if (age < -1) return { ok: false, error: 'link' };          // dated in the future (a day's grace for clocks)
  if (age > LINK_DAYS) return { ok: false, error: 'expired' };
  return { ok: true, kid, stage: Number(stage) };
}

// ---------- the two emails ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const FOOT = ['Dr Mumbo Jumbo · ' + SITE, 'You asked for this check-in when you emailed yourself your kit.'];
const NO_SIGN_IN = 'No sign-in and nothing to type. Your answer is counted without your name or your address.';
// What each email says, around its question. Kept short: no part of the kit is in them.
const WORDS = {
  1: {
    subject: 'Did your appeal go out?',
    before: ['Three days ago you built a Fight Pack and asked us to check in.'],
    after: [
      NO_SIGN_IN,
      'If something is holding it up, it is usually a letter someone else has to sign or send. Section 4 of your kit is the note to hand them with it.',
      'We will write once more, in about four weeks, to ask how it turned out. That is the last email. If you would rather not get it, reply to this one and say so.'
    ]
  },
  2: {
    subject: 'What did the insurer say?',
    before: ['About four weeks ago you built a Fight Pack. This is the last check-in.'],
    after: [
      NO_SIGN_IN,
      'If they said no again, it is not over. Section 9 of your kit is written for that, and the time you have is printed on the new letter.',
      'This is the last email about this kit. If the answer comes later, you can reply and tell us how it went.'
    ]
  }
};
const P = '<p style="margin:0 0 16px">';
const BUTTON = 'display:inline-block;padding:10px 16px;border:1px solid #1c1f27;border-radius:6px;color:#1c1f27;text-decoration:none;font-weight:bold';

// The two emails for a kit, each with the time it should go out. Written from the kit's tag and
// the time alone. null if there is no secret to sign the links with.
function emails(kid, now = Date.now()) {
  if (!subkey() || !isTag(kid)) return null;
  return Object.keys(STAGES).map(Number).map((stage) => {
    const st = STAGES[stage], w = WORDS[stage];
    const answers = st.answers.map((a) => [a[1], link(kid, stage, a[0], now)]);
    const text = w.before.concat([st.ask], answers.map((a) => a[0] + ':\n' + a[1]), w.after).join('\n\n') + '\n\n—\n' + FOOT.join('\n');
    const html = '<!doctype html><html><body style="margin:0;padding:24px;background:#fff;color:#1c1f27;font:16px/1.6 Georgia,\'Times New Roman\',serif">'
      + w.before.map((p) => P + esc(p) + '</p>').join('')
      + '<p style="margin:0 0 14px;font-size:19px"><strong>' + esc(st.ask) + '</strong></p>'
      + answers.map((a) => '<p style="margin:0 0 10px"><a href="' + esc(a[1]) + '" style="' + BUTTON + '">' + esc(a[0]) + '</a></p>').join('')
      + '<div style="height:10px"></div>'
      + w.after.map((p) => P + esc(p) + '</p>').join('')
      + '<p style="margin:24px 0 0;font-size:13px;color:#5b6170">Dr Mumbo Jumbo · <a href="' + SITE + '/" style="color:#5b6170">dr-mumbo-jumbo.com</a><br>' + esc(FOOT[1]) + '</p>'
      + '</body></html>';
    return { stage, scheduled_at: new Date(now + st.days * DAY).toISOString(), subject: w.subject, text, html };
  });
}

module.exports = { STAGES, LINK_DAYS, SITE, tagFor, link, check, emails };
