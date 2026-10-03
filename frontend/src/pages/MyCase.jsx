import { useEffect, useRef, useState } from 'react';
import { getCaseDocuments, getMyCase, uploadDocument } from '../api';
import { documentStatusLabel } from '../documentStatus';
import { connectSocket } from '../socket';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

export default function MyCase({ token, user }) {
  const [caseRecord, setCaseRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const caseIdRef = useRef('');

  caseIdRef.current = caseRecord ? caseRecord.id : '';

  useEffect(() => {
    let cancelled = false;

    getMyCase(token)
      .then((data) => {
        if (!cancelled) {
          setCaseRecord(data.case);
        }
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

      getMyCase(token)
        .then((data) => {
          setCaseRecord(data.case);
          return getCaseDocuments(token, data.case.id);
        })
        .then((data) => {
          if (data && data.documents) {
            setDocuments(data.documents);
          }
          setMessage('Reconnected — case refreshed');
        })
        .catch((err) => {
          setError(err.message);
        });
    });

    socket.on('document:status', (payload) => {
      const incoming = payload && payload.document;

      if (!incoming || !incoming.id || incoming.leadId !== caseIdRef.current) {
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
          if (incoming.leadId === caseIdRef.current) {
            setDocuments(data.documents);
          }
        })
        .catch((err) => {
          setError(err.message);
        });
    });

    socket.on('lead:stage', (payload) => {
      const lead = payload && payload.lead;

      if (!lead) {
        return;
      }

      setCaseRecord((current) => {
        if (!current || current.id !== lead.id) {
          return current;
        }

        return { ...current, ...lead, brokerageName: current.brokerageName };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!caseRecord) {
      return undefined;
    }

    let cancelled = false;

    getCaseDocuments(token, caseRecord.id)
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
  }, [token, caseRecord]);

  async function handleUpload(event) {
    event.preventDefault();
    setError('');

    if (!file) {
      setError('Choose a file to upload');
      return;
    }

    setUploading(true);

    try {
      const data = await uploadDocument(token, file);
      setDocuments((current) => [data.document, ...current]);
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="lede">Loading your case...</p>;
  }

  if (!caseRecord) {
    return (
      <section className="card">
        <h1>My Case</h1>
        <p className="error">{error || 'No case is linked to this account'}</p>
      </section>
    );
  }

  return (
    <>
    <section className="card">
      <p className="eyebrow">My Case</p>
      <h1>{caseRecord.name}</h1>
      {message ? <p className="notice">{message}</p> : null}
      <dl className="details">
        <div>
          <dt>Email</dt>
          <dd>{caseRecord.email || '—'}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{caseRecord.phone || '—'}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd><span className={`badge badge-${caseRecord.stage.toLowerCase().replaceAll(' ', '-')}`}>{caseRecord.stage}</span></dd>
        </div>
        <div>
          <dt>Advisor</dt>
          <dd>{caseRecord.assignedAdvisor ? caseRecord.assignedAdvisor.name : 'Unassigned'}</dd>
        </div>
        <div>
          <dt>Brokerage</dt>
          <dd>{caseRecord.brokerageName || user.brokerageName || '—'}</dd>
        </div>
      </dl>
    </section>

    <section className="card documents-panel" id="documents">
      <h2>Documents</h2>
      <p className="lede">Choose a file, then upload it to this case.</p>
      {error ? <p className="error">{error}</p> : null}
      <form className="upload-box" onSubmit={handleUpload}>
        <label className="file-picker">
          <span className="choose-file">Choose file</span>
          <input type="file" onChange={(event) => setFile(event.target.files[0] || null)} />
          <strong className="file-name">{file ? file.name : 'No file selected'}</strong>
        </label>
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
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
    </>
  );
}
