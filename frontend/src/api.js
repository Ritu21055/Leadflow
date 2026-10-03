const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getMe(token) {
  return request('/api/auth/me', { token });
}

export function getProtected(token) {
  return request('/api/test/protected', { token });
}

export function getTenantCheck(token) {
  return request('/api/test/tenant', { token });
}

export function getDashboard(token) {
  return request('/api/dashboard', { token });
}

export function getLeads(token) {
  return request('/api/leads', { token });
}

export function createLead(token, lead) {
  return request('/api/leads', {
    method: 'POST',
    token,
    body: lead,
  });
}

export function updateLead(token, id, lead) {
  return request(`/api/leads/${id}`, {
    method: 'PATCH',
    token,
    body: lead,
  });
}

export function updateLeadStage(token, id, stage, version) {
  return request(`/api/leads/${id}/stage`, {
    method: 'PATCH',
    token,
    body: { stage, version },
  });
}

export function convertLead(token, id) {
  return request(`/api/leads/${id}/convert`, {
    method: 'POST',
    token,
  });
}

export function getMyCase(token) {
  return request('/api/client/case', { token });
}

export function getCaseDocuments(token, leadId) {
  return request(`/api/documents/case/${leadId}`, { token });
}

export async function uploadDocument(token, file) {
  const body = new FormData();
  body.append('file', file);

  const response = await fetch(`${API_URL}/api/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getEmailTemplates(token) {
  return request('/api/email-templates', { token });
}

export function createEmailTemplate(token, template) {
  return request('/api/email-templates', {
    method: 'POST',
    token,
    body: template,
  });
}

export function updateEmailTemplate(token, id, template) {
  return request(`/api/email-templates/${id}`, {
    method: 'PATCH',
    token,
    body: template,
  });
}

export function deleteEmailTemplate(token, id) {
  return request(`/api/email-templates/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function getStageTemplates(token) {
  return request('/api/email-templates/stages', { token });
}

export function saveStageTemplates(token, stages) {
  return request('/api/email-templates/stages', {
    method: 'PUT',
    token,
    body: { stages },
  });
}

export function getTaskRules(token) {
  return request('/api/task-rules', { token });
}

export function createTaskRule(token, rule) {
  return request('/api/task-rules', {
    method: 'POST',
    token,
    body: rule,
  });
}

export function updateTaskRule(token, id, rule) {
  return request(`/api/task-rules/${id}`, {
    method: 'PATCH',
    token,
    body: rule,
  });
}

export function deleteTaskRule(token, id) {
  return request(`/api/task-rules/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function getTasks(token) {
  return request('/api/tasks', { token });
}

export function completeTask(token, id) {
  return request(`/api/tasks/${id}/complete`, {
    method: 'PATCH',
    token,
  });
}

export function deleteLead(token, id) {
  return request(`/api/leads/${id}`, {
    method: 'DELETE',
    token,
  });
}
