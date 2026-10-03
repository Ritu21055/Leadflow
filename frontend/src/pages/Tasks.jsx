import { useEffect, useState } from 'react';
import {
  completeTask,
  createTaskRule,
  deleteTaskRule,
  getTaskRules,
  getTasks,
  updateTaskRule,
} from '../api';
import { connectSocket } from '../socket';

const STAGES = ['New', 'Contacted', 'Documents requested', 'In review', 'Won', 'Lost'];

const EMPTY_RULE = {
  stage: 'New',
  title: '',
  assignedAdvisor: '',
  amount: '2',
  unit: 'hours',
};

function minutesFromForm(amount, unit) {
  const value = Number(amount);

  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  const minutes = unit === 'hours' ? value * 60 : value;
  return minutes >= 1 ? minutes : null;
}

function formFromRule(rule) {
  const wholeHours = rule.dueOffsetMinutes % 60 === 0;

  return {
    stage: rule.stage,
    title: rule.title,
    assignedAdvisor: rule.assignedAdvisor.id,
    amount: String(wholeHours ? rule.dueOffsetMinutes / 60 : rule.dueOffsetMinutes),
    unit: wholeHours ? 'hours' : 'minutes',
  };
}

function dueLabel(minutes) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function formatWhen(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function isOverdue(task, now) {
  return task.status === 'open' && new Date(task.dueDate).getTime() < now;
}

export default function Tasks({ token, user }) {
  const isAdmin = user.role === 'brokerage_admin';
  const [tasks, setTasks] = useState([]);
  const [rules, setRules] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [editingRuleId, setEditingRuleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  function applyTask(incoming) {
    if (!incoming || !incoming.id) {
      return;
    }

    setTasks((current) => {
      const exists = current.some((task) => task.id === incoming.id);

      if (!exists) {
        return [...current, incoming].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      }

      return current.map((task) => (task.id === incoming.id ? { ...task, ...incoming } : task));
    });
  }

  async function loadTasks() {
    const data = await getTasks(token);
    setTasks(data.tasks);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const taskData = await getTasks(token);
      if (cancelled) {
        return;
      }
      setTasks(taskData.tasks);

      if (!isAdmin) {
        return;
      }

      const ruleData = await getTaskRules(token);
      if (cancelled) {
        return;
      }
      setRules(ruleData.rules);
      setAdvisors(ruleData.advisors);
      setRuleForm((current) => ({
        ...current,
        assignedAdvisor: current.assignedAdvisor || (ruleData.advisors[0] ? ruleData.advisors[0].id : ''),
      }));
    }

    load()
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, isAdmin]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = connectSocket(token);
    let opened = false;

    socket.on('connect', () => {
      if (!opened) {
        opened = true;
        return;
      }

      loadTasks()
        .then(() => setMessage('Reconnected — tasks refreshed'))
        .catch((err) => setError(err.message));
    });

    socket.on('task:created', (payload) => applyTask(payload && payload.task));
    socket.on('task:updated', (payload) => applyTask(payload && payload.task));

    return () => {
      socket.disconnect();
    };
  }, [token]);

  function updateRuleField(event) {
    const { name, value } = event.target;
    setRuleForm((current) => ({ ...current, [name]: value }));
  }

  async function handleRuleSave(event) {
    event.preventDefault();
    const dueOffsetMinutes = minutesFromForm(ruleForm.amount, ruleForm.unit);

    if (!dueOffsetMinutes) {
      setError('Due time must be at least 1 minute');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const body = {
      stage: ruleForm.stage,
      title: ruleForm.title,
      assignedAdvisor: ruleForm.assignedAdvisor,
      dueOffsetMinutes,
    };

    try {
      if (editingRuleId) {
        await updateTaskRule(token, editingRuleId, body);
        setMessage('Task rule updated');
      } else {
        await createTaskRule(token, body);
        setMessage('Task rule saved');
      }
      const ruleData = await getTaskRules(token);
      setRules(ruleData.rules);
      setEditingRuleId('');
      setRuleForm({
        ...EMPTY_RULE,
        assignedAdvisor: ruleForm.assignedAdvisor,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rule) {
    setEditingRuleId(rule.id);
    setRuleForm(formFromRule(rule));
    setError('');
    setMessage('');
  }

  async function handleDeleteRule(rule) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await deleteTaskRule(token, rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      if (editingRuleId === rule.id) {
        setEditingRuleId('');
        setRuleForm({ ...EMPTY_RULE, assignedAdvisor: ruleForm.assignedAdvisor });
      }
      setMessage('Task rule deleted');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task) {
    setSaving(true);
    setError('');

    try {
      const data = await completeTask(token, task.id);
      applyTask(data.task);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="lede">Loading tasks...</p>;
  }

  return (
    <>
      {isAdmin ? (
        <section className="card">
          <p className="eyebrow">Task rules</p>
          <h1>{editingRuleId ? 'Edit task rule' : 'New task rule'}</h1>
          <p className="lede">When a lead enters a stage, these tasks are created automatically.</p>
          {message ? <p className="notice">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <form onSubmit={handleRuleSave}>
            <label>
              Stage
              <select name="stage" value={ruleForm.stage} onChange={updateRuleField}>
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Task title
              <input name="title" value={ruleForm.title} onChange={updateRuleField} required />
            </label>
            <label>
              Assigned advisor
              <select name="assignedAdvisor" value={ruleForm.assignedAdvisor} onChange={updateRuleField} required>
                {advisors.length === 0 ? <option value="">No advisors</option> : null}
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due in
              <span className="due-fields">
                <input name="amount" type="number" min="0" value={ruleForm.amount} onChange={updateRuleField} required />
                <select name="unit" value={ruleForm.unit} onChange={updateRuleField}>
                  <option value="hours">hours</option>
                  <option value="minutes">minutes</option>
                </select>
              </span>
            </label>
            <div className="actions">
              <button type="submit" disabled={saving || advisors.length === 0}>
                {saving ? 'Saving...' : editingRuleId ? 'Save rule' : 'Save rule'}
              </button>
              {editingRuleId ? (
                <button
                  type="button"
                  className="secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditingRuleId('');
                    setRuleForm({ ...EMPTY_RULE, assignedAdvisor: ruleForm.assignedAdvisor });
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          <ul className="account-list">
            {rules.length === 0 ? <li>No task rules yet.</li> : null}
            {rules.map((rule) => (
              <li key={rule.id}>
                <span>
                  {rule.stage}: {rule.title} · {rule.assignedAdvisor.name} · due in {dueLabel(rule.dueOffsetMinutes)}
                </span>
                <span className="actions">
                  <button type="button" className="ghost" onClick={() => startEdit(rule)} disabled={saving}>
                    Edit
                  </button>
                  <button type="button" className="danger btn-sm" onClick={() => handleDeleteRule(rule)} disabled={saving}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <p className="eyebrow">Tasks</p>
        <h1>Brokerage tasks</h1>
        {!isAdmin && message ? <p className="notice">{message}</p> : null}
        {!isAdmin && error ? <p className="error">{error}</p> : null}
        {tasks.length === 0 ? <p className="hint">No tasks yet.</p> : null}
        <ul className="task-list">
          {tasks.map((task) => {
            const overdue = isOverdue(task, now);
            const canComplete =
              task.status === 'open' &&
              (isAdmin || (task.assignedAdvisor && task.assignedAdvisor.id === user.id));

            return (
              <li
                key={task.id}
                className={overdue ? 'task-row overdue' : task.status === 'completed' ? 'task-row completed' : 'task-row'}
              >
                <div className="task-main">
                  <strong>{task.title}</strong>
                  <span className="meta">{task.lead ? task.lead.name : 'Lead'}</span>
                </div>
                <div className="task-meta">
                  <span>Advisor · {task.assignedAdvisor ? task.assignedAdvisor.name : 'Unassigned'}</span>
                  <span className="meta">Due {formatWhen(task.dueDate)}</span>
                </div>
                <div className="actions">
                  <span className={`badge ${overdue ? 'badge-overdue' : `badge-${task.status}`}`}>
                    {overdue ? 'Overdue' : task.status === 'completed' ? 'Completed' : 'Open'}
                  </span>
                  {canComplete ? (
                    <button type="button" className="btn-sm" onClick={() => handleComplete(task)} disabled={saving}>
                      Mark completed
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
