// The Fight Pack's instructions, kept apart from request handling so they can be reviewed
// (and changed) as prose: standing rules in fightpack-preamble.js, the ten section specs in
// fightpack-sections.js. Used by api/fightpack.js.
const { PREAMBLE, DECODE_RULE } = require('./fightpack-preamble.js');
const { SEC } = require('./fightpack-sections.js');

module.exports = { PREAMBLE, DECODE_RULE, SEC };
