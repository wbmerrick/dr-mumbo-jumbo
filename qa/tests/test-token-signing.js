// Unlock-token signing must not depend on the Stripe credential.
//
// The bug this exists to prevent: signingKey() mixed STRIPE_SECRET_KEY into the HMAC key.
// With no Stripe key set it contributed an empty string, so everything worked - right up
// until the day charging gets switched on. Then the key silently changes, every outstanding
// token fails to verify, and because /api/email-kit requires a valid token the first
// visitors after the switch lose the ability to email a kit they already built. Tokens last
// 72h, so the blast radius is three days of visitors, and the symptom ("Your free session
// has ended") points nowhere near the cause.
const assert = require('assert');
const crypto = require('crypto');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

process.env.FIGHTPACK_SECRET = 'test-secret-123';
delete process.env.STRIPE_SECRET_KEY;
const u = require('../../lib/unlock.js');

// 1. This change must not invalidate tokens that already exist in the wild. The derivation
//    while no Stripe key is set has to stay byte-identical to the old one.
const legacyNoStripe = crypto.createHash('sha256').update('dmj-fightpack|test-secret-123|').digest();
ok(Buffer.compare(u.signingKey(), legacyNoStripe) === 0, 'key is unchanged from the pre-fix derivation when no Stripe key is set');

// 2. A token stays valid across the whole lifecycle of a Stripe credential.
const token = u.sign({ sid: 'free' });
ok(!!u.verify(token), 'valid before any Stripe key exists');

process.env.STRIPE_SECRET_KEY = 'sk_live_the_day_we_start_charging';
ok(!!u.verify(token), 'still valid the moment charging is switched on');

process.env.STRIPE_SECRET_KEY = 'sk_live_rotated_after_a_leak';
ok(!!u.verify(token), 'still valid after the Stripe key is rotated');

delete process.env.STRIPE_SECRET_KEY;
ok(!!u.verify(token), 'still valid if the Stripe key is removed again');

// 3. The real signing secret still governs: change it and tokens must stop verifying,
//    otherwise this test would pass on a signingKey() that ignored its input entirely.
process.env.FIGHTPACK_SECRET = 'a-different-secret';
ok(u.verify(token) === null, 'rotating FIGHTPACK_SECRET does invalidate tokens, as it should');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
ok(!!u.verify(token), 'and restoring it brings them back');

// 4. No secret at all means no signing, not an unsigned token.
delete process.env.FIGHTPACK_SECRET;
ok(u.signingKey() === null, 'no secret -> no key');
ok(u.sign({ sid: 'free' }) === null, 'no secret -> refuses to sign');
process.env.FIGHTPACK_SECRET = 'test-secret-123';

console.log('token-signing tests passed (' + n + ' assertions)');
