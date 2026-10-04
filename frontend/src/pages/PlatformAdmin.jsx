import { useEffect, useState } from 'react';
import { createBrokerage, createBrokerageAdmin, getBrokerages } from '../api';

const EMPTY_ADMIN = {
  name: '',
  email: '',
  password: '',
  brokerageId: '',
};

export default function PlatformAdmin({ token }) {
  const [brokerages, setBrokerages] = useState([]);
  const [brokerageName, setBrokerageName] = useState('');
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [loading, setLoading] = useState(true);
  const [savingBrokerage, setSavingBrokerage] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    getBrokerages(token)
      .then((data) => {
        if (!cancelled) {
          setBrokerages(data.brokerages);
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

  function updateAdmin(event) {
    const { name, value } = event.target;
    setAdminForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCreateBrokerage(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSavingBrokerage(true);

    try {
      const data = await createBrokerage(token, brokerageName);
      setBrokerages((current) =>
        [...current, data.brokerage].sort((a, b) => a.name.localeCompare(b.name))
      );
      setAdminForm((current) => ({ ...current, brokerageId: data.brokerage.id }));
      setBrokerageName('');
      setMessage(
        `${data.brokerage.name} was created. Copy this webhook secret now: ${data.webhookSecret}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBrokerage(false);
    }
  }

  async function handleCreateAdmin(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSavingAdmin(true);

    try {
      const data = await createBrokerageAdmin(token, adminForm);
      setAdminForm((current) => ({ ...EMPTY_ADMIN, brokerageId: current.brokerageId }));
      setMessage(`${data.user.name} can now sign in as the admin for ${data.user.brokerageName}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAdmin(false);
    }
  }

  return (
    <>
      <section className="card">
        <p className="eyebrow">Platform</p>
        <h1>Brokerages</h1>
        <p className="lede">Create a brokerage, then create its brokerage admin. This page does not show leads or client files.</p>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="notice">{message}</p> : null}
        {loading ? <p className="lede">Loading brokerages...</p> : null}
        {!loading && brokerages.length === 0 ? <p className="hint">No brokerages yet.</p> : null}
        {brokerages.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                </tr>
              </thead>
              <tbody>
                {brokerages.map((brokerage) => (
                  <tr key={brokerage.id}>
                    <td>{brokerage.name}</td>
                    <td>{brokerage.slug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2>Create brokerage</h2>
        <form onSubmit={handleCreateBrokerage}>
          <label>
            Brokerage name
            <input
              name="brokerageName"
              value={brokerageName}
              onChange={(event) => setBrokerageName(event.target.value)}
              placeholder="Harbor Mortgage"
              required
            />
          </label>
          <button type="submit" disabled={savingBrokerage}>
            {savingBrokerage ? 'Creating...' : 'Create brokerage'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Create brokerage admin</h2>
        <form onSubmit={handleCreateAdmin}>
          <label>
            Name
            <input name="name" value={adminForm.name} onChange={updateAdmin} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={adminForm.email} onChange={updateAdmin} required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={adminForm.password}
              onChange={updateAdmin}
              minLength={8}
              required
            />
          </label>
          <label>
            Brokerage
            <select name="brokerageId" value={adminForm.brokerageId} onChange={updateAdmin} required>
              <option value="">Select a brokerage</option>
              {brokerages.map((brokerage) => (
                <option key={brokerage.id} value={brokerage.id}>
                  {brokerage.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={savingAdmin || brokerages.length === 0}>
            {savingAdmin ? 'Creating...' : 'Create brokerage admin'}
          </button>
        </form>
      </section>
    </>
  );
}
