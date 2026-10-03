const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['ingest-lead', 'check-document', 'send-email'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
    },
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      required() {
        return this.type === 'check-document';
      },
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      required() {
        return this.type === 'check-document' || this.type === 'send-email';
      },
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null,
      required() {
        return this.type === 'send-email';
      },
    },
    emailKey: {
      type: String,
      default: '',
    },
    externalId: {
      type: String,
      default: '',
    },
    payload: {
      name: { type: String, required: true },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      source: { type: String, required: true },
      assignedAdvisor: { type: String, default: '' },
      subject: { type: String, default: '' },
      body: { type: String, default: '' },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastError: {
      type: String,
      default: '',
    },
    runAt: {
      type: Date,
      default: Date.now,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, runAt: 1 });
jobSchema.index(
  { emailKey: 1 },
  { unique: true, partialFilterExpression: { emailKey: { $gt: '' } } }
);
jobSchema.index(
  { brokerageId: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $gt: '' } } }
);

module.exports = mongoose.model('Job', jobSchema);
