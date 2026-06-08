import React, { useState } from 'react';
import api from '../api';

export default function CreateTaskModal({ onClose, onCreated, projectId }) {
  const [form, setForm] = useState({ title: '', description: '', type: 'feature' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tasks', { ...form, projectId });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating task');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>➕ New Task</h3>
        <form onSubmit={submit}>
          <label>Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Task title" required />
          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description" rows={3} />
          <label>Type</label>
          <div className="type-selector">
            {['bug', 'feature', 'enhancement'].map(t => (
              <button key={t} type="button"
                className={`type-btn type-${t} ${form.type === t ? 'active' : ''}`}
                onClick={() => setForm({ ...form, type: t })}>
                {t === 'bug' ? '🐛' : t === 'feature' ? '✨' : '⚡'} {t}
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-create" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
