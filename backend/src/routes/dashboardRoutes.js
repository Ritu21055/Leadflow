const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

router.get(
  '/',
  auth,
  requireRole('brokerage_admin', 'advisor'),
  requireTenant,
  getDashboard
);

module.exports = router;
