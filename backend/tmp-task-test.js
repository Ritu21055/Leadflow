const fs = require('fs');
const API = 'http://localhost:5000';

function log(message) {
  fs.writeSync(1, `${message}\n`);
}

async function login(email) {
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${email} ${data.message}`);
  return data;
}

async function api(token, path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function main() {
  const admin = await login('admin.northbridge@leadflow.test');
  const advisor = await login('advisor.northbridge@leadflow.test');
  const south = await login('admin.southgate@leadflow.test');
  const client = await login('client.northbridge@leadflow.test');

  const rule = await api(admin.token, '/api/task-rules', {
    method: 'POST',
    body: JSON.stringify({
      stage: 'New',
      title: 'Call lead within 2 hours',
      assignedAdvisor: advisor.user.id,
      dueOffsetMinutes: 120,
      brokerageId: south.user.brokerageId,
    }),
  });
  log(`rule ${rule.status} ${rule.data.rule && rule.data.rule.title} advisor ${rule.data.rule && rule.data.rule.assignedAdvisor.name}`);

  const southRules = await api(south.token, '/api/task-rules');
  log(`south rules ${southRules.status} count ${southRules.data.rules && southRules.data.rules.length}`);
  log(`client rules ${(await api(client.token, '/api/task-rules')).status}`);
  log(`advisor rules ${(await api(advisor.token, '/api/task-rules')).status}`);

  const lead = await api(admin.token, '/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Task Demo',
      email: 'task-demo@example.com',
      phone: '5550177',
      source: 'manual',
    }),
  });
  log(`lead ${lead.status} stage ${lead.data.lead && lead.data.lead.stage}`);

  const tasks = await api(advisor.token, '/api/tasks');
  const created = tasks.data.tasks.filter((task) => task.lead && task.lead.name === 'Task Demo');
  const dueMs = created[0] ? new Date(created[0].dueDate).getTime() - Date.now() : 0;
  log(`advisor sees ${created.length} dueMinutes ${Math.round(dueMs / 60000)} status ${created[0] && created[0].status} overdue ${created[0] && created[0].overdue} advisor ${created[0] && created[0].assignedAdvisor.name}`);

  require('dotenv').config();
  const mongoose = require('mongoose');
  require('./src/models/User');
  const Lead = require('./src/models/Lead');
  const Task = require('./src/models/Task');
  const { createStageTasks } = require('./src/services/stageTasks');
  await mongoose.connect(process.env.MONGO_URI);
  const saved = await Lead.findById(lead.data.lead.id);
  await createStageTasks(saved);
  const count = await Task.countDocuments({ leadId: saved._id });
  log(`after second create ${count}`);

  const same = await api(admin.token, `/api/leads/${saved._id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'New', version: saved.version }),
  });
  log(`same stage ${same.status} tasks ${await Task.countDocuments({ leadId: saved._id })}`);

  const stale = await api(admin.token, `/api/leads/${saved._id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'Contacted', version: 1 }),
  });
  log(`stale ${stale.status} tasks ${await Task.countDocuments({ leadId: saved._id })}`);

  const completed = await api(admin.token, `/api/tasks/${created[0].id}/complete`, { method: 'PATCH' });
  log(`complete ${completed.status} ${completed.data.task && completed.data.task.status} overdue ${completed.data.task && completed.data.task.overdue}`);

  const other = await api(south.token, `/api/tasks/${created[0].id}/complete`, { method: 'PATCH' });
  log(`south complete ${other.status}`);
  const southTasks = await api(south.token, '/api/tasks');
  log(`south task count ${southTasks.data.tasks.length}`);
  log(`client tasks ${(await api(client.token, '/api/tasks')).status}`);

  const shortLead = await api(admin.token, '/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Overdue Demo',
      email: 'overdue-demo@example.com',
      phone: '5550178',
      source: 'manual',
    }),
  });
  const shortTask = await Task.findOne({ leadId: shortLead.data.lead.id });
  shortTask.dueDate = new Date(Date.now() - 60 * 1000);
  await shortTask.save();
  const listed = await api(admin.token, '/api/tasks');
  const overdue = listed.data.tasks.find((task) => task.lead && task.lead.name === 'Overdue Demo');
  log(`overdue flag ${overdue && overdue.overdue} status ${overdue && overdue.status}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  log(error.stack || error.message);
  process.exit(1);
});
