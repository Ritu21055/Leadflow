const mongoose = require('mongoose');

const brokerageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    webhookSecret: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    stageTemplates: {
      type: Map,
      of: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmailTemplate',
      },
      default: () => new Map(),
    },
    stageTaskRules: {
      type: [
        {
          stage: {
            type: String,
            enum: ['New', 'Contacted', 'Documents requested', 'In review', 'Won', 'Lost'],
            required: true,
          },
          title: {
            type: String,
            required: true,
            trim: true,
          },
          assignedAdvisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          dueOffsetMinutes: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      default: () => [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Brokerage', brokerageSchema);
