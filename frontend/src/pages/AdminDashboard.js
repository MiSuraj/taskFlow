import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const RESERVED = [
  { name: 'manager', color: '#f59e0b', icon: '👔' },
];

const PRESET_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];

export default function AdminDashboard({ allTasks, onTaskDelete }) {
  const { tenant, updateTenant } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [users, setUsers]         = useState([]);
  const [tab, setTab]             = useState('projects');
  const [selected, setSelected]   = useState(null);

  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewUser,    setShowNewUser]    = useState(false);
  const [projectForm,    setProjectForm]    = useState({ name: '', description: '' });
  const [userForm,       setUserForm]       = useState({ username: '', password: '', role: 'manager' });
  const [error, setError] = useState('');

  // roles state
  const customRoles = tenant?.customRoles || [];
  const allRoles = [...RESERVED, ...customRoles];

  const [roleForm, setRoleForm] = useState({ name: '', color: '#6366f1', icon: '👤' });
  const [roleError, setRoleError] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const [pr, us] = await Promise.all([api.get('/projects'), api.get('/users')]);
    setProjects(pr.data);
    setUsers(us.data);
    setSelected(prev => prev ?? (pr.data.length > 0 ? pr.data[0] : null));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createProject = async (e) => {
    e.preventDefault(); setError('');
    try {
      const { data } = await api.post('/projects', projectForm);
      setProjects(p => [...p, data]);
      setSelected(data);
      setProjectForm({ name: '', description: '' });
      setShowNewProject(false);
    } catch (err) { setError(err.response?.data?.message || 'Error'); }
  };

  const assignManager = async (projectId, managerId) => {
    try {
      const { data } = await api.patch(`/projects/${projectId}/assign-manager`, { managerId: managerId || null });
      setProjects(p => p.map(pr => pr._id === data._id ? data : pr));
      if (selected?._id === data._id) setSelected(data);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const createUser = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/auth/create-user', userForm);
      await fetchAll();
      setUserForm({ username: '', password: '', role: 'manager' });
      setShowNewUser(false);
    } catch (err) { setError(err.response?.data?.message || 'Error'); }
  };

  const addRole = async (e) => {
    e.preventDefault(); setRoleError(''); setRoleSaving(true);
    try {
      const { data } = await api.post('/tenants/roles', roleForm);
      updateTenant(data.tenant);
      setRoleForm({ name: '', color: '#6366f1', icon: '👤' });
    } catch (err) { setRoleError(err.response?.data?.message || 'Error'); }
    finally { setRoleSaving(false); }
  };

  const deleteRole = async (name) => {
    try {
      const { data } = await api.delete(`/tenants/roles/${encodeURIComponent(name)}`);
      updateTenant(data.tenant);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const managers = users.filter(u => u.role === 'manager');

  const statusGroups = (tasks) => ({
    todo:          tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    'in-qa':       tasks.filter(t => t.status === 'in-qa').length,
    done:          tasks.filter(t => t.status === 'done').length,
  });

  const projectStats = (ptasks) => {
    const total = ptasks.length;
    const done  = ptasks.filter(t => t.status === 'done').length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    const timestamps = ptasks.map(t => new Date(t.createdAt).getTime()).filter(Boolean);
    const firstDate  = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const daysSince  = firstDate ? Math.max(1, Math.round((Date.now() - firstDate) / 86400000)) : 1;
    const speed      = (done / daysSince).toFixed(2);
    return { total, done, pct, speed, daysSince };
  };

  // ── time helpers ──
  const fmtTime = (seconds) => {
    if (!seconds || seconds < 60) return seconds ? `${seconds}s` : '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const taskTime = (task) => {
    // use persisted totalTime, fall back to summing timeLogs
    if (task.totalTime > 0) return task.totalTime;
    return (task.timeLogs || []).reduce((sum, l) => sum + (l.duration || 0), 0);
  };

  const roleFor = (roleName) =>
    allRoles.find(r => r.name.toLowerCase() === roleName?.toLowerCase())
    || { name: roleName, color: '#64748b', icon: '👤' };

  return (
    <div className="manager-panel">
      {/* Sidebar */}
      <aside className="project-sidebar">
        <div className="sidebar-header">
          <span>📁 Projects</span>
          <button className="icon-btn" onClick={() => { setShowNewProject(true); setError(''); }}>+</button>
        </div>
        {projects.length === 0 && <p className="sidebar-empty">No projects</p>}
        {projects.map(p => (
          <div key={p._id} className={`project-item ${selected?._id === p._id ? 'active' : ''}`}
            onClick={() => setSelected(p)}>
            <span className="project-name">{p.name}</span>
            <span className="project-member-count">
              {p.manager ? `👔 ${p.manager.username}` : <span style={{ color: '#ef4444' }}>no manager</span>}
            </span>
          </div>
        ))}
      </aside>

      {/* Main */}
      <div className="manager-main">
        <div className="manager-tabs">
          {['projects', 'users', 'roles', 'tasks', 'completed'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'projects' ? '📁 Projects' : t === 'users' ? '🧑‍💼 Users' : t === 'roles' ? '🎭 Roles' : t === 'tasks' ? '📋 All Tasks' : '✅ Completed'}
            </button>
          ))}
          <button className="btn btn-invite-sm" onClick={() => { setShowNewUser(true); setError(''); }}>
            + New User
          </button>
        </div>

        {/* PROJECTS TAB */}
        {tab === 'projects' && selected && (
          <div className="overview-panel">
            <div className="project-detail-header">
              <h3>📁 {selected.name}</h3>
              {selected.description && <p className="project-desc-text">{selected.description}</p>}
            </div>
            <div className="assign-manager-row">
              <label>Assigned Manager:</label>
              <select className="assign-select"
                value={selected.manager?._id || selected.manager || ''}
                onChange={e => assignManager(selected._id, e.target.value)}>
                <option value="">— Unassigned —</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>{m.username}</option>
                ))}
              </select>
              {selected.manager && (
                <span className="role-chip role-manager">
                  👔 {typeof selected.manager === 'object' ? selected.manager.username : ''}
                </span>
              )}
            </div>
            {(() => {
              const ptasks = allTasks.filter(t => (t.project?._id || t.project) === selected._id);
              const sg = statusGroups(ptasks);
              const { total, done, pct, speed, daysSince } = projectStats(ptasks);
              return (
                <>
                  <div className="progress-block">
                    <div className="progress-labels">
                      <span>✅ {done} / {total} tasks done</span><span>{pct}%</span>
                    </div>
                    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                    <div className="speed-ratio">
                      🚀 Speed: <strong>{speed}</strong> tasks/day
                      <span className="speed-sub">over {daysSince} day{daysSince !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="stats-row" style={{ marginTop: 20 }}>
                    {Object.entries(sg).map(([s, n]) => (
                      <div key={s} className="stat-card"><span className="stat-num">{n}</span><span className="stat-label">{s}</span></div>
                    ))}
                    <div className="stat-card"><span className="stat-num">{selected.members?.length || 0}</span><span className="stat-label">members</span></div>
                  </div>
                  <div className="manager-task-list" style={{ marginTop: 16 }}>
                    {ptasks.length === 0 && <p className="no-data">No tasks yet.</p>}
                    {ptasks.map(task => (
                      <div key={task._id} className="manager-task-row">
                        <span className={`type-dot type-${task.type}`} />
                        <span className="mt-title">{task.title}</span>
                        <span className={`status-pill status-${task.status}`}>{task.status}</span>
                        <span className="mt-user">{task.assignedTo ? `💻 ${task.assignedTo.username}` : <span className="unassigned">unassigned</span>}</span>
                        <button className="btn btn-delete btn-xs" onClick={() => onTaskDelete(task._id)}>🗑</button>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {tab === 'projects' && !selected && <p className="no-data">No projects yet. Create one.</p>}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="users-panel">
            <h3>🧑‍💼 All Users</h3>
            <div className="user-table">
              {users.map(u => {
                const r = roleFor(u.role);
                const devTasks = allTasks.filter(t => (t.assignedTo?._id || t.assignedTo) === u._id).length;
                const managed  = projects.filter(p => (p.manager?._id || p.manager) === u._id).length;
                return (
                  <div key={u._id} className="user-row">
                    <span className="ut-username">{u.username}</span>
                    <span className="role-chip" style={{ background: r.color }}>{r.icon} {u.role}</span>
                    {u.role === 'manager'
                      ? <span className="ut-tasks">📁 {managed} project{managed !== 1 ? 's' : ''}</span>
                      : <span className="ut-tasks">📌 {devTasks} tasks</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {tab === 'roles' && (
          <div className="roles-panel">
            <h3>🎭 Organization Roles</h3>
            <p className="roles-subtext">
              <strong>manager</strong> is available in every org by default. Add custom roles that match your team structure.
            </p>

            {/* Reserved */}
            <div className="roles-group-label">Reserved (always available)</div>
            <div className="roles-list">
              {RESERVED.map(r => (
                <div key={r.name} className="role-row-item">
                  <span className="role-chip" style={{ background: r.color }}>{r.icon} {r.name}</span>
                  <span className="role-row-note">Built-in · cannot be removed</span>
                </div>
              ))}
            </div>

            {/* Custom */}
            <div className="roles-group-label" style={{ marginTop: 24 }}>Custom roles for your org</div>
            {customRoles.length === 0 && <p className="no-data" style={{ padding: '16px 0' }}>No custom roles yet.</p>}
            <div className="roles-list">
              {customRoles.map(r => (
                <div key={r.name} className="role-row-item">
                  <span className="role-chip" style={{ background: r.color }}>{r.icon} {r.name}</span>
                  <button className="btn btn-delete btn-xs" onClick={() => deleteRole(r.name)}>Remove</button>
                </div>
              ))}
            </div>

            {/* Add role form */}
            <form className="add-role-form" onSubmit={addRole}>
              <div className="roles-group-label" style={{ marginTop: 28 }}>Add a new role</div>
              <div className="add-role-row">
                <input
                  placeholder="Role name (e.g. Sales, Support, Designer)"
                  value={roleForm.name}
                  onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
                <input
                  placeholder="Icon (emoji)"
                  value={roleForm.icon}
                  onChange={e => setRoleForm(f => ({ ...f, icon: e.target.value }))}
                  className="role-icon-input"
                />
              </div>
              <div className="role-color-row">
                <span>Color:</span>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c} type="button"
                    className={`color-swatch ${roleForm.color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setRoleForm(f => ({ ...f, color: c }))}
                  />
                ))}
                <input type="color" value={roleForm.color}
                  onChange={e => setRoleForm(f => ({ ...f, color: e.target.value }))}
                  title="Custom color"
                  className="color-picker-sm"
                />
              </div>
              {/* preview */}
              {roleForm.name && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Preview: </span>
                  <span className="role-chip" style={{ background: roleForm.color }}>
                    {roleForm.icon} {roleForm.name}
                  </span>
                </div>
              )}
              {roleError && <p className="error">{roleError}</p>}
              <button type="submit" className="btn btn-create" style={{ marginTop: 12 }} disabled={roleSaving}>
                {roleSaving ? 'Adding…' : '+ Add Role'}
              </button>
            </form>
          </div>
        )}

        {/* ALL TASKS TAB */}
        {tab === 'tasks' && (
          <div className="overview-panel">
            <h3>📋 All Tasks ({allTasks.length})</h3>
            {(() => {
              const { total, done, pct, speed, daysSince } = projectStats(allTasks);
              return (
                <div className="progress-block">
                  <div className="progress-labels">
                    <span>✅ {done} / {total} tasks done across all projects</span><span>{pct}%</span>
                  </div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="speed-ratio">
                    🚀 Overall speed: <strong>{speed}</strong> tasks/day
                    <span className="speed-sub">over {daysSince} day{daysSince !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })()}
            <div className="stats-row" style={{ marginTop: 16 }}>
              {Object.entries(statusGroups(allTasks)).map(([s, n]) => (
                <div key={s} className="stat-card"><span className="stat-num">{n}</span><span className="stat-label">{s}</span></div>
              ))}
            </div>
            <div className="manager-task-list" style={{ marginTop: 16 }}>
              {allTasks.length === 0 && <p className="no-data">No tasks yet.</p>}
              {allTasks.map(task => (
                <div key={task._id} className="manager-task-row">
                  <span className={`type-dot type-${task.type}`} />
                  <span className="mt-title">{task.title}</span>
                  <span className="mt-project">{task.project?.name}</span>
                  <span className={`status-pill status-${task.status}`}>{task.status}</span>
                  <span className="mt-user">{task.assignedTo ? `💻 ${task.assignedTo.username}` : <span className="unassigned">unassigned</span>}</span>
                  <button className="btn btn-delete btn-xs" onClick={() => onTaskDelete(task._id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLETED TAB */}
        {tab === 'completed' && (() => {
          const doneTasks = allTasks
            .filter(t => t.status === 'done')
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

          const totalSecs = doneTasks.reduce((sum, t) => sum + taskTime(t), 0);

          // per-user summary
          const byUser = doneTasks.reduce((acc, t) => {
            const uid  = t.assignedTo?._id || t.assignedTo || 'unassigned';
            const name = t.assignedTo?.username || 'Unassigned';
            if (!acc[uid]) acc[uid] = { name, count: 0, secs: 0 };
            acc[uid].count++;
            acc[uid].secs += taskTime(t);
            return acc;
          }, {});

          return (
            <div className="overview-panel">
              <div className="completed-header">
                <div>
                  <h3>✅ Completed Tasks</h3>
                  <p className="completed-sub">{doneTasks.length} tasks done &middot; {fmtTime(totalSecs)} total time invested</p>
                </div>
              </div>

              {/* per-user summary cards */}
              {Object.keys(byUser).length > 0 && (
                <div className="completed-user-summary">
                  {Object.entries(byUser).map(([uid, u]) => (
                    <div key={uid} className="cus-card">
                      <div className="cus-avatar">{u.name.slice(0,2).toUpperCase()}</div>
                      <div className="cus-info">
                        <span className="cus-name">{u.name}</span>
                        <span className="cus-stats">{u.count} task{u.count !== 1 ? 's' : ''} &middot; {fmtTime(u.secs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* total time summary bar */}
              <div className="completed-total-bar">
                <span>🕑 Total org time invested</span>
                <strong>{fmtTime(totalSecs)}</strong>
              </div>

              {/* task list */}
              {doneTasks.length === 0 && <p className="no-data">No completed tasks yet.</p>}
              <div className="completed-task-list">
                {doneTasks.map(task => {
                  const secs = taskTime(task);
                  return (
                    <div key={task._id} className="completed-task-row">
                      <span className={`type-dot type-${task.type}`} />
                      <div className="ct-main">
                        <span className="ct-title">{task.title}</span>
                        <span className="ct-meta">
                          {task.project?.name && <span className="ct-project">{task.project.name}</span>}
                          {task.assignedTo && <span className="ct-user">💻 {task.assignedTo.username}</span>}
                          {task.qaAssignedTo && <span className="ct-user">🔍 {task.qaAssignedTo.username}</span>}
                          <span className="ct-date">{new Date(task.updatedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                        </span>
                      </div>
                      <div className="ct-time">
                        <span className="ct-time-label">⏱</span>
                        <span className="ct-time-val">{fmtTime(secs)}</span>
                      </div>
                      <span className={`type-dot type-${task.type} ct-type-badge`}>{task.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>📁 New Project</h3>
            <form onSubmit={createProject}>
              <label>Name</label>
              <input value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Project name" required />
              <label>Description</label>
              <textarea value={projectForm.description}
                onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Optional" rows={2} />
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowNewProject(false)}>Cancel</button>
                <button type="submit" className="btn btn-create">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUser && (
        <div className="modal-overlay" onClick={() => setShowNewUser(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🧑‍💼 Create User</h3>
            <form onSubmit={createUser}>
              <label>Username</label>
              <input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="Username" required />
              <label>Password</label>
              <input type="password" value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Password" required />
              <label>Role</label>
              <div className="role-picker-grid">
                {allRoles.map(r => (
                  <button key={r.name} type="button"
                    className={`role-pick-btn ${userForm.role === r.name ? 'selected' : ''}`}
                    style={userForm.role === r.name ? { background: r.color, borderColor: r.color } : { borderColor: r.color + '55' }}
                    onClick={() => setUserForm({ ...userForm, role: r.name })}>
                    <span className="rpb-icon">{r.icon}</span>
                    <span className="rpb-name">{r.name}</span>
                  </button>
                ))}
              </div>
              {customRoles.length === 0 && (
                <p className="roles-hint">💡 Go to the <strong>Roles</strong> tab to add custom roles for your org.</p>
              )}
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowNewUser(false)}>Cancel</button>
                <button type="submit" className="btn btn-create">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
