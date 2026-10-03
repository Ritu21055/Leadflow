const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');
const { getMyCase } = require('../controllers/leadController');

const router = express.Router();

router.get('/case', auth, requireRole('client'), requireTenant, getMyCase);

module.exports = router;
