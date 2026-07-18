import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import api from '../api';
import ProjectDoc from '../components/ProjectDoc';
import ProjectChat from '../components/ProjectChat';
import AITaskGenerator from '../components/AITaskGenerator';

const ROLE_COLORS = { manager: '#f59e0b', developer: '#3b82f6', qa: '#9b59b6' };

export default function ManagerDashboard({ user, onTasksChange, allTasks, onTaskUpdate, onTaskDelete }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tab, setTab] = useState('overview');
  const tabsRef = useRef(null);
  const [tabIndicator, setTabIndicator] = useState({ transform: 'translateX(0px)', width: 0 });
  const [showInvite, setShowInvite]    = useState(false);
  const [inviteForm, setInviteForm]     = useState({ username: '', password: '', role: 'developer' });
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [error, setError] = useState('');

  const fetchProjects = useCallback(async () => {
    const { data } = await api.get('/projects');
    setProjects(data);
    setActiveProject(prev => prev ?? (data.length > 0 ? data[0] : null));
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await api.get('/users');
    setUsers(data);
  }, []);

  useEffect(() => { fetchProjects(); fetchUsers(); }, [fetchProjects, fetchUsers]);

  const inviteUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/invite', inviteForm);
      await fetchUsers();
      setInviteForm({ username: '', password: '', role: 'developer' });
      setShowInvite(false);
    } catch (err) { setError(err.response?.data?.message || 'Error'); }
  };

  const addMember = async () => {
    if (!addMemberUserId || !activeProject) return;
    try {
      const { data } = await api.patch(`/projects/${activeProject._id}/members`, { userId: addMemberUserId });
      setProjects(p => p.map(pr => pr._id === data._id ? data : pr));
      setActiveProject(data);
      setAddMemberUserId('');
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const removeMember = async (userId) => {
    if (!activeProject) return;
    try {
      const { data } = await api.delete(`/projects/${activeProject._id}/members/${userId}`);
      setProjects(p => p.map(pr => pr._id === data._id ? data : pr));
      setActiveProject(data);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const projectTasks = activeProject
    ? allTasks.filter(t => (t.project?._id || t.project) === activeProject._id)
    : allTasks;

  const statusGroups = {
    todo: projectTasks.filter(t => t.status === 'todo'),
    'in-progress': projectTasks.filter(t => t.status === 'in-progress'),
    'in-qa': projectTasks.filter(t => t.status === 'in-qa'),
    done: projectTasks.filter(t => t.status === 'done'),
  };

  const memberMap = users.reduce((acc, u) => { acc[u._id] = u; return acc; }, {});
  const notInProject = activeProject
    ? users.filter(u => u.role !== 'manager' && !activeProject.members?.some(m => (m._id || m) === u._id))
    : [];

  useLayoutEffect(() => {
    const container = tabsRef.current;
    const activeBtn = container?.querySelector('.tab.active');
    if (!activeBtn) return;
    setTabIndicator({
      transform: `translateX(${activeBtn.offsetLeft}px)`,
      width: activeBtn.offsetWidth,
    });
  }, [tab]);

  return (
    <div className="manager-panel">
      {/* Project Sidebar */}
      <aside className="project-sidebar">
        <div className="sidebar-header">
          <span>📁 My Projects</span>
        </div>
        {projects.length === 0 && <p className="sidebar-empty">No projects yet</p>}
        {projects.map(p => (
          <div
            key={p._id}
            className={`project-item ${activeProject?._id === p._id ? 'active' : ''}`}
            onClick={() => setActiveProject(p)}
          >
            <span className="project-name">{p.name}</span>
            <span className="project-member-count">{p.members?.length || 0} members</span>
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <div className="manager-main">
        <div className="manager-tabs" ref={tabsRef}>
          <div className="tab-indicator" style={tabIndicator} />
          {['overview', 'members', 'users', 'docs', 'chat', 'ai'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? '📊 Overview' : t === 'members' ? '👥 Members' : t === 'users' ? '🧑‍💼 All Users' : t === 'docs' ? '📄 Docs' : t === 'chat' ? '💬 Chat' : '🤖 AI'}
            </button>
          ))}
          <button className="btn btn-invite-sm" onClick={() => setShowInvite(true)}>+ Add User</button>
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="overview-panel">
            <h3>{activeProject ? `📁 ${activeProject.name}` : 'All Projects'}</h3>
            <div className="stats-row">
              {Object.entries(statusGroups).map(([status, tasks]) => (
                <div key={status} className="stat-card">
                  <span className="stat-num">{tasks.length}</span>
                  <span className="stat-label">{status}</span>
                </div>
              ))}
            </div>
            <div className="manager-task-list">
              {projectTasks.length === 0 && <p className="no-data">No tasks for this project.</p>}
              {projectTasks.map(task => (
                <div key={task._id} className="manager-task-row">
                  <span className={`type-dot type-${task.type}`} />
                  <span className="mt-title">{task.title}</span>
                  <span className="mt-project">{task.project?.name}</span>
                  <span className={`status-pill status-${task.status}`}>{task.status}</span>
                  <span className="mt-user">
                    {task.assignedTo ? `💻 ${task.assignedTo.username}` : <span className="unassigned">unassigned</span>}
                  </span>
                  <span className="mt-user">
                    {task.qaAssignedTo ? `🔍 ${task.qaAssignedTo.username}` : ''}
                  </span>
                  <button className="btn btn-delete btn-xs" onClick={() => onTaskDelete(task._id)}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {tab === 'members' && activeProject && (
          <div className="members-panel">
            <h3>👥 {activeProject.name} — Members</h3>
            <div className="add-member-row">
              <select className="assign-select" value={addMemberUserId} onChange={e => setAddMemberUserId(e.target.value)}>
                <option value="">Add member…</option>
                {notInProject.map(u => (
                  <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
                ))}
              </select>
              <button className="btn btn-pick" onClick={addMember} disabled={!addMemberUserId}>Add</button>
            </div>
            <div className="member-list">
              {(activeProject.members || []).length === 0 && <p className="no-data">No members yet.</p>}
              {(activeProject.members || []).map(m => {
                const member = typeof m === 'object' ? m : memberMap[m];
                if (!member) return null;
                return (
                  <div key={member._id} className="member-row">
                    <span className={`role-chip role-${member.role}`}>{member.role === 'qa' ? '🔍' : '💻'} {member.username}</span>
                    <span className={`role-badge role-${member.role}`}>{member.role}</span>
                    <button className="btn btn-delete btn-xs" onClick={() => removeMember(member._id)}>Remove</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === 'members' && !activeProject && <p className="no-data">Select a project first.</p>}

        {tab === 'docs' && activeProject && (
          <ProjectDoc projectId={activeProject._id} currentUser={user} />
        )}
        {tab === 'docs' && !activeProject && <p className="no-data">Select a project first.</p>}

        {tab === 'chat' && activeProject && (
          <ProjectChat
            projectId={activeProject._id}
            currentUser={user}
            projectMembers={[
              ...(activeProject.members || []).filter(m => typeof m === 'object'),
              ...(activeProject.manager && typeof activeProject.manager === 'object' ? [activeProject.manager] : []),
            ]}
          />
        )}
        {tab === 'chat' && !activeProject && <p className="no-data">Select a project first.</p>}

        {tab === 'ai' && activeProject && (
          <AITaskGenerator
            projectId={activeProject._id}
            projectName={activeProject.name}
            onTasksAdded={onTasksChange}
          />
        )}
        {tab === 'ai' && !activeProject && <p className="no-data">Select a project first.</p>}

        {/* ALL USERS TAB */}
        {tab === 'users' && (
          <div className="users-panel">
            <h3>🧑‍💼 All System Users</h3>
            <div className="user-table">
              {users.map(u => (
                <div key={u._id} className="user-row">
                  <span className="ut-username">{u.username}</span>
                  <span className={`role-chip role-${u.role}`} style={{ background: ROLE_COLORS[u.role] }}>
                    {u.role === 'manager' ? '👔' : u.role === 'developer' ? '💻' : '🔍'} {u.role}
                  </span>
                  <span className="ut-tasks">
                    {allTasks.filter(t => (t.assignedTo?._id || t.assignedTo) === u._id).length} dev tasks
                  </span>
                  <span className="ut-tasks">
                    {allTasks.filter(t => (t.qaAssignedTo?._id || t.qaAssignedTo) === u._id).length} qa tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>

      {/* Invite User Modal — manager picks role */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>✉️ Invite User</h3>
            <form onSubmit={inviteUser}>
              <label>Username</label>
              <input value={inviteForm.username} onChange={e => setInviteForm({ ...inviteForm, username: e.target.value })}
                placeholder="Username" required />
              <label>Password</label>
              <input type="password" value={inviteForm.password}
                onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Temporary password" required />
              <label>Role</label>
              <div className="type-selector">
                {['developer', 'qa'].map(r => (
                  <button key={r} type="button"
                    className={`type-btn ${inviteForm.role === r ? 'active' : ''}`}
                    style={inviteForm.role === r ? { background: ROLE_COLORS[r], borderColor: ROLE_COLORS[r], color: 'white' } : {}}
                    onClick={() => setInviteForm({ ...inviteForm, role: r })}>
                    {r === 'developer' ? '💻' : '🔍'} {r}
                  </button>
                ))}
              </div>
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn btn-create">Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
