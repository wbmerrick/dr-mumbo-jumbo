// /api/app-checkin — turns check-ins on for a reader of the app.
//
// On the site, check-ins ride on "Email me my kit" (api/email-kit.js). The app has no kit to
// email, so it asks here instead. Two things come of one request:
//
//   1. A ticket for each of the two questions (lib/checkin.js). The app asks the questions on its
//      own screen, 3 days and about four weeks on, and sends a tapped answer to /api/checkin with
//      the ticket, where it is counted exactly as an answer tapped from an email is.
//   2. Only if the reader typed an address: the same two emails the site sends, in the app's
//      words, scheduled with Resend at once, so nothing on our side keeps a list of who asked.
//
// The request carries the app's session token (/api/unlock), like a kit email does, and each
// visitor gets a small allowance a day on top of it: an endpoint that emails whatever address it
// is given must not be a way to send mail to strangers all day.
//
// The address goes to Resend, for those two emails, and nowhere else: unlike a kit email's, it is
// not kept for launch news, and it is in no count. What is counted is one line: the tag and how
// many emails were set. The tag is the app's own random one, sent with every request for the same
// check-ins, so asking twice (a double tap, a retry on a bad connection) carries the same
// idempotency keys and Resend sets the emails once.
//
// It never fails the in-app check-ins over the emails: if they cannot be set, the refusal is
// counted (checkin_failed, as the site's is), the reader is told none will come, and the tickets
// are still handed back.
const { verify, allow, visitorOf } = require('../lib/unlock.js');
const checkin = require('../lib/checkin.js');
const count = require('./_lib/count.js');
const { EMAIL_RE, resendConfig, scheduleCheckins } = require('./email-kit.js');

const PER_DAY = 10;   // requests one visitor may make in a day: room for retries and a corrected address, none for a mailing

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method', message: 'POST only.' });
    return;
  }

  let email = '', token = '', kid = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    token = String(body.token || '');
    // The app's own random tag for these check-ins, cut down as the build counter cuts a kit's.
    // An app that sends none is given a fresh one, and should send it back if it asks again.
    kid = checkin.tagFor(body.kid);
  } catch {
    res.status(400).json({ error: 'bad_request', message: "Couldn't read that. Try again." });
    return;
  }

  // An address is optional, but one that is typed has to be one: a typo must not pass for "no emails, please".
  if (email && !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'email', message: "That email address doesn't look right." });
    return;
  }

  if (!verify(token)) {
    res.status(401).json({ error: 'locked', message: 'Your session has ended. Try again.' });
    return;
  }

  const tickets = { 1: checkin.ticket(kid, 1), 2: checkin.ticket(kid, 2) };
  if (!tickets[1] || !tickets[2]) {
    res.status(503).json({ error: 'unconfigured', message: "Check-ins aren't switched on." });
    return;
  }

  if (!allow('ac:' + visitorOf(req), PER_DAY, 24 * 3600 * 1000)) {
    res.status(429).json({ error: 'busy', message: 'Check-ins have been set several times from here today. Try again tomorrow.' });
    return;
  }

  let set = [];
  if (email) {
    const cfg = resendConfig();
    if (cfg) {
      try { set = await scheduleCheckins(cfg, email, kid, 'app'); } catch (e) { set = []; }
    }
  }
  await count('app_checkin', { kid, emails: set.length });

  let message = 'Check-ins are on.';
  if (email) {
    message += set.includes(1) ? " We'll email you in 3 days, and once more in about four weeks."
      : set.includes(2) ? " We'll email you in about four weeks."
      : ' The emails could not be set up, so none will come; the app will still ask you here.';
  }
  res.status(200).json({ ok: true, kid, checkins: set.length, tickets, message });
};
