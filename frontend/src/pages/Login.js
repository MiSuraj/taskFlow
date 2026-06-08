import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [orgName, setOrgName]   = useState(localStorage.getItem('tenantSlug') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(orgName.toLowerCase().trim(), username, password); }
    catch (err) { setError(err.response?.data?.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <span className="lp-brand-icon">▦</span>
          <span>TaskFlow</span>
        </div>
        <h2>Welcome back</h2>
        <p className="login-tagline">Sign in to your organization</p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Organization name</label>
            <input
              type="text"
              placeholder="e.g. acme-corp"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p className="login-help">
          New here? <Link to="/register-organization">Create an organization</Link>
        </p>
      </div>
    </div>
  );
}
