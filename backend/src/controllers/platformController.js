const crypto = require('crypto');
const Brokerage = require('../models/Brokerage');
const User = require('../models/User');

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPublicBrokerage(brokerage) {
  return {
    id: String(brokerage._id),
    name: brokerage.name,
    slug: brokerage.slug,
    createdAt: brokerage.createdAt,
  };
}

async function listBrokerages(req, res) {
  try {
    const brokerages = await Brokerage.find().sort({ name: 1 });
    return res.json({ brokerages: brokerages.map(toPublicBrokerage) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not load brokerages' });
  }
}

async function createBrokerage(req, res) {
  try {
    const name = text(req.body.name);
    const slug = slugFromName(name);

    if (!name || !slug) {
      return res.status(400).json({ message: 'Brokerage name is required' });
    }

    const brokerage = await Brokerage.create({
      name,
      slug,
      webhookSecret: crypto.randomBytes(24).toString('hex'),
    });

    return res.status(201).json({
      brokerage: toPublicBrokerage(brokerage),
      webhookSecret: brokerage.webhookSecret,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A brokerage with this name already exists' });
    }

    console.error(error);
    return res.status(500).json({ message: 'Could not create the brokerage' });
  }
}

async function createBrokerageAdmin(req, res) {
  try {
    const name = text(req.body.name);
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const brokerageId = text(req.body.brokerageId);

    if (!name || !email || !password || !brokerageId) {
      return res.status(400).json({ message: 'Name, email, password, and brokerage are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const brokerage = await Brokerage.findById(brokerageId);

    if (!brokerage) {
      return res.status(400).json({ message: 'Brokerage not found' });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'brokerage_admin',
      brokerageId: brokerage._id,
    });

    return res.status(201).json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        brokerageId: String(user.brokerageId),
        brokerageName: brokerage.name,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Brokerage not found' });
    }

    console.error(error);
    return res.status(500).json({ message: 'Could not create the brokerage admin' });
  }
}

module.exports = {
  listBrokerages,
  createBrokerage,
  createBrokerageAdmin,
};
