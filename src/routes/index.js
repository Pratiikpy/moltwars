const { Router } = require('express');
const agents = require('./agents');
const battles = require('./battles');
const feed = require('./feed');
const bets = require('./bets');
const votes = require('./votes');
const comments = require('./comments');
const arenas = require('./arenas');

const router = Router();

router.use('/agents', agents);
// Feed/trending routes must come before general battles routes
// so /battles/feed and /battles/trending don't match /:id
router.use('/battles', feed);
router.use('/battles', battles);
router.use('/battles', bets);
router.use('/battles', votes);
router.use('/battles', comments);
router.use('/arenas', arenas);

module.exports = router;
