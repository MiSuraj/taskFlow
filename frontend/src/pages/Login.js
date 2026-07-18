import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AmbientBackground from '../components/three/AmbientScene';
import useTilt from '../hooks/useTilt';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const tiltRef = useTilt();
  const [orgName, setOrgName]   = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(orgName.toLowerCase().trim(), username, password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <AmbientBackground variant="auth" />
      <div className="login-card" ref={tiltRef}>
        <div className="login-brand">
          <span className="lp-brand-icon">▦</span>
          <span>TaskFlow</span>
        </div>
        <h2>Welcome back</h2>
        <p className="login-tagline">Sign in to your organization</p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <input
              id="login-orgName"
              type="text"
              placeholder=" "
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              required
              autoFocus
            />
            <label htmlFor="login-orgName">Organization name</label>
          </div>
          <div className="login-field">
            <input
              id="login-username"
              type="text"
              placeholder=" "
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <label htmlFor="login-username">Username</label>
          </div>
          <div className="login-field">
            <input
              id="login-password"
              type="password"
              placeholder=" "
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label htmlFor="login-password">Password</label>
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
