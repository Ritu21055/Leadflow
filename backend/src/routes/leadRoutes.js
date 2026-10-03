const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');
const {
  createLead,
  getLeads,
  getLead,
  convertLead,
  updateLead,
  updateLeadStage,
  deleteLead,
} = require('../controllers/leadController');

const router = express.Router();

router.use(auth, requireRole('brokerage_admin', 'advisor', 'client'), requireTenant);

router.post('/', requireRole('brokerage_admin', 'advisor'), createLead);
router.get('/', getLeads);
router.post('/:id/convert', requireRole('brokerage_admin', 'advisor'), convertLead);
router.patch(
  '/:id/stage',
  requireRole('brokerage_admin', 'advisor'),
  updateLeadStage
);
router.get('/:id', getLead);
router.patch('/:id', requireRole('brokerage_admin', 'advisor'), updateLead);
router.delete('/:id', requireRole('brokerage_admin', 'advisor'), deleteLead);

module.exports = router;
