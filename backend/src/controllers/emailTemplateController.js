const mongoose = require('mongoose');
const Brokerage = require('../models/Brokerage');
const EmailTemplate = require('../models/EmailTemplate');
const Lead = require('../models/Lead');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toPublicTemplate(template) {
  return {
    id: String(template._id),
    name: template.name,
    subject: template.subject,
    body: template.body,
    brokerageId: String(template.brokerageId),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

function templateFields(body) {
  const name = text(body.name);
  const subject = text(body.subject);
  const message = typeof body.body === 'string' ? body.body.trim() : '';

  if (!name || !subject || !message) {
    return { error: 'Name, subject, and body are required' };
  }

  return { name, subject, body: message };
}

async function listTemplates(req, res) {
  const templates = await EmailTemplate.find({ brokerageId: req.brokerageId }).sort({ name: 1 });
  res.json({ templates: templates.map(toPublicTemplate) });
}

async function createTemplate(req, res) {
  const fields = templateFields(req.body || {});

  if (fields.error) {
    res.status(400).json({ message: fields.error });
    return;
  }

  const template = await EmailTemplate.create({
    ...fields,
    brokerageId: req.brokerageId,
  });

  res.status(201).json({ template: toPublicTemplate(template) });
}

async function updateTemplate(req, res) {
  const fields = templateFields(req.body || {});

  if (fields.error) {
    res.status(400).json({ message: fields.error });
    return;
  }

  const template = await EmailTemplate.findOneAndUpdate(
    { _id: req.params.id, brokerageId: req.brokerageId },
    { $set: fields },
    { new: true, runValidators: true }
  );

  if (!template) {
    res.status(404).json({ message: 'Template not found' });
    return;
  }

  res.json({ template: toPublicTemplate(template) });
}

async function deleteTemplate(req, res) {
  const template = await EmailTemplate.findOneAndDelete({
    _id: req.params.id,
    brokerageId: req.brokerageId,
  });

  if (!template) {
    res.status(404).json({ message: 'Template not found' });
    return;
  }

  const brokerage = await Brokerage.findById(req.brokerageId);

  if (brokerage && brokerage.stageTemplates) {
    for (const [stage, templateId] of brokerage.stageTemplates.entries()) {
      if (String(templateId) === String(template._id)) {
        brokerage.stageTemplates.delete(stage);
      }
    }
    await brokerage.save();
  }

  res.json({ message: 'Template deleted' });
}

async function getStageTemplates(req, res) {
  const brokerage = await Brokerage.findById(req.brokerageId);
  const templates = await EmailTemplate.find({ brokerageId: req.brokerageId });
  const byId = new Map(templates.map((template) => [String(template._id), template]));
  const stages = {};

  for (const stage of Lead.STAGES) {
    const templateId = brokerage && brokerage.stageTemplates ? brokerage.stageTemplates.get(stage) : null;
    const template = templateId ? byId.get(String(templateId)) : null;
    stages[stage] = template
      ? { templateId: String(template._id), name: template.name }
      : null;
  }

  res.json({ stages });
}

async function updateStageTemplates(req, res) {
  const incoming = req.body && req.body.stages;

  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    res.status(400).json({ message: 'Choose a template for each stage, or leave it empty' });
    return;
  }

  const brokerage = await Brokerage.findById(req.brokerageId);

  if (!brokerage) {
    res.status(404).json({ message: 'Brokerage not found' });
    return;
  }

  const next = new Map();

  for (const stage of Object.keys(incoming)) {
    if (!Lead.STAGES.includes(stage)) {
      res.status(400).json({ message: 'Choose a valid pipeline stage' });
      return;
    }
  }

  for (const stage of Lead.STAGES) {
    const value = incoming[stage];

    if (value == null || value === '') {
      continue;
    }

    if (!mongoose.isValidObjectId(value)) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    const template = await EmailTemplate.findOne({
      _id: value,
      brokerageId: req.brokerageId,
    });

    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    next.set(stage, template._id);
  }

  brokerage.stageTemplates = next;
  await brokerage.save();
  await getStageTemplates(req, res);
}

module.exports = {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getStageTemplates,
  updateStageTemplates,
};
