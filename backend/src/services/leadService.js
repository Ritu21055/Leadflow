const Lead = require('../models/Lead');
const User = require('../models/User');
const { queueStageEmail } = require('./stageEmail');
const { createStageTasks } = require('./stageTasks');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function findExistingPerson(brokerageId, email, phone) {
  const activeLead = { brokerageId, duplicateOf: null };
  const emailLead = email ? await Lead.findOne({ ...activeLead, email }) : null;
  const phoneLead = phone ? await Lead.findOne({ ...activeLead, phone }) : null;
  const existingClient = email
    ? await User.findOne({ brokerageId, role: 'client', email })
    : null;

  let existingLead = null;
  let matchedBy = null;

  if (emailLead && phoneLead && String(emailLead._id) === String(phoneLead._id)) {
    existingLead = emailLead;
    matchedBy = 'both';
  } else if (emailLead) {
    existingLead = emailLead;
    matchedBy = 'email';
  } else if (phoneLead) {
    existingLead = phoneLead;
    matchedBy = 'phone';
  } else if (existingClient) {
    matchedBy = 'email';
  }

  return { existingLead, existingClient, matchedBy };
}

function duplicateMessage(matchedBy, existingLead) {
  const how = matchedBy === 'both' ? 'email and phone' : matchedBy;

  return `${existingLead.name} already exists in your brokerage (matched by ${how}). The new entry was saved as a duplicate and was not added to the pipeline.`;
}

async function advisorInBrokerage(advisorId, brokerageId) {
  if (!advisorId) {
    return null;
  }

  const advisor = await User.findOne({
    _id: advisorId,
    brokerageId,
    role: 'advisor',
  });

  if (!advisor) {
    const error = new Error('Assigned advisor must be an advisor in your brokerage');
    error.status = 400;
    throw error;
  }

  return advisor._id;
}

async function ingestLead({ brokerageId, name, email, phone, source, assignedAdvisorId }) {
  const cleanName = text(name);

  if (!cleanName) {
    const error = new Error('Name is required');
    error.status = 400;
    throw error;
  }

  const cleanEmail = text(email).toLowerCase();
  const cleanPhone = text(phone);
  const cleanSource = text(source) || 'manual';
  const { existingLead, existingClient, matchedBy } = await findExistingPerson(
    brokerageId,
    cleanEmail,
    cleanPhone
  );

  if (existingClient && !existingLead) {
    return {
      duplicate: true,
      matchedBy: 'email',
      message: `${existingClient.name} already exists as a client in your brokerage. A new lead was not created.`,
      existingClient,
      existingLead: null,
      lead: null,
    };
  }

  if (existingLead) {
    await existingLead.populate('assignedAdvisor', 'name email');
    const assignedAdvisor = await advisorInBrokerage(assignedAdvisorId, brokerageId);
    const duplicateLead = await Lead.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      source: cleanSource,
      stage: 'New',
      assignedAdvisor,
      brokerageId,
      duplicateOf: existingLead._id,
    });

    await duplicateLead.populate('assignedAdvisor', 'name email');

    return {
      duplicate: true,
      matchedBy,
      message: duplicateMessage(matchedBy, existingLead),
      existingLead,
      existingClient,
      lead: duplicateLead,
    };
  }

  const assignedAdvisor = await advisorInBrokerage(assignedAdvisorId, brokerageId);
  const lead = await Lead.create({
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    source: cleanSource,
    stage: 'New',
    assignedAdvisor,
    brokerageId,
  });

  await lead.populate('assignedAdvisor', 'name email');
  await queueStageEmail(lead);
  await createStageTasks(lead);

  return {
    duplicate: false,
    matchedBy: null,
    message: 'Lead created',
    existingLead: null,
    existingClient: null,
    lead,
  };
}

module.exports = {
  advisorInBrokerage,
  ingestLead,
};
