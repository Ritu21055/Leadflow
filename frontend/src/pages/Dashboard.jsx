import { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import { connectSocket } from '../socket';

const STAGES = ['New', 'Contacted', 'Documents requested', 'In review', 'Won', 'Lost'];

const EMPTY_COUNTS = {
  New: 0,
  Contacted: 0,
  'Documents requested': 0,
  'In review': 0,
  Won: 0,
  Lost: 0,
};

export default function Dashboard({ token }) {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function applyDashboard(data) {
    setCounts({ ...EMPTY_COUNTS, ...data.counts });
    setTotal(data.total);
  }

  useEffect(() => {
    let cancelled = false;

    getDashboard(token)
      .then((data) => {
        if (!cancelled) {
          applyDashboard(data);
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

    function refresh(notice) {
      getDashboard(token)
        .then((data) => {
          applyDashboard(data);
          if (notice) {
            setMessage(notice);
          }
        })
        .catch((err) => {
          setError(err.message);
        });
    }

    socket.on('connect', () => {
      if (!opened) {
        opened = true;
        return;
      }

      refresh('Reconnected — dashboard refreshed');
    });

    socket.on('lead:stage', (payload) => {
      if (!payload || !payload.lead) {
        return;
      }

      refresh('');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  if (loading) {
    return <p className="lede">Loading dashboard...</p>;
  }

  const widest = Math.max(total, 1);

  return (
    <div className="page-stack">
      <header>
        <p className="eyebrow">Dashboard</p>
        <h1>Pipeline overview</h1>
        <p className="lede">Active leads in your brokerage, counted by stage.</p>
        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </header>
      <section className="stat-grid">
        <article className="stat-card stat-card-total">
          <span>Total active leads</span>
          <strong>{total}</strong>
        </article>
        {STAGES.map((stage) => (
          <article className="stat-card" key={stage}>
            <span>{stage}</span>
            <strong>{counts[stage]}</strong>
          </article>
        ))}
      </section>
      <section className="card">
        <h2>Stage distribution</h2>
        <div className="pipeline">
          {STAGES.map((stage) => (
            <div className="pipeline-row" key={stage}>
              <span>{stage}</span>
              <span className="pipeline-track">
                <span className="pipeline-fill" style={{ width: `${(counts[stage] / widest) * 100}%` }} />
              </span>
              <strong>{counts[stage]}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
