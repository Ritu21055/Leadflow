const Task = require('../models/Task');
const { toPublicTask } = require('../services/stageTasks');

function watchTasks(io) {
  const stream = Task.watch(
    [
      {
        $match: {
          $or: [
            { operationType: 'insert' },
            {
              operationType: 'update',
              'updateDescription.updatedFields.status': { $exists: true },
            },
          ],
        },
      },
    ],
    { fullDocument: 'updateLookup' }
  );

  stream.on('change', async (change) => {
    const document = change.fullDocument;

    if (!document || !document.brokerageId) {
      return;
    }

    const task = await Task.findById(document._id)
      .populate('leadId', 'name')
      .populate('assignedAdvisor', 'name');

    if (!task) {
      return;
    }

    const event = change.operationType === 'insert' ? 'task:created' : 'task:updated';

    io.to(`brokerage:${document.brokerageId}:tasks`).emit(event, {
      task: toPublicTask(task),
    });
  });

  stream.on('error', (error) => {
    console.error('Task watch failed:', error.message);
  });

  console.log('Watching task changes');
}

module.exports = watchTasks;
