const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');

const router = express.Router();

router.get('/protected', auth, (req, res) => {
  res.json({
    message: 'You are authenticated',
    userId: req.user.userId,
    role: req.user.role,
    brokerageId: req.user.brokerageId,
  });
});

router.get(
  '/tenant',
  auth,
  requireRole('brokerage_admin', 'advisor', 'client'),
  requireTenant,
  (req, res) => {
    res.json({
      message: 'This data belongs to your brokerage only',
      brokerageId: req.brokerageId,
      role: req.user.role,
    });
  }
);

module.exports = router;
