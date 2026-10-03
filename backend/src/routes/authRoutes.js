const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { register, login, me } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.get('/me', auth, me);
router.post(
  '/register',
  auth,
  requireRole('platform_admin', 'brokerage_admin'),
  register
);

module.exports = router;
