// Dr Mumbo Jumbo — Fight Pack checkout.
// Creates a Stripe Checkout Session for the one-time $39 Fight Pack and returns its URL.
// Requires STRIPE_SECRET_KEY and STRIPE_PRICE_ID in the environment; until both exist the
// endpoint reports "unconfigured" and the page falls back to the waitlist.

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const configured = Boolean(secret && price);

  if (req.method === 'GET') {
    res.status(200).json({ configured, preview: Boolean(process.env.FIGHTPACK_PREVIEW_CODE) });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method', message: 'POST only.' });
    return;
  }
  if (!configured) {
    res.status(503).json({ error: 'unconfigured', message: 'Checkout is not switched on yet.' });
    return;
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'dr-mumbo-jumbo.com');
  const origin = /^localhost|^127\./.test(host) ? `http://${host}` : `https://${host}`;

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('line_items[0][price]', price);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', `${origin}/fightpack?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${origin}/fightpack?canceled=1`);
  form.set('allow_promotion_codes', 'true');
  form.set('billing_address_collection', 'auto');
  form.set('metadata[product]', 'fightpack');
  form.set('payment_intent_data[description]', 'Dr Mumbo Jumbo Fight Pack');

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.url) {
      res.status(502).json({ error: 'stripe', message: "Couldn't start checkout. Try again in a moment." });
      return;
    }
    res.status(200).json({ url: data.url });
  } catch {
    res.status(502).json({ error: 'stripe', message: "Couldn't start checkout. Try again in a moment." });
  }
};
