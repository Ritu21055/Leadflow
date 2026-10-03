const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireTenant = require('../middleware/tenant');
const {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listTasks,
  completeTask,
} = require('../controllers/taskController');

const router = express.Router();

router.get(
  '/tasks',
  auth,
  requireRole('brokerage_admin', 'advisor'),
  requireTenant,
  listTasks
);
router.patch(
  '/tasks/:id/complete',
  auth,
  requireRole('brokerage_admin', 'advisor'),
  requireTenant,
  completeTask
);

router.get('/task-rules', auth, requireRole('brokerage_admin'), requireTenant, listRules);
router.post('/task-rules', auth, requireRole('brokerage_admin'), requireTenant, createRule);
router.patch('/task-rules/:id', auth, requireRole('brokerage_admin'), requireTenant, updateRule);
router.delete('/task-rules/:id', auth, requireRole('brokerage_admin'), requireTenant, deleteRule);

module.exports = router;
