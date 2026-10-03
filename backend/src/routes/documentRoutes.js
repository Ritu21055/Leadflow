const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');
const { readUpload, uploadDocument, listDocuments } = require('../controllers/documentController');

const router = express.Router();

router.use(auth, requireTenant);

router.post('/', requireRole('client'), readUpload, uploadDocument);

router.get(
  '/case/:leadId',
  requireRole('brokerage_admin', 'advisor', 'client'),
  listDocuments
);

module.exports = router;
