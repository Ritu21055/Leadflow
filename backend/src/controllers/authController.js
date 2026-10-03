const jwt = require('jsonwebtoken');
const Brokerage = require('../models/Brokerage');
const User = require('../models/User');

function brokerageIdOf(user) {
  if (!user.brokerageId) {
    return null;
  }

  return String(user.brokerageId._id || user.brokerageId);
}

function toPublicUser(user) {
  const brokerage = user.brokerageId && user.brokerageId.name ? user.brokerageId : null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    brokerageId: brokerageIdOf(user),
    brokerageName: brokerage ? brokerage.name : null,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      userId: String(user._id),
      role: user.role,
      brokerageId: brokerageIdOf(user),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

async function register(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = req.body.role;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    if (!User.ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    let brokerageId = null;

    if (req.user.role === 'brokerage_admin') {
      if (role !== 'advisor' && role !== 'client') {
        return res.status(403).json({
          message: 'Brokerage admins can only create advisors and clients',
        });
      }

      brokerageId = req.user.brokerageId;
    } else if (req.user.role === 'platform_admin') {
      if (role !== 'platform_admin') {
        brokerageId = req.body.brokerageId;

        if (!brokerageId) {
          return res.status(400).json({ message: 'brokerageId is required for this role' });
        }

        const brokerage = await Brokerage.findById(brokerageId);

        if (!brokerage) {
          return res.status(400).json({ message: 'Brokerage not found' });
        }
      }
    } else {
      return res.status(403).json({ message: 'You do not have permission to create users' });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      brokerageId,
    });

    await user.populate('brokerageId', 'name slug');

    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: 'Could not create the account' });
  }
}

async function login(req, res) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password').populate('brokerageId', 'name slug');

    if (!user) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }

    return res.json({
      token: signToken(user),
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not log in' });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.userId).populate('brokerageId', 'name slug');

    if (!user) {
      return res.status(401).json({ message: 'Account not found' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not load your account' });
  }
}

module.exports = {
  register,
  login,
  me,
};
