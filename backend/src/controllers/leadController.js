const crypto = require('crypto');
const Brokerage = require('../models/Brokerage');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { advisorInBrokerage, ingestLead } = require('../services/leadService');
const { queueStageEmail } = require('../services/stageEmail');
const { createStageTasks } = require('../services/stageTasks');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toPublicLead(lead) {
  const advisor = lead.assignedAdvisor && lead.assignedAdvisor.name ? lead.assignedAdvisor : null;

  return {
    id: String(lead._id),
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone || '',
    source: lead.source || 'manual',
    stage: lead.stage,
    assignedAdvisor: advisor
      ? {
          id: String(advisor._id),
          name: advisor.name,
          email: advisor.email,
        }
      : null,
    brokerageId: String(lead.brokerageId),
    duplicateOf: lead.duplicateOf ? String(lead.duplicateOf) : null,
    version: lead.version,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function leadQuery(req) {
  return Lead.find({ brokerageId: req.brokerageId, duplicateOf: null }).populate(
    'assignedAdvisor',
    'name email'
  );
}

function toPublicClient(client) {
  return {
    id: String(client._id),
    name: client.name,
    email: client.email,
  };
}

function sendLeadError(res, error) {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  if (error.name === 'CastError') {
    return res.status(404).json({ message: 'Lead not found' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Could not complete the lead request' });
}

async function createLead(req, res) {
  try {
    const result = await ingestLead({
      brokerageId: req.brokerageId,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      source: req.body.source,
      assignedAdvisorId: req.body.assignedAdvisor,
    });

    if (!result.duplicate) {
      return res.status(201).json({ lead: toPublicLead(result.lead) });
    }

    return res.status(200).json({
      duplicate: true,
      matchedBy: result.matchedBy,
      message: result.message,
      existingLead: result.existingLead ? toPublicLead(result.existingLead) : null,
      existingClient: result.existingClient ? toPublicClient(result.existingClient) : null,
      lead: result.lead ? toPublicLead(result.lead) : null,
    });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

async function clientLeadId(req) {
  const user = await User.findById(req.user.userId).select('leadId');

  if (!user || !user.leadId) {
    return null;
  }

  return String(user.leadId);
}

async function getLeads(req, res) {
  try {
    if (req.user.role === 'client') {
      const leadId = await clientLeadId(req);

      if (!leadId) {
        return res.json({ leads: [] });
      }

      const leads = await Lead.find({
        _id: leadId,
        brokerageId: req.brokerageId,
        duplicateOf: null,
      }).populate('assignedAdvisor', 'name email');

      return res.json({ leads: leads.map(toPublicLead) });
    }

    const leads = await leadQuery(req).sort({ createdAt: -1 });
    return res.json({ leads: leads.map(toPublicLead) });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

async function getLead(req, res) {
  try {
    if (req.user.role === 'client') {
      const leadId = await clientLeadId(req);

      if (!leadId || leadId !== String(req.params.id)) {
        return res.status(404).json({ message: 'Lead not found' });
      }
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      brokerageId: req.brokerageId,
    }).populate('assignedAdvisor', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.json({ lead: toPublicLead(lead) });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

async function getMyCase(req, res) {
  try {
    const leadId = await clientLeadId(req);

    if (!leadId) {
      return res.status(404).json({ message: 'No case is linked to this account' });
    }

    const lead = await Lead.findOne({
      _id: leadId,
      brokerageId: req.brokerageId,
    }).populate('assignedAdvisor', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'No case is linked to this account' });
    }

    const brokerage = await Brokerage.findById(req.brokerageId).select('name');

    return res.json({
      case: {
        ...toPublicLead(lead),
        brokerageName: brokerage ? brokerage.name : '',
      },
    });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

function temporaryPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

async function convertLead(req, res) {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      brokerageId: req.brokerageId,
      duplicateOf: null,
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.stage !== 'Won') {
      return res.status(400).json({ message: 'Only a lead in Won can be converted to a client' });
    }

    const existingForLead = await User.findOne({ leadId: lead._id, role: 'client' });

    if (existingForLead) {
      return res.status(409).json({ message: 'This lead already has a client account' });
    }

    if (!lead.email) {
      return res.status(400).json({ message: 'Add an email to this lead before converting it' });
    }

    const existingEmail = await User.findOne({ email: lead.email });

    if (existingEmail) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const password = temporaryPassword();
    const client = await User.create({
      name: lead.name,
      email: lead.email,
      password,
      role: 'client',
      brokerageId: req.brokerageId,
      leadId: lead._id,
    });

    await client.populate('brokerageId', 'name slug');

    return res.status(201).json({
      message: 'Lead converted to a client',
      temporaryPassword: password,
      client: {
        id: String(client._id),
        name: client.name,
        email: client.email,
        role: client.role,
        brokerageId: String(req.brokerageId),
        leadId: String(lead._id),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This lead already has a client account' });
    }

    return sendLeadError(res, error);
  }
}

async function updateLead(req, res) {
  try {
    const updates = {};

    if (req.body.name !== undefined) {
      const name = text(req.body.name);
      if (!name) {
        return res.status(400).json({ message: 'Name is required' });
      }
      updates.name = name;
    }

    if (req.body.email !== undefined) {
      updates.email = text(req.body.email).toLowerCase();
    }

    if (req.body.phone !== undefined) {
      updates.phone = text(req.body.phone);
    }

    if (req.body.source !== undefined) {
      updates.source = text(req.body.source) || 'manual';
    }

    if (req.body.assignedAdvisor !== undefined) {
      updates.assignedAdvisor = await advisorInBrokerage(req.body.assignedAdvisor, req.brokerageId);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No lead fields to update' });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, brokerageId: req.brokerageId },
      { $set: updates, $inc: { version: 1 } },
      { new: true, runValidators: true }
    ).populate('assignedAdvisor', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.json({ lead: toPublicLead(lead) });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

async function updateLeadStage(req, res) {
  try {
    const stage = text(req.body.stage);
    const version = Number(req.body.version);

    if (!Lead.STAGES.includes(stage)) {
      return res.status(400).json({ message: 'Choose a valid pipeline stage' });
    }

    if (!Number.isInteger(version)) {
      return res.status(400).json({ message: 'Version is required' });
    }

    const filter = {
      _id: req.params.id,
      brokerageId: req.brokerageId,
      version,
    };
    const current = await Lead.findOne(filter);

    if (current && current.stage === stage) {
      await current.populate('assignedAdvisor', 'name email');
      return res.json({ lead: toPublicLead(current) });
    }

    const lead = await Lead.findOneAndUpdate(
      filter,
      { $set: { stage }, $inc: { version: 1 } },
      { new: true, runValidators: true }
    ).populate('assignedAdvisor', 'name email');

    if (lead) {
      const publicLead = toPublicLead(lead);
      const io = req.app.get('io');

      if (io) {
        io.to(`brokerage:${publicLead.brokerageId}`).emit('lead:stage', { lead: publicLead });
      }

      await queueStageEmail(lead);
      await createStageTasks(lead);

      return res.json({ lead: publicLead });
    }

    const existing = await Lead.findOne({
      _id: req.params.id,
      brokerageId: req.brokerageId,
    }).populate('assignedAdvisor', 'name email');

    if (!existing) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.status(409).json({
      message: 'This lead was changed by someone else. Refresh the board and try again.',
      lead: toPublicLead(existing),
    });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

async function deleteLead(req, res) {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      brokerageId: req.brokerageId,
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    return res.json({ message: 'Lead deleted' });
  } catch (error) {
    return sendLeadError(res, error);
  }
}

module.exports = {
  createLead,
  getLeads,
  getLead,
  getMyCase,
  convertLead,
  updateLead,
  updateLeadStage,
  deleteLead,
};
