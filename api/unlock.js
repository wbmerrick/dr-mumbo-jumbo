// Dr Mumbo Jumbo — Fight Pack unlock.
// Hands out a signed, time-limited token that /api/fightpack accepts: for free while free mode is on
// (FIGHTPACK_FREE unset), or in exchange for a paid Stripe Checkout session or the private preview code.
// Nothing is stored server-side.

const { sign, isFree, mintFree } = require('../lib/unlock.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method', message: 'POST only.' });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.status(400).json({ error: 'bad_request', message: "Couldn't read that request." });
    return;
  }

  // Free mode: any visitor, a few kits an hour (lib/unlock.js).
  if (body.free) {
    if (!isFree()) {
      res.status(403).json({ error: 'paid', message: 'The Fight Pack is no longer free — use checkout to unlock it.' });
      return;
    }
    const r = mintFree(req);
    if (r.error === 'busy') {
      res.status(429).json({ error: 'busy', message: "You've built several kits in the last hour. Please try again in a little while." });
      return;
    }
    if (!r.token) {
      res.status(503).json({ error: 'unconfigured', message: 'Unlock is not switched on yet.' });
      return;
    }
    res.status(200).json({ token: r.token, free: true });
    return;
  }

  // Private preview code (for testing).
  const code = String(body.code || '').trim();
  if (code) {
    const expected = process.env.FIGHTPACK_PREVIEW_CODE;
    if (!expected || code !== expected) {
      res.status(403).json({ error: 'code', message: "That code isn't valid." });
      return;
    }
    const token = sign({ sid: 'preview' });
    if (!token) {
      res.status(503).json({ error: 'unconfigured', message: 'Unlock is not switched on yet.' });
      return;
    }
    res.status(200).json({ token });
    return;
  }

  // Paid Stripe Checkout session.
  const sessionId = String(body.session_id || '').trim();
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    res.status(400).json({ error: 'session', message: 'Missing checkout session.' });
    return;
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    res.status(503).json({ error: 'unconfigured', message: 'Checkout is not switched on yet.' });
    return;
  }

  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(502).json({ error: 'stripe', message: "Couldn't confirm the payment. Try again in a moment." });
      return;
    }
    const paid = data.payment_status === 'paid' || data.payment_status === 'no_payment_required';
    const ours = !data.metadata || !data.metadata.product || data.metadata.product === 'fightpack';
    if (!paid || !ours) {
      res.status(402).json({ error: 'unpaid', message: "That checkout wasn't completed." });
      return;
    }
    const token = sign({ sid: sessionId });
    res.status(200).json({ token });
  } catch {
    res.status(502).json({ error: 'stripe', message: "Couldn't confirm the payment. Try again in a moment." });
  }
};
