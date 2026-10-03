const mongoose = require('mongoose');

const STAGES = ['New', 'Contacted', 'Documents requested', 'In review', 'Won', 'Lost'];

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      trim: true,
      default: 'manual',
    },
    stage: {
      type: String,
      enum: STAGES,
      default: 'New',
    },
    assignedAdvisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

leadSchema.statics.STAGES = STAGES;

module.exports = mongoose.model('Lead', leadSchema);
