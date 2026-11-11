// /api/checkin — takes one answer from a check-in email: "has it been sent?" (day 3) or
// "what happened?" (week 4).
//
// The reader follows a link from the email to /checkin, and the page posts here when they tap
// an answer. Only a POST counts: mail scanners open every link in a message, and a count taken on
// a GET would be answered by them before the reader ever saw it. The link is signed for one kit
// and one question (lib/checkin.js), so an answer cannot be invented or moved to another kit.
//
// What is kept is one count line: which kit (its random tag), which question, which answer.
// No address, no IP, nothing from the kit. privacy.html says exactly this.
const { check, STAGES } = require('../lib/checkin.js');
const { allow } = require('../lib/unlock.js');
const count = require('./_lib/count.js');

const PER_DAY = 10;   // answers taken for one kit's question in a day: room to change your mind, none to fill the count

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method', message: 'POST only.' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.status(400).json({ error: 'bad_request', message: "Couldn't read that. Open the link from your email again." });
    return;
  }

  const link = check(body);
  if (!link.ok) {
    if (link.error === 'unconfigured') res.status(503).json({ error: 'unconfigured', message: "Check-ins aren't switched on." });
    else if (link.error === 'expired') res.status(410).json({ error: 'expired', message: 'This check-in has closed. Thank you all the same.' });
    else res.status(403).json({ error: 'link', message: "This link doesn't look right. Open it again from your email." });
    return;
  }

  const answer = typeof body.a === 'string' ? body.a : '';
  if (!STAGES[link.stage].answers.some((a) => a[0] === answer)) {
    res.status(400).json({ error: 'answer', message: 'Choose one of the answers on the page.' });
    return;
  }

  if (!allow('ck:' + link.kid + ':' + link.stage, PER_DAY, 24 * 3600 * 1000)) {
    res.status(429).json({ error: 'busy', message: 'Your answer is already counted. Thank you.' });
    return;
  }

  await count('checkin', { kid: link.kid, stage: link.stage, answer });
  res.status(200).json({ ok: true });
};
