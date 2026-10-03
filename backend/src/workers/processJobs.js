require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Job = require('../models/Job');
const Document = require('../models/Document');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { sendMail } = require('../mailer');
const { ingestLead } = require('../services/leadService');
const { fillPlaceholders, placeholderNames } = require('../services/stageEmail');

const POLL_MS = 1000;
const RETRY_DELAY_MS = 1000;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function checkDocument(job) {
  const document = await Document.findOne({
    _id: job.documentId,
    leadId: job.leadId,
    brokerageId: job.brokerageId,
  });

  if (!document) {
    throw new Error('Document not found for this brokerage');
  }

  if (document.status === 'verified' || document.status === 'failed') {
    return document.status;
  }

  if (document.status !== 'checking') {
    document.status = 'checking';
    await document.save();
  }

  const waitMs = 10000 + Math.floor(Math.random() * 10001);
  await wait(waitMs);

  const current = await Document.findOne({
    _id: job.documentId,
    leadId: job.leadId,
    brokerageId: job.brokerageId,
  });

  if (!current) {
    throw new Error('Document not found for this brokerage');
  }

  if (current.status === 'verified' || current.status === 'failed') {
    return current.status;
  }

  current.status = Math.floor(Math.random() * 5) === 0 ? 'failed' : 'verified';
  await current.save();
  return current.status;
}

async function sendStageEmail(job) {
  const lead = await Lead.findOne({
    _id: job.leadId,
    brokerageId: job.brokerageId,
  }).populate('assignedAdvisor', 'name');

  if (!lead) {
    throw new Error('Lead not found for this brokerage');
  }

  const recipient = job.payload.email || lead.email;

  if (!recipient) {
    throw new Error('Lead has no email address');
  }

  const client = await User.findOne({
    leadId: lead._id,
    brokerageId: job.brokerageId,
    role: 'client',
  }).select('name');

  const names = placeholderNames(lead, client);
  const subject = fillPlaceholders(job.payload.subject, names);
  const text = fillPlaceholders(job.payload.body, names);
  const info = await sendMail({ to: recipient, subject, text });

  return {
    to: recipient,
    subject,
    messageId: info.messageId || '',
  };
}

async function processNextJob() {
  const job = await Job.findOneAndUpdate(
    { status: 'pending', runAt: { $lte: new Date() } },
    { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    { sort: { runAt: 1, createdAt: 1 }, new: true }
  );

  if (!job) {
    return false;
  }

  try {
    if (job.type === 'ingest-lead') {
      const result = await ingestLead({
        brokerageId: job.brokerageId,
        name: job.payload.name,
        email: job.payload.email,
        phone: job.payload.phone,
        source: job.payload.source,
        assignedAdvisorId: job.payload.assignedAdvisor,
      });

      job.status = 'done';
      job.lastError = '';
      job.result = {
        duplicate: result.duplicate,
        matchedBy: result.matchedBy,
        message: result.message,
        leadId: result.lead ? String(result.lead._id) : null,
      };
    } else if (job.type === 'check-document') {
      const status = await checkDocument(job);
      job.status = 'done';
      job.lastError = '';
      job.result = {
        documentId: String(job.documentId),
        leadId: String(job.leadId),
        status,
      };
    } else if (job.type === 'send-email') {
      const result = await sendStageEmail(job);
      job.status = 'done';
      job.lastError = '';
      job.result = result;
    } else {
      throw new Error('Unknown job type');
    }
  } catch (error) {
    job.lastError = error.message || 'Job failed';
    const missingMailConfig = job.lastError.startsWith('Mailtrap SMTP settings are missing');

    if (!missingMailConfig && job.attempts < job.maxAttempts) {
      job.status = 'pending';
      job.runAt = new Date(Date.now() + RETRY_DELAY_MS);
    } else {
      job.status = 'failed';
    }

    console.error(`Job ${job._id} failed on attempt ${job.attempts}: ${job.lastError}`);
  }

  await job.save();
  return true;
}

let workerStarted = false;

async function startWorker() {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  await connectDB();
  console.log('Worker polling for jobs');

  while (true) {
    const worked = await processNextJob();

    if (!worked) {
      await wait(POLL_MS);
    }
  }
}

if (require.main === module) {
  startWorker().catch(async (error) => {
    console.error('Worker failed to start:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = {
  processNextJob,
  startWorker,
};
