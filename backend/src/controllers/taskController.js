const mongoose = require('mongoose');
const Brokerage = require('../models/Brokerage');
const Task = require('../models/Task');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { toPublicTask } = require('../services/stageTasks');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toPublicRule(rule) {
  const advisor = rule.assignedAdvisor && rule.assignedAdvisor.name ? rule.assignedAdvisor : null;

  return {
    id: String(rule._id),
    stage: rule.stage,
    title: rule.title,
    assignedAdvisor: advisor
      ? { id: String(advisor._id), name: advisor.name }
      : { id: String(rule.assignedAdvisor), name: 'Advisor' },
    dueOffsetMinutes: rule.dueOffsetMinutes,
  };
}

async function advisorInBrokerage(advisorId, brokerageId) {
  if (!mongoose.isValidObjectId(advisorId)) {
    return null;
  }

  return User.findOne({
    _id: advisorId,
    brokerageId,
    role: 'advisor',
  }).select('name email');
}

function ruleFields(body) {
  const stage = text(body.stage);
  const title = text(body.title);
  const dueOffsetMinutes = Number(body.dueOffsetMinutes);

  if (!Lead.STAGES.includes(stage)) {
    return { error: 'Choose a valid pipeline stage' };
  }

  if (!title) {
    return { error: 'Task title is required' };
  }

  if (!Number.isInteger(dueOffsetMinutes) || dueOffsetMinutes < 1) {
    return { error: 'Due time must be at least 1 minute' };
  }

  return { stage, title, dueOffsetMinutes };
}

async function listRules(req, res) {
  const brokerage = await Brokerage.findById(req.brokerageId).populate(
    'stageTaskRules.assignedAdvisor',
    'name email'
  );
  const advisors = await User.find({ brokerageId: req.brokerageId, role: 'advisor' })
    .select('name email')
    .sort({ name: 1 });

  res.json({
    rules: brokerage && brokerage.stageTaskRules ? brokerage.stageTaskRules.map(toPublicRule) : [],
    advisors: advisors.map((advisor) => ({
      id: String(advisor._id),
      name: advisor.name,
      email: advisor.email,
    })),
  });
}

async function createRule(req, res) {
  const fields = ruleFields(req.body || {});

  if (fields.error) {
    res.status(400).json({ message: fields.error });
    return;
  }

  const advisor = await advisorInBrokerage(req.body.assignedAdvisor, req.brokerageId);

  if (!advisor) {
    res.status(400).json({ message: 'Choose an advisor in your brokerage' });
    return;
  }

  const brokerage = await Brokerage.findById(req.brokerageId);

  if (!brokerage) {
    res.status(404).json({ message: 'Brokerage not found' });
    return;
  }

  brokerage.stageTaskRules.push({
    ...fields,
    assignedAdvisor: advisor._id,
  });
  await brokerage.save();
  const rule = brokerage.stageTaskRules[brokerage.stageTaskRules.length - 1];
  rule.assignedAdvisor = advisor;
  res.status(201).json({ rule: toPublicRule(rule) });
}

async function updateRule(req, res) {
  const fields = ruleFields(req.body || {});

  if (fields.error) {
    res.status(400).json({ message: fields.error });
    return;
  }

  const advisor = await advisorInBrokerage(req.body.assignedAdvisor, req.brokerageId);

  if (!advisor) {
    res.status(400).json({ message: 'Choose an advisor in your brokerage' });
    return;
  }

  const brokerage = await Brokerage.findById(req.brokerageId);
  const rule = brokerage && brokerage.stageTaskRules.id(req.params.id);

  if (!rule) {
    res.status(404).json({ message: 'Task rule not found' });
    return;
  }

  rule.stage = fields.stage;
  rule.title = fields.title;
  rule.dueOffsetMinutes = fields.dueOffsetMinutes;
  rule.assignedAdvisor = advisor._id;
  await brokerage.save();
  rule.assignedAdvisor = advisor;
  res.json({ rule: toPublicRule(rule) });
}

async function deleteRule(req, res) {
  const brokerage = await Brokerage.findById(req.brokerageId);
  const rule = brokerage && brokerage.stageTaskRules.id(req.params.id);

  if (!rule) {
    res.status(404).json({ message: 'Task rule not found' });
    return;
  }

  brokerage.stageTaskRules.pull(rule._id);
  await brokerage.save();
  res.json({ message: 'Task rule deleted' });
}

async function listTasks(req, res) {
  const tasks = await Task.find({ brokerageId: req.brokerageId })
    .populate('leadId', 'name')
    .populate('assignedAdvisor', 'name')
    .sort({ dueDate: 1, createdAt: -1 });

  res.json({ tasks: tasks.map(toPublicTask) });
}

async function completeTask(req, res) {
  const task = await Task.findOne({
    _id: req.params.id,
    brokerageId: req.brokerageId,
  });

  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  if (req.user.role === 'advisor' && String(task.assignedAdvisor) !== String(req.user.userId)) {
    res.status(403).json({ message: 'You can only complete tasks assigned to you' });
    return;
  }

  task.status = 'completed';
  await task.save();
  await task.populate('leadId', 'name');
  await task.populate('assignedAdvisor', 'name');
  res.json({ task: toPublicTask(task) });
}

module.exports = {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listTasks,
  completeTask,
};
