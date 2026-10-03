const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
