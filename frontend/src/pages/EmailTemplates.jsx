import { useEffect, useState } from 'react';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplates,
  getStageTemplates,
  saveStageTemplates,
  updateEmailTemplate,
} from '../api';

const STAGES = ['New', 'Contacted', 'Documents requested', 'In review', 'Won', 'Lost'];

const EMPTY_FORM = {
  name: '',
  subject: '',
  body: '',
};

function previewText(value) {
  return String(value || '')
    .replaceAll('{{clientName}}', 'Anna Keller')
    .replaceAll('{{advisorName}}', 'Northbridge Advisor');
}

export default function EmailTemplates({ token }) {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [stageLinks, setStageLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const [templateData, stageData] = await Promise.all([
      getEmailTemplates(token),
      getStageTemplates(token),
    ]);
    setTemplates(templateData.templates);
    const links = {};
    for (const stage of STAGES) {
      links[stage] = stageData.stages[stage] ? stageData.stages[stage].templateId : '';
    }
    setStageLinks(links);
  }

  useEffect(() => {
    let cancelled = false;

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
  }, [token]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(template) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setError('');
    setMessage('');
  }

  function cancelEdit() {
    setEditingId('');
    setForm(EMPTY_FORM);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await updateEmailTemplate(token, editingId, form);
        setMessage('Template updated');
      } else {
        await createEmailTemplate(token, form);
        setMessage('Template created');
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await deleteEmailTemplate(token, template.id);
      if (editingId === template.id) {
        cancelEdit();
      }
      setMessage('Template deleted');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStageSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const stages = {};
      for (const stage of STAGES) {
        stages[stage] = stageLinks[stage] || null;
      }
      await saveStageTemplates(token, stages);
      setMessage('Stage emails saved');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="lede">Loading email templates...</p>;
  }

  return (
    <>
      <section className="card">
        <p className="eyebrow">Email templates</p>
        <h1>{editingId ? 'Edit template' : 'New template'}</h1>
        <p className="lede">Use {'{{clientName}}'} and {'{{advisorName}}'} in the subject or body.</p>
        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <form onSubmit={handleSave}>
          <label>
            Name
            <input name="name" value={form.name} onChange={updateField} required />
          </label>
          <label>
            Subject
            <input name="subject" value={form.subject} onChange={updateField} required />
          </label>
          <label>
            Body
            <textarea name="body" value={form.body} onChange={updateField} required />
          </label>
          <div className="actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create template'}
            </button>
            {editingId ? (
              <button type="button" className="secondary" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Preview</h2>
        <p className="hint">Sample names are used here. The real email uses the lead and advisor.</p>
        <p><strong>{previewText(form.subject) || 'Subject preview'}</strong></p>
        <p className="lede">{previewText(form.body) || 'Body preview'}</p>
      </section>

      <section className="card">
        <h2>Templates</h2>
        {templates.length === 0 ? <p className="hint">No templates yet.</p> : null}
        <ul className="account-list">
          {templates.map((template) => (
            <li className="template-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span className="meta">{template.subject}</span>
              </div>
              <span className="actions">
                <button type="button" className="ghost btn-sm" onClick={() => startEdit(template)} disabled={saving}>
                  Edit
                </button>
                <button type="button" className="danger btn-sm" onClick={() => handleDelete(template)} disabled={saving}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Stage emails</h2>
        <p className="lede">When a lead enters a stage, the linked template is queued for sending.</p>
        <form onSubmit={handleStageSave}>
          {STAGES.map((stage) => (
            <label key={stage}>
              {stage}
              <select
                value={stageLinks[stage] || ''}
                onChange={(event) =>
                  setStageLinks((current) => ({ ...current, [stage]: event.target.value }))
                }
              >
                <option value="">No email</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="submit" disabled={saving}>
            Save stage emails
          </button>
        </form>
      </section>
    </>
  );
}
