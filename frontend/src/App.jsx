import { useEffect, useState } from 'react';
import { getMe, getProtected, getTenantCheck } from './api';
import Dashboard from './pages/Dashboard';
import EmailTemplates from './pages/EmailTemplates';
import Leads from './pages/Leads';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import MyCase from './pages/MyCase';

const TOKEN_KEY = 'leadflow_token';

const ROLE_LABELS = {
  platform_admin: 'Platform Admin',
  brokerage_admin: 'Brokerage Admin',
  advisor: 'Advisor',
  client: 'Client',
};

const ICONS = {
  dashboard: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
  leads: 'M4 7h16M4 12h16M4 17h10',
  tasks: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  templates: 'M5 5h14v14H5zM8 9h8M8 13h5',
  account: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8a7 7 0 0 1 14 0',
  logout: 'M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2M15 12H3m0 0 3-3m-3 3 3 3',
  menu: 'M4 7h16M4 12h16M4 17h16',
};

function Icon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [checkResult, setCheckResult] = useState('');
  const [checkError, setCheckError] = useState('');
  const [view, setView] = useState('account');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    getMe(token)
      .then((data) => {
        if (!cancelled) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken('');
          setUser(null);
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

  function handleLogin(nextToken, nextUser) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setLoading(false);
    setCheckResult('');
    setCheckError('');
    setView('account');
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    setCheckResult('');
    setCheckError('');
    setMenuOpen(false);
  }

  function openView(nextView) {
    setView(nextView);
    setMenuOpen(false);
  }

  async function runCheck(request) {
    setCheckResult('');
    setCheckError('');

    try {
      const data = await request(token);
      setCheckResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setCheckError(error.message);
    }
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <p>Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return <Login onSuccess={handleLogin} />;
  }

  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const navItems = user.role === 'client'
    ? []
    : [
        user.brokerageId ? ['dashboard', 'Dashboard'] : null,
        ['leads', 'Leads'],
        user.role === 'brokerage_admin' || user.role === 'advisor' ? ['tasks', 'Tasks'] : null,
        user.role === 'brokerage_admin' ? ['email', 'Templates'] : null,
        ['account', 'Account'],
      ].filter(Boolean);

  return (
    <div className="shell">
      {menuOpen ? <button type="button" className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark">LF</span>
          <div>
            <strong>LeadFlow</strong>
            <span>Mortgage CRM</span>
          </div>
        </div>
        <nav className="nav">
          {user.role === 'client' ? (
            <button type="button" className="active">
              <Icon name="leads" />
              My Case
            </button>
          ) : (
            navItems.map(([id, label]) => (
              <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => openView(id)}>
                <Icon name={id === 'email' ? 'templates' : id} />
                {label}
              </button>
            ))
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <strong>{user.name}</strong>
            <span>{roleLabel}</span>
          </div>
          <button type="button" onClick={handleLogout}>
            <Icon name="logout" />
            Log out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button type="button" className="menu-button ghost" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" />
            Menu
          </button>
          <strong>{user.brokerageName || 'LeadFlow'}</strong>
          <span className="topbar-user">{user.email}</span>
        </header>
        <main className="content">
          {user.role === 'client' ? <MyCase token={token} user={user} /> : null}

          {user.role !== 'client' && view === 'dashboard' && user.brokerageId ? <Dashboard token={token} /> : null}

          {user.role !== 'client' && view === 'email' && user.role === 'brokerage_admin' ? (
            <EmailTemplates token={token} />
          ) : null}

          {user.role !== 'client' && view === 'tasks' && (user.role === 'brokerage_admin' || user.role === 'advisor') ? (
            <Tasks token={token} user={user} />
          ) : null}

          {user.role !== 'client' && view === 'leads' ? (
            user.brokerageId ? (
              <Leads token={token} role={user.role} />
            ) : (
              <section className="card">
                <h1>Leads</h1>
                <p className="lede">Platform admins are not inside a brokerage, so they do not have leads.</p>
              </section>
            )
          ) : null}

          {user.role !== 'client' && view === 'account' ? (
            <section className="card">
              <p className="eyebrow">Account</p>
              <h1>{user.name}</h1>
              <dl className="details">
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{roleLabel}</dd>
                </div>
                <div>
                  <dt>Brokerage</dt>
                  <dd>{user.brokerageName || 'None (platform account)'}</dd>
                </div>
                <div>
                  <dt>Brokerage id</dt>
                  <dd>{user.brokerageId || '—'}</dd>
                </div>
              </dl>

              <div className="actions">
                <button type="button" onClick={() => runCheck(getProtected)}>
                  Call protected route
                </button>
                <button type="button" className="secondary" onClick={() => runCheck(getTenantCheck)}>
                  Call brokerage route
                </button>
              </div>

              {checkError ? <p className="error">{checkError}</p> : null}
              {checkResult ? <pre>{checkResult}</pre> : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
