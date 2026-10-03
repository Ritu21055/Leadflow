const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');
const {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getStageTemplates,
  updateStageTemplates,
} = require('../controllers/emailTemplateController');

const router = express.Router();

router.use(auth, requireRole('brokerage_admin'), requireTenant);

router.get('/', listTemplates);
router.post('/', createTemplate);
router.get('/stages', getStageTemplates);
router.put('/stages', updateStageTemplates);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;
