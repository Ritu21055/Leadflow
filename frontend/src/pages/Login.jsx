import { useState } from 'react';
import { login } from '../api';

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await login(email, password);
      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark">LF</span>
          <div>
            <strong>LeadFlow</strong>
            <span>Mortgage CRM</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="lede">Access your brokerage pipeline, tasks, and client cases.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="you@brokerage.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="login-note">Demo credentials are available in the README.</p>
      </section>
    </main>
  );
}
