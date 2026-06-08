import React, { useState } from 'react';
import api from '../api';

const TYPE_COLORS   = { bug: '#e74c3c', feature: '#3498db', enhancement: '#2ecc71' };
const TYPE_ICONS    = { bug: '🐛', feature: '✨', enhancement: '⚡' };
const STATUS_COLORS = { todo: '#95a5a6', 'in-progress': '#f39c12', 'in-qa': '#9b59b6', done: '#10b981' };

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, `${s}s`].filter(Boolean).join(' ');
}

function LiveTimer({ timeLogs, totalTime }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const last = timeLogs?.[timeLogs.length - 1];
    if (!last || last.endedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(last.startedAt)) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeLogs]);
  const total = totalTime + elapsed;
  if (total === 0) return null;
  return <span className="timer">⏱ {formatTime(total)}</span>;
}

export default function TaskCard({ task, currentUser, onUpdate, onDelete, index, isGlobalQueue, users = [] }) {
  const [moving,      setMoving]      = useState(false);
  const [assigning,   setAssigning]   = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const call = async (fn) => {
    setMoving(true);
    try { await fn(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setMoving(false); }
  };

  const pick      = () => call(async () => { const { data } = await api.patch(`/tasks/${task._id}/pick`);                      onUpdate(data); });
  const qaPick    = () => call(async () => { const { data } = await api.patch(`/tasks/${task._id}/qa-pick`);                   onUpdate(data); });
  const moveStatus = (status) => call(async () => { const { data } = await api.patch(`/tasks/${task._id}/status`, { status }); onUpdate(data); });
  const assignTo  = (userId) => { if (!userId) return; call(async () => { const { data } = await api.patch(`/tasks/${task._id}/assign`, { userId }); onUpdate(data); setAssigning(false); }); };

  const submitComment = async (isRejection) => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tasks/${task._id}/comments`, { text: commentText, isRejection });
      onUpdate(data);
      setCommentText('');
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const isDevOwner = task.assignedTo?._id === currentUser.id || task.assignedTo?.id === currentUser.id;
  const isQAOwner  = task.qaAssignedTo?._id === currentUser.id || task.qaAssignedTo?.id === currentUser.id;
  const isManager  = currentUser.role === 'manager';
  const isAdmin    = currentUser.role === 'admin';
  const isDev      = currentUser.role === 'developer';
  const isQA       = currentUser.role === 'qa';

  const canComment = isDevOwner || isQAOwner || isManager || isAdmin;

  return (
    <div className="task-card" style={{ borderLeft: `4px solid ${TYPE_COLORS[task.type]}` }}>
      <div className="task-card-header">
        <span className="queue-num">#{index + 1}</span>
        <span className="task-type-badge" style={{ background: TYPE_COLORS[task.type] }}>
          {TYPE_ICONS[task.type]} {task.type}
        </span>
        <span className="task-status-badge" style={{ background: STATUS_COLORS[task.status] }}>
          {task.status}
        </span>
        {task.rejectionCount > 0 && (
          <span className="rejection-badge">🔴 {task.rejectionCount} reject{task.rejectionCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      <h4 className="task-title">{task.title}</h4>
      {task.description && <p className="task-desc">{task.description}</p>}
      {task.project?.name && <span className="task-project">📁 {task.project.name}</span>}

      <div className="task-meta">
        <span>👤 {task.createdBy?.username}</span>
        {task.assignedTo   && <span>💻 {task.assignedTo?.username}</span>}
        {task.qaAssignedTo && <span>🔍 {task.qaAssignedTo?.username}</span>}
        <LiveTimer timeLogs={task.timeLogs} totalTime={task.totalTime} />
      </div>

      <div className="task-actions">
        {isGlobalQueue && !task.assignedTo && (isDev || isManager) && (
          <>
            <button className="btn btn-pick" onClick={pick} disabled={moving}>Pick</button>
            {isManager && (!assigning ? (
              <button className="btn btn-assign" onClick={() => setAssigning(true)} disabled={moving}>Assign To</button>
            ) : (
              <select className="assign-select" defaultValue="" onChange={e => assignTo(e.target.value)}
                disabled={moving} autoFocus onBlur={() => setAssigning(false)}>
                <option value="" disabled>Select user…</option>
                {users.filter(u => u.role === 'developer').map(u => (
                  <option key={u._id} value={u._id}>{u.username}</option>
                ))}
              </select>
            ))}
          </>
        )}
        {isDevOwner && task.status === 'in-progress' && (
          <button className="btn btn-qa" onClick={() => moveStatus('in-qa')} disabled={moving}>→ QA</button>
        )}
        {isQA && task.status === 'in-qa' && !task.qaAssignedTo && (
          <button className="btn btn-pick" onClick={qaPick} disabled={moving}>Pick for QA</button>
        )}
        {(isQAOwner || isManager) && task.status === 'in-qa' && (
          <>
            <button className="btn btn-done" onClick={() => moveStatus('done')} disabled={moving}>✓ Done</button>
            <button className="btn btn-progress" onClick={() => moveStatus('in-progress')} disabled={moving}>↩ Back</button>
          </>
        )}
        {isDevOwner && task.status === 'in-qa' && !isQAOwner && (
          <button className="btn btn-progress" onClick={() => moveStatus('in-progress')} disabled={moving}>↩ Back</button>
        )}
        {(isManager || isQA) && (
          <button className="btn btn-delete" onClick={() => onDelete(task._id)}>🗑</button>
        )}
        {canComment && (
          <button className="btn btn-comment" onClick={() => setShowComments(v => !v)}>
            💬 {task.comments?.length || 0}
          </button>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="comments-section">
          <div className="comments-list">
            {(task.comments || []).length === 0 && <p className="no-comments">No comments yet.</p>}
            {(task.comments || []).map((c, i) => (
              <div key={i} className={`comment-item ${c.isRejection ? 'comment-rejection' : ''}`}>
                <div className="comment-header">
                  <span className="comment-author">{c.author?.username || 'unknown'}</span>
                  {c.isRejection && <span className="rejection-tag">🔴 Rejected</span>}
                  <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="comment-text">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="comment-input-row">
            <textarea
              className="comment-input"
              placeholder="Add a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={2}
            />
            <div className="comment-btns">
              <button className="btn btn-comment-submit" onClick={() => submitComment(false)} disabled={submitting || !commentText.trim()}>
                💬 Comment
              </button>
              {(isQAOwner || isManager) && task.status === 'in-qa' && (
                <button className="btn btn-reject" onClick={() => submitComment(true)} disabled={submitting || !commentText.trim()}>
                  🔴 Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
