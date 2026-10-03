const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ROLES = ['platform_admin', 'brokerage_admin', 'advisor', 'client'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index(
  { leadId: 1 },
  { unique: true, partialFilterExpression: { leadId: { $type: 'objectId' } } }
);

userSchema.path('brokerageId').validate(function validateBrokerage(value) {
  if (this.role === 'platform_admin') {
    return value == null;
  }

  return value != null;
}, 'Brokerage users must belong to a brokerage. Platform admins must not.');

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
