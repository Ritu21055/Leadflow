const express = require('express');
const { receiveLead } = require('../controllers/webhookController');

const router = express.Router();

router.post('/leads', receiveLead);

module.exports = router;
