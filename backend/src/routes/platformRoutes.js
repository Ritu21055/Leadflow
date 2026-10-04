const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  listBrokerages,
  createBrokerage,
  createBrokerageAdmin,
} = require('../controllers/platformController');

const router = express.Router();

router.use(auth, requireRole('platform_admin'));

router.get('/brokerages', listBrokerages);
router.post('/brokerages', createBrokerage);
router.post('/brokerage-admins', createBrokerageAdmin);

module.exports = router;
