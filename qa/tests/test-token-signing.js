// What the unlock-token signing key is derived from, and the consequence of that choice.
//
// This file CHANGES NOTHING. It pins the behaviour as it ships today and records a real
// operational hazard in it, so the trade-off is visible before it bites rather than after.
//
// signingKey() = sha256("dmj-fightpack|FIGHTPACK_SECRET|STRIPE_SECRET_KEY")
//
// The deliberate upside (asserted below, and in qa/tests/test-unlock.js): rotating a leaked
// STRIPE_SECRET_KEY also revokes every outstanding unlock token. A payment-credential
// compromise cannot leave valid tokens behind.
//
// The hazard, which is the same mechanism seen from the other side: STRIPE_SECRET_KEY is
// currently UNSET, contributing an empty string. The first time it is set - the day
// charging is switched on - this key changes and every outstanding token stops verifying.
// Tokens last 72h and /api/email-kit requires a valid one, so visitors in that window lose
// the ability to email a kit they already built, and the message they get is "Your free
// session has ended", which points nowhere near the cause.
//
// Worth noting when weighing it: rotating FIGHTPACK_SECRET already revokes all tokens, so
// the revocation capability does not depend on the Stripe term. That is the argument for
// dropping it. The argument for keeping it is that a Stripe rotation then cannot be
// forgotten. Either is defensible; it is not a decision to make silently, which is why
// this file only documents it.
const assert = require('assert');
const crypto = require('crypto');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

process.env.FIGHTPACK_SECRET = 'test-secret-123';
delete process.env.STRIPE_SECRET_KEY;
const u = require('../../lib/unlock.js');

// the derivation, exactly
ok(Buffer.compare(u.signingKey(), crypto.createHash('sha256').update('dmj-fightpack|test-secret-123|').digest()) === 0,
   'with no Stripe key, the key derives from FIGHTPACK_SECRET and an empty Stripe term');

const token = u.sign({ sid: 'free' });
ok(!!u.verify(token), 'a token minted today verifies today');

// THE HAZARD, asserted as current behaviour so it cannot change unnoticed
process.env.STRIPE_SECRET_KEY = 'sk_live_the_day_we_start_charging';
ok(u.verify(token) === null,
   'switching on charging for the first time invalidates every token minted before it');

// the upside, same mechanism
process.env.STRIPE_SECRET_KEY = 'sk_live_rotated_after_a_leak';
ok(u.verify(token) === null, 'and rotating a leaked Stripe key revokes tokens too (the intended benefit)');

delete process.env.STRIPE_SECRET_KEY;
ok(!!u.verify(token), 'removing the Stripe key again restores the original key, so the token verifies once more');

// FIGHTPACK_SECRET rotation is already a complete kill switch on its own
process.env.FIGHTPACK_SECRET = 'a-different-secret';
ok(u.verify(token) === null, 'rotating FIGHTPACK_SECRET alone revokes every token');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
ok(!!u.verify(token), 'and restoring it brings them back');

// no secret means refusing to sign, never signing unsigned
delete process.env.FIGHTPACK_SECRET;
ok(u.signingKey() === null, 'no secret -> no key');
ok(u.sign({ sid: 'free' }) === null, 'no secret -> refuses to sign');
process.env.FIGHTPACK_SECRET = 'test-secret-123';

console.log('token-signing: documented current behaviour (' + n + ' assertions, no change)');
