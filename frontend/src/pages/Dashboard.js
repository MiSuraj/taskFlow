import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import QueueBoard from '../components/QueueBoard';
import CreateTaskModal from '../components/CreateTaskModal';
import ManagerDashboard from './ManagerDashboard';
import AdminDashboard from './AdminDashboard';
import ProjectDoc from '../components/ProjectDoc';
import ProjectChat from '../components/ProjectChat';
import api from '../api';

const QUOTES = [
  'Great things are done by a series of small things brought together.',
  'The secret of getting ahead is getting started.',
  'Focus on being productive instead of busy.',
  'Code is like humor. When you have to explain it, it\'s bad.',
  'First, solve the problem. Then, write the code.',
  'Make it work, make it right, make it fast.',
  'Every bug you fix is a step closer to done.',
  'Ships don\'t sink because of water around them — keep shipping.',
  'Done is better than perfect. Then make it perfect.',
  'One task at a time. That\'s how mountains move.',
];

function getGreeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? '☀️ Good morning' : h < 17 ? '👋 Good afternoon' : '🌙 Good evening';
  return `${g}, ${name}!`;
}

export default function Dashboard() {
  const { user, tenant, updateTenant, logout } = useAuth();
  const quote = QUOTES[Math.floor((Date.now() / 86400000)) % QUOTES.length];
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: tenant?.branding?.logoUrl || '',
    primaryColor: tenant?.branding?.primaryColor || '#2563eb',
  });
  const [brandingMsg, setBrandingMsg] = useState('');

  // AI config state (admin only)
  const [aiForm, setAiForm] = useState({
    enabled:  tenant?.features?.ai?.enabled  || false,
    provider: tenant?.features?.ai?.provider || 'openai',
    model:    tenant?.features?.ai?.model    || 'gpt-4o-mini',
    apiKey:   '',  // never pre-filled from server
  });
  const [aiMsg,  setAiMsg]  = useState('');
  const [aiErr,  setAiErr]  = useState('');
  const [aiSaving, setAiSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data } = await api.get('/tasks');
    setTasks(data);
  }, []);

  useEffect(() => {
    fetchTasks();
    api.get('/users').then(({ data }) => setUsers(data));
    api.get('/projects').then(({ data }) => {
      setProjects(data);
      setActiveProject(prev => prev ?? (data.length > 0 ? data[0] : null));
    });
  }, [fetchTasks]);

  useEffect(() => {
    if (user.role === 'admin') setActiveTab('admin');
  }, [user.role]);

  useEffect(() => {
    setBrandingForm({
      logoUrl: tenant?.branding?.logoUrl || '',
      primaryColor: tenant?.branding?.primaryColor || '#2563eb',
    });
  }, [tenant]);

  const handleUpdate = (updated) => setTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
  const handleDelete = async (id) => { await api.delete(`/tasks/${id}`); setTasks(prev => prev.filter(t => t._id !== id)); };
  const handleCreated = (task) => setTasks(prev => [...prev, task]);

  const saveBranding = async (e) => {
    e.preventDefault();
    setBrandingMsg('');
    const { data } = await api.patch('/tenants/branding', brandingForm);
    updateTenant(data.tenant);
    setBrandingMsg('Organization branding saved.');
  };

  const saveAiConfig = async (e) => {
    e.preventDefault();
    setAiErr(''); setAiMsg(''); setAiSaving(true);
    try {
      const payload = {
        features: {
          ai: {
            enabled:  aiForm.enabled,
            provider: aiForm.provider,
            model:    aiForm.model,
            ...(aiForm.apiKey ? { apiKey: aiForm.apiKey } : {}),
          },
          chatIntegration: tenant?.features?.chatIntegration || { enabled: false },
        },
      };
      const { data } = await api.patch('/tenants/features', payload);
      updateTenant(data.tenant);
      setAiMsg('AI configuration saved.');
      setAiForm(f => ({ ...f, apiKey: '' })); // clear key from UI after save
    } catch (err) {
      setAiErr(err.response?.data?.message || 'Failed to save AI config');
    } finally { setAiSaving(false); }
  };

  const projectId = activeProject?._id;

  // Filter tasks by active project
  const projectTasks = projectId
    ? tasks.filter(t => (t.project?._id || t.project) === projectId)
    : tasks;

  const globalQueue = projectTasks.filter(t => !t.assignedTo && t.status === 'todo')
    .sort((a, b) => a.queuePosition - b.queuePosition);

  // My dev board
  const myDevTasks = projectTasks.filter(t => {
    const aid = t.assignedTo?._id || t.assignedTo?.id;
    return aid === user.id;
  });

  // My QA board (tasks where I'm qa assigned)
  const myQATasks = projectTasks.filter(t => {
    const qid = t.qaAssignedTo?._id || t.qaAssignedTo?.id;
    return qid === user.id;
  });

  // QA queue: tasks in-qa not yet picked by any QA
  const qaQueue = projectTasks.filter(t => t.status === 'in-qa' && !t.qaAssignedTo);

  const planKey = tenant?.subscription?.plan || 'basic';
  const canExternalChat = ['business','enterprise'].includes(planKey);

  const isAdmin   = user.role === 'admin';
  const isManager = user.role === 'manager';
  const isQA      = user.role === 'qa';
  const isDev     = user.role === 'developer';

  const tabs = isAdmin ? [
    { key: 'admin', label: '🛡️ Admin Panel' },
  ] : [
    { key: 'global', label: `🌐 Queue (${globalQueue.length})` },
    ...(isQA ? [{ key: 'qa-queue', label: `🔍 QA Queue (${qaQueue.length})` }] : []),
    { key: 'my', label: `👤 My Board (${isQA ? myQATasks.length : myDevTasks.length})` },
    ...(isManager ? [{ key: 'manager', label: '👔 Manager View' }] : []),
    { key: 'all', label: '👥 All Boards' },
    ...(activeProject ? [{ key: 'doc', label: '📄 Project Docs' }] : []),
    ...(activeProject ? [{ key: 'chat', label: '💬 Chat' }] : []),
    ...(activeProject && canExternalChat ? [{ key: 'ext-chat', label: '🔗 Ext. Chat' }] : []),
  ];

  // All user boards grouped
  const userBoards = projectTasks
    .filter(t => t.assignedTo)
    .reduce((acc, t) => {
      const uid = t.assignedTo?._id || t.assignedTo?.id;
      const uname = t.assignedTo?.username;
      if (!acc[uid]) acc[uid] = { username: uname, tasks: [] };
      acc[uid].tasks.push(t);
      return acc;
    }, {});

  const qaBoards = projectTasks
    .filter(t => t.qaAssignedTo)
    .reduce((acc, t) => {
      const uid = t.qaAssignedTo?._id || t.qaAssignedTo?.id;
      const uname = t.qaAssignedTo?.username;
      if (!acc[uid]) acc[uid] = { username: uname, tasks: [] };
      acc[uid].tasks.push(t);
      return acc;
    }, {});

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-lockup">
            {tenant?.branding?.logoUrl && <img src={tenant.branding.logoUrl} alt="" className="tenant-logo" />}
            <div>
              <h1 style={{ color: tenant?.branding?.primaryColor || undefined }}>
                {tenant?.name || 'Task Manager'}
              </h1>
              {tenant?.subscription && (
                <span className="subscription-chip">
                  {tenant.subscription.plan} / {tenant.subscription.status}
                </span>
              )}
            </div>
          </div>
          {projects.length > 0 && (
            <select className="project-switcher" value={activeProject?._id || ''}
              onChange={e => setActiveProject(projects.find(p => p._id === e.target.value) || null)}>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div className="topbar-right">
          {(isDev || isManager) && activeProject && !isAdmin && (
            <button className="btn btn-create" onClick={() => setShowModal(true)}>+ New Task</button>
          )}
          <span className={`role-chip role-${user.role}`}>
            {user.role === 'admin' ? '🛡️' : user.role === 'manager' ? '👔' : user.role === 'developer' ? '💻' : '🔍'} {user.username}
          </span>
          <button className="btn btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="profile-greeting">
        <div className="profile-avatar">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="profile-greeting-text">
          <h2>{getGreeting(user.username)}</h2>
          <p>✦ {quote}</p>
        </div>
        <div className={`role-chip role-${user.role} profile-role-chip`}>
          {user.role === 'admin' ? '🛡️' : user.role === 'manager' ? '👔' : user.role === 'developer' ? '💻' : '🔍'}&nbsp;{user.role}
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <main className="main-content">
        {/* GLOBAL QUEUE */}
        {activeTab === 'global' && (
          <QueueBoard title="📋 Global Task Queue" tasks={globalQueue} currentUser={user}
            onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={true} users={users} />
        )}

        {/* QA QUEUE */}
        {activeTab === 'qa-queue' && isQA && (
          <QueueBoard title="🔍 Tasks Awaiting QA" tasks={qaQueue} currentUser={user}
            onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} users={users} />
        )}

        {/* MY BOARD */}
        {activeTab === 'my' && (
          <div className="user-board">
            <div className="user-board-header">
              <h2>{user.role === 'qa' ? '🔍' : '💻'} {user.username}'s Board</h2>
            </div>
            {isDev && (
              <div className="status-columns">
                <QueueBoard title="🔄 In Progress" tasks={myDevTasks.filter(t => t.status === 'in-progress')}
                  currentUser={user} onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
                <QueueBoard title="🔍 In QA" tasks={myDevTasks.filter(t => t.status === 'in-qa')}
                  currentUser={user} onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
                <QueueBoard title="✅ Done" tasks={myDevTasks.filter(t => t.status === 'done')}
                  currentUser={user} onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
              </div>
            )}
            {isQA && (
              <div className="status-columns">
                <QueueBoard title="🔍 My QA Tasks" tasks={myQATasks.filter(t => t.status === 'in-qa')}
                  currentUser={user} onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
                <QueueBoard title="✅ QA Done" tasks={myQATasks.filter(t => t.status === 'done')}
                  currentUser={user} onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
              </div>
            )}
          </div>
        )}

        {/* ADMIN PANEL */}
        {activeTab === 'admin' && isAdmin && (
          <div className="admin-layout">
            <section className="tenant-settings">
              <div>
                <h2>Organization Settings</h2>
                <p>{tenant?.name} · {tenant?.subscription?.plan} / {tenant?.subscription?.status}</p>
              </div>
              <form onSubmit={saveBranding} className="tenant-settings-form">
                <input placeholder="Logo URL" value={brandingForm.logoUrl}
                  onChange={e => setBrandingForm(prev => ({ ...prev, logoUrl: e.target.value }))} />
                <label className="tenant-color-picker">
                  Brand color
                  <input type="color" value={brandingForm.primaryColor}
                    onChange={e => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))} />
                </label>
                <button className="btn btn-create" type="submit">Save Branding</button>
              </form>
              {brandingMsg && <p className="success-msg">{brandingMsg}</p>}
            </section>

            {/* AI Configuration — only shown if plan supports it */}
            {['starter','business','enterprise'].includes(tenant?.subscription?.plan) && (
              <section className="ai-config-section">
                <div className="ai-config-header">
                  <div>
                    <h2>🤖 AI Configuration</h2>
                    <p>Set the API key once. Managers can then use AI task generation — they never see the key.</p>
                  </div>
                  <label className="ai-toggle-switch">
                    <input type="checkbox" checked={aiForm.enabled}
                      onChange={e => setAiForm(f => ({ ...f, enabled: e.target.checked }))} />
                    <span className="ai-toggle-track">
                      <span className="ai-toggle-thumb" />
                    </span>
                    <span className="ai-toggle-label">{aiForm.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>

                {aiForm.enabled && (
                  <form onSubmit={saveAiConfig} className="ai-config-form">
                    <div className="ai-config-row">
                      <div className="ai-config-field">
                        <label>Provider</label>
                        <select value={aiForm.provider}
                          onChange={e => setAiForm(f => ({ ...f, provider: e.target.value }))}>
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Gemini</option>
                        </select>
                      </div>
                      <div className="ai-config-field">
                        <label>Model</label>
                        <select value={aiForm.model}
                          onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}>
                          {aiForm.provider === 'openai' ? (
                            <>
                              <option value="gpt-4o-mini">GPT-4o Mini</option>
                              <option value="gpt-4o">GPT-4o</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            </>
                          ) : (
                            <>
                              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="ai-config-field" style={{ marginTop: 12 }}>
                      <label>
                        API Key
                        {tenant?.features?.ai?.apiKey ? (
                          <span className="ai-key-set-badge">✓ Key saved — paste a new one to replace</span>
                        ) : (
                          <span className="ai-key-missing-badge">⚠ No key set yet</span>
                        )}
                      </label>
                      <input
                        type="password"
                        placeholder={tenant?.features?.ai?.apiKey ? '••••••••••••••••  (leave blank to keep existing)' : 'Paste your API key here…'}
                        value={aiForm.apiKey}
                        onChange={e => setAiForm(f => ({ ...f, apiKey: e.target.value }))}
                        className="ai-key-field"
                        autoComplete="off"
                      />
                    </div>
                    {aiErr && <p className="error">{aiErr}</p>}
                    {aiMsg && <p className="success-msg">{aiMsg}</p>}
                    <button className="btn btn-create" type="submit" disabled={aiSaving}>
                      {aiSaving ? 'Saving…' : 'Save AI Config'}
                    </button>
                  </form>
                )}

                {!aiForm.enabled && (
                  <form onSubmit={saveAiConfig} style={{ marginTop: 12 }}>
                    {aiErr && <p className="error">{aiErr}</p>}
                    {aiMsg && <p className="success-msg">{aiMsg}</p>}
                    <button className="btn btn-create" type="submit" disabled={aiSaving}>
                      {aiSaving ? 'Saving…' : 'Save (disable AI)'}
                    </button>
                  </form>
                )}
              </section>
            )}

            <AdminDashboard allTasks={tasks} onTaskDelete={handleDelete} />
          </div>
        )}

        {/* MANAGER VIEW */}
        {activeTab === 'manager' && isManager && (
          <ManagerDashboard user={user} allTasks={tasks}
            onTaskUpdate={handleUpdate} onTaskDelete={handleDelete} />
        )}

        {/* PROJECT DOCS */}
        {activeTab === 'doc' && activeProject && (
          <ProjectDoc projectId={activeProject._id} currentUser={user} />
        )}

        {/* CHAT */}
        {activeTab === 'chat' && activeProject && (
          <ProjectChat
            projectId={activeProject._id}
            currentUser={user}
            projectMembers={users.filter(u => {
              return activeProject.members?.some(m => (m._id || m) === u._id)
                || (activeProject.manager?._id || activeProject.manager) === u._id;
            })}
          />
        )}

        {/* EXTERNAL CHAT — Business plan gate */}
        {activeTab === 'ext-chat' && (
          <div className="upgrade-gate">
            <div className="upgrade-gate-icon">🔗</div>
            <h2>External Chat Bridge</h2>
            <p>Connect your workspace to <strong>WhatsApp</strong>, <strong>Microsoft Teams</strong>, or <strong>Google Chat</strong>.</p>
            <p className="upgrade-gate-sub">Available on the <strong>Business</strong> plan and above.</p>
            <div className="upgrade-gate-plans">
              <div className="upgrade-gate-plan">
                <span>Business</span>
                <strong>₹2,499/mo</strong>
                <small>WhatsApp · Teams · Google Chat</small>
              </div>
              <div className="upgrade-gate-plan">
                <span>Enterprise</span>
                <strong>Contact us</strong>
                <small>Custom integrations · SLA</small>
              </div>
            </div>
            <a href="mailto:sales@taskflow.io" className="upgrade-gate-btn">Contact sales to upgrade →</a>
          </div>
        )}

        {/* ALL BOARDS */}
        {activeTab === 'all' && (
          <div className="section">
            <h3 style={{ marginBottom: 16, color: '#94a3b8' }}>💻 Developer Boards</h3>
            {Object.keys(userBoards).length === 0 && <p className="no-data">No tasks picked yet.</p>}
            {Object.entries(userBoards).map(([uid, board]) => (
              <div key={uid} className="user-board">
                <div className="user-board-header"><h2>💻 {board.username}</h2></div>
                <div className="status-columns">
                  {['in-progress', 'in-qa', 'done'].map(s => (
                    <QueueBoard key={s} title={s === 'in-progress' ? '🔄 In Progress' : s === 'in-qa' ? '🔍 In QA' : '✅ Done'}
                      tasks={board.tasks.filter(t => t.status === s)} currentUser={user}
                      onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
                  ))}
                </div>
              </div>
            ))}
            <h3 style={{ margin: '24px 0 16px', color: '#94a3b8' }}>🔍 QA Boards</h3>
            {Object.keys(qaBoards).length === 0 && <p className="no-data">No QA tasks assigned yet.</p>}
            {Object.entries(qaBoards).map(([uid, board]) => (
              <div key={uid} className="user-board">
                <div className="user-board-header"><h2>🔍 {board.username}</h2></div>
                <div className="status-columns">
                  {['in-qa', 'done'].map(s => (
                    <QueueBoard key={s} title={s === 'in-qa' ? '🔍 In QA' : '✅ Done'}
                      tasks={board.tasks.filter(t => t.status === s)} currentUser={user}
                      onUpdate={handleUpdate} onDelete={handleDelete} isGlobalQueue={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && activeProject && (
        <CreateTaskModal onClose={() => setShowModal(false)} onCreated={handleCreated} projectId={activeProject._id} />
      )}
    </div>
  );
}
