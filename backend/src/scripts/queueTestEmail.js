require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Brokerage = require('../models/Brokerage');
const EmailTemplate = require('../models/EmailTemplate');
const Job = require('../models/Job');
const Lead = require('../models/Lead');
const { mailConfig } = require('../mailer');

async function main() {
  mailConfig();
  await connectDB();

  const brokerage = await Brokerage.findOne({ slug: 'northbridge' });

  if (!brokerage) {
    throw new Error('Northbridge brokerage was not found. Run npm run seed first.');
  }

  const templateId = brokerage.stageTemplates && brokerage.stageTemplates.get('New');
  const template = templateId
    ? await EmailTemplate.findOne({ _id: templateId, brokerageId: brokerage._id })
    : await EmailTemplate.findOne({ brokerageId: brokerage._id, name: 'Welcome' });

  if (!template) {
    throw new Error('No Welcome template is linked to the New stage.');
  }

  const lead = await Lead.findOne({
    brokerageId: brokerage._id,
    duplicateOf: null,
    email: { $ne: '' },
  }).sort({ createdAt: -1 });

  if (!lead) {
    throw new Error('Create a Northbridge lead with an email address first.');
  }

  const job = await Job.create({
    type: 'send-email',
    brokerageId: brokerage._id,
    leadId: lead._id,
    templateId: template._id,
    payload: {
      name: lead.name,
      email: lead.email,
      source: 'stage-email',
      subject: template.subject,
      body: template.body,
    },
  });

  console.log(`Queued test email ${job._id} to ${lead.email}.`);
  console.log('The running worker will send it. Then look in your Mailtrap inbox.');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
