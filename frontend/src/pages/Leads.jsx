import { useEffect, useRef, useState } from 'react';
import {
  convertLead,
  createLead,
  deleteLead,
  getCaseDocuments,
  getLeads,
  updateLead,
  updateLeadStage,
} from '../api';
import { documentStatusLabel } from '../documentStatus';
import { connectSocket } from '../socket';

const STAGES = ['New', 'Contacted', 'Documents requested', 'In review', 'Won', 'Lost'];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  source: 'manual',
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

export default function Leads({ token, role }) {
  const canMoveLeads = role === 'brokerage_admin' || role === 'advisor';
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [clientLogin, setClientLogin] = useState(null);
  const [documents, setDocuments] = useState([]);
  const selectedIdRef = useRef('');

  selectedIdRef.current = selectedId;

  const selected = leads.find((lead) => lead.id === selectedId) || null;

  async function loadLeads(preferredId) {
    const data = await getLeads(token);
    setLeads(data.leads);
    setSelectedId((current) => {
      if (preferredId && data.leads.some((lead) => lead.id === preferredId)) {
        return preferredId;
      }
      if (current && data.leads.some((lead) => lead.id === current)) {
        return current;
      }
      return data.leads[0] ? data.leads[0].id : '';
    });
  }

  useEffect(() => {
    let cancelled = false;

    getLeads(token)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setLeads(data.leads);
        setSelectedId(data.leads[0] ? data.leads[0].id : '');
      })
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

  useEffect(() => {
    const socket = connectSocket(token);
    let opened = false;

    socket.on('connect', () => {
      if (!opened) {
        opened = true;
        return;
      }

      getLeads(token)
        .then((data) => {
          setLeads(data.leads);
          setMessage('Reconnected — board refreshed');
          if (!selectedIdRef.current) {
            return null;
          }
          return getCaseDocuments(token, selectedIdRef.current);
        })
        .then((data) => {
          if (data && data.documents) {
            setDocuments(data.documents);
          }
        })
        .catch((err) => {
          setError(err.message);
        });
    });

    socket.on('document:status', (payload) => {
      const incoming = payload && payload.document;

      if (!incoming || !incoming.id || incoming.leadId !== selectedIdRef.current) {
        return;
      }

      setDocuments((current) => {
        if (!current.some((item) => item.id === incoming.id)) {
          return current;
        }

        return current.map((item) =>
          item.id === incoming.id
            ? { ...item, status: incoming.status, fileName: incoming.fileName }
            : item
        );
      });

      getCaseDocuments(token, incoming.leadId)
        .then((data) => {
          if (incoming.leadId === selectedIdRef.current) {
            setDocuments(data.documents);
          }
        })
        .catch((err) => {
          setError(err.message);
        });
    });

    socket.on('lead:stage', (payload) => {
      const lead = payload && payload.lead;

      if (!lead || !lead.id) {
        return;
      }

      setLeads((current) => {
        if (!current.some((item) => item.id === lead.id)) {
          return current;
        }

        return current.map((item) => (item.id === lead.id ? lead : item));
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!selected) {
      setDraft(EMPTY_FORM);
      return;
    }

    setDraft({
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
      source: selected.source,
    });
  }, [selected]);

  useEffect(() => {
    if (!selectedId) {
      setDocuments([]);
      return undefined;
    }

    let cancelled = false;

    getCaseDocuments(token, selectedId)
      .then((data) => {
        if (!cancelled) {
          setDocuments(data.documents);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  function updateForm(setter, event) {
    const { name, value } = event.target;
    setter((current) => ({ ...current, [name]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const data = await createLead(token, form);

      if (data.duplicate) {
        setMessage(data.message);
        await loadLeads(data.existingLead ? data.existingLead.id : '');
        return;
      }

      setForm(EMPTY_FORM);
      setMessage('Lead created');
      await loadLeads(data.lead.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setError('');
    setMessage('');
    setSaving(true);

    try {
      await updateLead(token, selected.id, draft);
      setMessage('Lead updated');
      await loadLeads(selected.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(lead, stage) {
    if (stage === lead.stage) {
      return;
    }

    setError('');
    setMessage('');
    setSaving(true);

    try {
      await updateLeadStage(token, lead.id, stage, lead.version);
      setMessage(`${lead.name} moved to ${stage}`);
      await loadLeads(lead.id);
    } catch (err) {
      setError(err.message);
      if (err.status === 409) {
        await loadLeads(lead.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert() {
    if (!selected) {
      return;
    }

    setError('');
    setMessage('');
    setClientLogin(null);
    setSaving(true);

    try {
      const data = await convertLead(token, selected.id);
      setClientLogin({
        name: data.client.name,
        email: data.client.email,
        temporaryPassword: data.temporaryPassword,
      });
      setMessage('Lead converted to a client. Save the temporary password now. It is shown only once.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) {
      return;
    }

    setError('');
    setMessage('');
    setSaving(true);

    try {
      await deleteLead(token, selected.id);
      setMessage('Lead deleted');
      await loadLeads('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="lede">Loading leads...</p>;
  }

  return (
    <>
      <section className="card">
        <h1>Leads</h1>
        <p className="lede">These are the leads for your brokerage. New leads start in the New stage.</p>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Name
            <input name="name" value={form.name} onChange={(event) => updateForm(setForm, event)} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={(event) => updateForm(setForm, event)} />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={(event) => updateForm(setForm, event)} />
          </label>
          <label>
            Source
            <input name="source" value={form.source} onChange={(event) => updateForm(setForm, event)} />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Create lead'}
          </button>
        </form>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      {clientLogin ? (
        <section className="notice">
          <strong>Client login</strong>
          <p>Name: {clientLogin.name}</p>
          <p>Email: {clientLogin.email}</p>
          <p>Temporary password: {clientLogin.temporaryPassword}</p>
        </section>
      ) : null}

      <section className="board">
        {STAGES.map((stage) => {
          const columnLeads = leads.filter((lead) => lead.stage === stage);

          return (
            <div className="column" key={stage}>
              <div className="column-head">
                <h2>{stage}</h2>
                <p className="column-count">{columnLeads.length}</p>
              </div>
              {columnLeads.length === 0 ? <p className="hint">None</p> : null}
              {columnLeads.map((lead) => (
                <article
                  key={lead.id}
                  className={lead.id === selectedId ? 'lead-card active' : 'lead-card'}
                  onClick={() => setSelectedId(lead.id)}
                >
                  <strong>{lead.name}</strong>
                  <span className="meta">{lead.email || 'No email'}</span>
                  <span className="meta">{lead.phone || 'No phone'}</span>
                  <span className="meta">Advisor · {lead.assignedAdvisor ? lead.assignedAdvisor.name : 'Unassigned'}</span>
                  {canMoveLeads ? (
                    <select
                      aria-label={`Move ${lead.name}`}
                      value={lead.stage}
                      disabled={saving}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => handleStageChange(lead, event.target.value)}
                    >
                      {STAGES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </article>
              ))}
            </div>
          );
        })}
      </section>

      {selected ? (
        <section className="card">
          <h2>Lead details</h2>
          <dl className="details">
            <div>
              <dt>Stage</dt>
              <dd><span className={`badge badge-${selected.stage.toLowerCase().replaceAll(' ', '-')}`}>{selected.stage}</span></dd>
            </div>
            <div>
              <dt>Advisor</dt>
              <dd>{selected.assignedAdvisor ? selected.assignedAdvisor.name : 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{selected.version}</dd>
            </div>
          </dl>
          <form onSubmit={handleUpdate}>
            <label>
              Name
              <input name="name" value={draft.name} onChange={(event) => updateForm(setDraft, event)} required />
            </label>
            <label>
              Email
              <input name="email" type="email" value={draft.email} onChange={(event) => updateForm(setDraft, event)} />
            </label>
            <label>
              Phone
              <input name="phone" value={draft.phone} onChange={(event) => updateForm(setDraft, event)} />
            </label>
            <label>
              Source
              <input name="source" value={draft.source} onChange={(event) => updateForm(setDraft, event)} />
            </label>
            <div className="actions">
              <button type="submit" disabled={saving}>
                Save changes
              </button>
              {canMoveLeads && selected.stage === 'Won' ? (
                <button type="button" onClick={handleConvert} disabled={saving}>
                  Convert to client
                </button>
              ) : null}
              <button type="button" className="danger" onClick={handleDelete} disabled={saving}>
                Delete lead
              </button>
            </div>
          </form>
          <h2>Documents</h2>
          {documents.length === 0 ? <p className="hint">No documents yet.</p> : null}
          {documents.length > 0 ? (
            <ul className="document-list">
              {documents.map((document) => (
                <li className="document-card" key={document.id}>
                  <div>
                    <strong>{document.fileName}</strong>
                    <span className="meta">{formatDate(document.createdAt)}</span>
                  </div>
                  <span className={`badge badge-${document.status}`}>{documentStatusLabel(document.status)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
