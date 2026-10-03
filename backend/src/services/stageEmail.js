const Brokerage = require('../models/Brokerage');
const EmailTemplate = require('../models/EmailTemplate');
const Job = require('../models/Job');

function fillPlaceholders(value, names) {
  return String(value || '')
    .replaceAll('{{clientName}}', names.clientName)
    .replaceAll('{{advisorName}}', names.advisorName);
}

function placeholderNames(lead, client) {
  const advisor = lead.assignedAdvisor && lead.assignedAdvisor.name ? lead.assignedAdvisor : null;
  const clientName = client && client.name ? client.name : lead.name;

  return {
    clientName: clientName || 'there',
    advisorName: advisor ? advisor.name : 'Unassigned',
  };
}

async function queueStageEmail(lead) {
  try {
    if (!lead || lead.duplicateOf) {
      return;
    }

    const brokerage = await Brokerage.findById(lead.brokerageId);

    if (!brokerage || !brokerage.stageTemplates) {
      return;
    }

    const templateId = brokerage.stageTemplates.get(lead.stage);

    if (!templateId) {
      return;
    }

    const template = await EmailTemplate.findOne({
      _id: templateId,
      brokerageId: lead.brokerageId,
    });

    if (!template || !lead.email) {
      return;
    }

    try {
      await Job.create({
        type: 'send-email',
        brokerageId: lead.brokerageId,
        leadId: lead._id,
        templateId: template._id,
        emailKey: `${lead._id}:${lead.stage}:${lead.version}`,
        payload: {
          name: lead.name,
          email: lead.email,
          source: 'stage-email',
          subject: template.subject,
          body: template.body,
        },
      });
    } catch (error) {
      if (error && error.code === 11000) {
        return;
      }

      throw error;
    }
  } catch (error) {
    console.error('Could not queue stage email:', error.message);
  }
}

module.exports = {
  fillPlaceholders,
  placeholderNames,
  queueStageEmail,
};
