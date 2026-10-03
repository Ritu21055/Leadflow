const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
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
    assignedAdvisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'completed'],
      default: 'open',
    },
    taskKey: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

taskSchema.index(
  { taskKey: 1 },
  { unique: true, partialFilterExpression: { taskKey: { $gt: '' } } }
);

module.exports = mongoose.model('Task', taskSchema);
