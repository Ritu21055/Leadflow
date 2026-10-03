const Brokerage = require('../models/Brokerage');
const Job = require('../models/Job');
const { isTallyPayload, mapTallyPayload } = require('../services/tallyPayload');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateLeadPayload(body) {
  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const phone = text(body.phone);
  const source = text(body.source);

  if (!name || body.email === undefined || body.phone === undefined || !source) {
    return { error: 'Name, email, phone, and source are required' };
  }

  if (typeof body.email !== 'string' || typeof body.phone !== 'string' || typeof body.source !== 'string') {
    return { error: 'Name, email, phone, and source must be text' };
  }

  if (email && !email.includes('@')) {
    return { error: 'Email is not valid' };
  }

  return {
    payload: {
      name,
      email,
      phone,
      source,
    },
  };
}

async function receiveLead(req, res) {
  try {
    const secret = text(req.get('x-webhook-secret'));

    if (!secret) {
      return res.status(401).json({ message: 'Webhook secret is required' });
    }

    const brokerage = await Brokerage.findOne({ webhookSecret: secret });

    if (!brokerage) {
      return res.status(401).json({ message: 'Webhook secret is not valid' });
    }

    const body = req.body || {};
    const tally = isTallyPayload(body) ? mapTallyPayload(body) : null;
    const validated = validateLeadPayload(tally || body);

    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const job = await Job.create({
        type: 'ingest-lead',
        brokerageId: brokerage._id,
        externalId: tally ? tally.externalId : '',
        payload: validated.payload,
      });

      return res.status(202).json({
        message: 'Lead accepted',
        jobId: String(job._id),
      });
    } catch (error) {
      if (error && error.code === 11000 && tally && tally.externalId) {
        const existing = await Job.findOne({
          brokerageId: brokerage._id,
          externalId: tally.externalId,
        });

        return res.status(202).json({
          message: 'Lead already accepted',
          jobId: existing ? String(existing._id) : '',
        });
      }

      throw error;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not accept the lead' });
  }
}

module.exports = {
  receiveLead,
};
