import React, { useEffect, useState } from 'react';
import api from '../api';

const TYPE_ICONS = { bug: '🐛', feature: '✨', enhancement: '⚡' };
const TYPE_COLORS = { bug: '#e74c3c', feature: '#3b82f6', enhancement: '#10b981' };

export default function AITaskGenerator({ projectId, projectName, onTasksAdded }) {
  const [aiStatus, setAiStatus]       = useState(null);  // { enabled, provider, model, keyConfigured }
  const [prompt, setPrompt]           = useState('');
  const [generatedTasks, setGenerated] = useState([]);
  const [selected, setSelected]       = useState({});
  const [loading, setLoading]         = useState(false);
  const [adding, setAdding]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    api.get('/ai/ai-status').then(({ data }) => setAiStatus(data)).catch(() => {});
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    setError(''); setGenerated([]); setSelected({});
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-tasks', { prompt, projectId });
      setGenerated(data.tasks);
      const sel = {};
      data.tasks.forEach((_, i) => { sel[i] = true; });
      setSelected(sel);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate tasks');
    } finally { setLoading(false); }
  };

  const toggleAll = (val) => {
    const sel = {};
    generatedTasks.forEach((_, i) => { sel[i] = val; });
    setSelected(sel);
  };

  const addSelected = async () => {
    const tasks = generatedTasks.filter((_, i) => selected[i]);
    if (!tasks.length) return;
    setAdding(true);
    try {
      await Promise.all(tasks.map(t =>
        api.post('/tasks', { title: t.title, description: t.description, type: t.type, projectId })
      ));
      onTasksAdded();
      setGenerated([]); setSelected({}); setPrompt('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add tasks');
    } finally { setAdding(false); }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  // ── Loading state ──
  if (!aiStatus) {
    return <div className="ai-status-loading">Checking AI configuration…</div>;
  }

  // ── AI not enabled ──
  if (!aiStatus.enabled) {
    return (
      <div className="ai-gate">
        <div className="ai-gate-icon">🤖</div>
        <h3>AI task generation is not enabled</h3>
        <p>Ask your organization admin to enable AI from the <strong>Admin Panel → Settings</strong>.</p>
      </div>
    );
  }

  // ── AI enabled but key not set by admin ──
  if (!aiStatus.keyConfigured) {
    return (
      <div className="ai-gate">
        <div className="ai-gate-icon">🔑</div>
        <h3>API key not configured</h3>
        <p>AI is enabled on your plan but the admin hasn't added the API key yet.</p>
        <p>Ask your admin to go to <strong>Admin Panel → Settings → AI Configuration</strong> and paste the {aiStatus.provider || 'AI'} key.</p>
      </div>
    );
  }

  // ── Ready ──
  return (
    <div className="ai-generator">
      <div className="ai-generator-header">
        <div>
          <h3>🤖 AI Task Generator</h3>
          <p className="ai-generator-sub">
            Project: <strong>{projectName}</strong> &nbsp;·&nbsp;
            Model: <span className="ai-model-badge">{aiStatus.model}</span>
          </p>
        </div>
      </div>

      <form onSubmit={generate} className="ai-config">
        <textarea
          className="ai-prompt"
          rows={5}
          placeholder={`Describe what you want to build or fix…\n\ne.g. Build a user authentication system with email verification, password reset, and role-based access control.`}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-create ai-generate-btn" type="submit" disabled={loading}>
          {loading ? '⏳ Generating…' : '✨ Generate Tasks'}
        </button>
      </form>

      {generatedTasks.length > 0 && (
        <div className="ai-results">
          <div className="ai-results-header">
            <span>📋 {generatedTasks.length} tasks generated — pick what to add:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-xs" onClick={() => toggleAll(true)}>All</button>
              <button className="btn btn-xs btn-cancel" onClick={() => toggleAll(false)}>None</button>
            </div>
          </div>
          <div className="ai-task-list">
            {generatedTasks.map((task, i) => (
              <label key={i} className={`ai-task-item ${selected[i] ? 'selected' : ''}`}>
                <input type="checkbox" checked={!!selected[i]}
                  onChange={() => setSelected(s => ({ ...s, [i]: !s[i] }))} />
                <span className="ai-task-type"
                  style={{ color: TYPE_COLORS[task.type] }}>
                  {TYPE_ICONS[task.type]} {task.type}
                </span>
                <div className="ai-task-body">
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="ai-add-row">
            <span className="ai-count">{selectedCount} of {generatedTasks.length} selected</span>
            <button className="btn btn-create" onClick={addSelected}
              disabled={adding || selectedCount === 0}>
              {adding ? '⏳ Adding…' : `➕ Add ${selectedCount} Task${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
