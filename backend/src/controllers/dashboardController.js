const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function getDashboard(req, res) {
  try {
    const grouped = await Lead.aggregate([
      {
        $match: {
          brokerageId: new mongoose.Types.ObjectId(req.brokerageId),
          duplicateOf: null,
        },
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    for (const stage of Lead.STAGES) {
      counts[stage] = 0;
    }

    for (const row of grouped) {
      if (Object.prototype.hasOwnProperty.call(counts, row._id)) {
        counts[row._id] = row.count;
      }
    }

    const total = Lead.STAGES.reduce((sum, stage) => sum + counts[stage], 0);

    res.json({ total, counts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load the dashboard' });
  }
}

module.exports = {
  getDashboard,
};
