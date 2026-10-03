const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'checking', 'verified', 'failed'],
      default: 'uploaded',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
