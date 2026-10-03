const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const leadRoutes = require('./routes/leadRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const clientRoutes = require('./routes/clientRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api', taskRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
