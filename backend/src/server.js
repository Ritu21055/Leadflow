require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const attachSockets = require('./sockets');
const { startWorker } = require('./workers/processJobs');
const watchDocumentStatus = require('./sockets/watchDocumentStatus');
const watchTasks = require('./sockets/watchTasks');

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
    const io = attachSockets(server);
    app.set('io', io);
    watchDocumentStatus(io);
    watchTasks(io);

    if (process.env.NODE_ENV === 'production') {
      startWorker().catch((error) => {
        console.error('Worker failed to start:', error.message);
      });
    }
  })
  .catch((error) => {
    console.error('Failed to start API:', error.message);
    process.exit(1);
  });
