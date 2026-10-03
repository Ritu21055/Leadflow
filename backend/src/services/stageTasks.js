const Brokerage = require('../models/Brokerage');
const Task = require('../models/Task');
const User = require('../models/User');

function toPublicTask(task) {
  const lead = task.leadId && task.leadId.name ? task.leadId : null;
  const advisor = task.assignedAdvisor && task.assignedAdvisor.name ? task.assignedAdvisor : null;
  const overdue = task.status === 'open' && task.dueDate && new Date(task.dueDate).getTime() < Date.now();

  return {
    id: String(task._id),
    title: task.title,
    lead: lead
      ? { id: String(lead._id), name: lead.name }
      : { id: String(task.leadId), name: 'Lead' },
    assignedAdvisor: advisor
      ? { id: String(advisor._id), name: advisor.name }
      : null,
    dueDate: task.dueDate,
    status: task.status,
    overdue,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function createStageTasks(lead) {
  try {
    if (!lead || lead.duplicateOf) {
      return;
    }

    const brokerage = await Brokerage.findById(lead.brokerageId);

    if (!brokerage || !brokerage.stageTaskRules) {
      return;
    }

    const rules = brokerage.stageTaskRules.filter((rule) => rule.stage === lead.stage);

    for (const rule of rules) {
      const advisor = await User.findOne({
        _id: rule.assignedAdvisor,
        brokerageId: lead.brokerageId,
        role: 'advisor',
      }).select('_id');

      if (!advisor) {
        continue;
      }

      try {
        await Task.create({
          title: rule.title,
          leadId: lead._id,
          brokerageId: lead.brokerageId,
          assignedAdvisor: advisor._id,
          dueDate: new Date(Date.now() + rule.dueOffsetMinutes * 60 * 1000),
          status: 'open',
          taskKey: `${lead._id}:${lead.stage}:${lead.version}:${rule._id}`,
        });
      } catch (error) {
        if (error && error.code === 11000) {
          continue;
        }

        console.error('Could not create stage task:', error.message);
      }
    }
  } catch (error) {
    console.error('Could not create stage tasks:', error.message);
  }
}

module.exports = {
  toPublicTask,
  createStageTasks,
};
