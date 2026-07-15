import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { SOCKET_URL } from '../config';

const SECTION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#9b59b6', '#e74c3c', '#06b6d4'];

export default function ProjectDoc({ projectId, currentUser }) {
  const [sections,    setSections]    = useState([]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [presence,    setPresence]    = useState([]);
  const [saveStatus,  setSaveStatus]  = useState('');   // 'saving' | 'saved' | ''
  const [lastEditor,  setLastEditor]  = useState('');
  const [newSecTitle, setNewSecTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const socketRef  = useRef(null);
  const saveTimer  = useRef(null);
  const localEdit  = useRef(false); // flag to avoid echo

  // Load doc from REST on mount
  const loadDoc = useCallback(async () => {
    try {
      const { data } = await api.get(`/docs/${projectId}`);
      setSections(data.sections || []);
      if (data.lastEditedBy?.username) setLastEditor(data.lastEditedBy.username);
    } catch (err) { console.error('Failed to load doc', err.message); }
  }, [projectId]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

  // Connect socket
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('join-doc', projectId);

    socket.on('presence', (users) => setPresence(users));

    socket.on('doc-change', ({ sections: incoming, editedBy }) => {
      if (!localEdit.current) {
        setSections(incoming);
      }
      setLastEditor(editedBy);
    });

    socket.on('doc-saved', ({ lastEditedBy, updatedAt }) => {
      setSaveStatus('saved');
      setLastEditor(lastEditedBy);
      setTimeout(() => setSaveStatus(''), 2500);
    });

    return () => {
      socket.emit('leave-doc', projectId);
      socket.disconnect();
    };
  }, [projectId]);

  // Debounced broadcast + auto-save on change
  const handleChange = (idx, value) => {
    const updated = sections.map((s, i) => i === idx ? { ...s, content: value } : s);
    setSections(updated);
    localEdit.current = true;
    setTimeout(() => { localEdit.current = false; }, 100);

    // Broadcast to peers
    socketRef.current?.emit('doc-change', { projectId, sections: updated, sectionIndex: idx });

    // Debounced save
    clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      socketRef.current?.emit('doc-save', { projectId, sections: updated });
    }, 1200);
  };

  const handleTitleChange = (idx, value) => {
    const updated = sections.map((s, i) => i === idx ? { ...s, title: value } : s);
    setSections(updated);
    socketRef.current?.emit('doc-change', { projectId, sections: updated, sectionIndex: idx });
    clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      socketRef.current?.emit('doc-save', { projectId, sections: updated });
    }, 1200);
  };

  const addSection = () => {
    if (!newSecTitle.trim()) return;
    const updated = [...sections, { title: newSecTitle.trim(), content: '' }];
    setSections(updated);
    setActiveIdx(updated.length - 1);
    setNewSecTitle('');
    setAddingSection(false);
    socketRef.current?.emit('doc-change', { projectId, sections: updated });
    socketRef.current?.emit('doc-save', { projectId, sections: updated });
  };

  const removeSection = (idx) => {
    if (sections.length === 1) return;
    const updated = sections.filter((_, i) => i !== idx);
    setSections(updated);
    setActiveIdx(Math.min(activeIdx, updated.length - 1));
    socketRef.current?.emit('doc-change', { projectId, sections: updated });
    socketRef.current?.emit('doc-save', { projectId, sections: updated });
  };

  const active = sections[activeIdx];

  return (
    <div className="doc-container">
      {/* Section tabs sidebar */}
      <aside className="doc-sidebar">
        <div className="doc-sidebar-header">
          <span>📄 Sections</span>
          <button className="icon-btn" onClick={() => setAddingSection(true)} title="Add section">+</button>
        </div>
        {sections.map((s, i) => (
          <div key={i} className={`doc-section-tab ${activeIdx === i ? 'active' : ''}`}
            onClick={() => setActiveIdx(i)}
            style={activeIdx === i ? { borderLeftColor: SECTION_COLORS[i % SECTION_COLORS.length] } : {}}>
            <span className="doc-section-name">{s.title}</span>
            {sections.length > 1 && (
              <button className="doc-remove-sec" onClick={e => { e.stopPropagation(); removeSection(i); }}>×</button>
            )}
          </div>
        ))}
        {addingSection && (
          <div className="doc-add-section">
            <input autoFocus placeholder="Section title…" value={newSecTitle}
              onChange={e => setNewSecTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAddingSection(false); }} />
            <div className="doc-add-btns">
              <button className="btn btn-create btn-xs" onClick={addSection}>Add</button>
              <button className="btn btn-cancel btn-xs" onClick={() => setAddingSection(false)}>✕</button>
            </div>
          </div>
        )}
      </aside>

      {/* Editor area */}
      <div className="doc-editor-area">
        {/* Top bar */}
        <div className="doc-topbar">
          <div className="doc-presence">
            {presence.map((u, i) => (
              <span key={i} className="presence-avatar"
                style={{ background: SECTION_COLORS[i % SECTION_COLORS.length] }}
                title={u}>
                {u[0].toUpperCase()}
              </span>
            ))}
            {presence.length > 0 && (
              <span className="presence-label">{presence.join(', ')} editing</span>
            )}
          </div>
          <div className="doc-save-status">
            {saveStatus === 'saving' && <span className="save-saving">● saving…</span>}
            {saveStatus === 'saved'  && <span className="save-saved">✓ saved</span>}
            {lastEditor && saveStatus === '' && (
              <span className="save-info">last edit by {lastEditor}</span>
            )}
          </div>
        </div>

        {active && (
          <div className="doc-section-editor">
            {/* Editable section title */}
            <input
              className="doc-section-title-input"
              value={active.title}
              onChange={e => handleTitleChange(activeIdx, e.target.value)}
              placeholder="Section title"
            />
            <div className="doc-divider" style={{ borderColor: SECTION_COLORS[activeIdx % SECTION_COLORS.length] }} />
            <textarea
              className="doc-textarea"
              value={active.content}
              onChange={e => handleChange(activeIdx, e.target.value)}
              placeholder={`Write ${active.title} notes here…\n\nSupports plain text. Use markdown-style formatting:\n# Heading\n## Sub-heading\n- bullet point\n**bold**`}
              spellCheck={false}
            />
          </div>
        )}

        {sections.length === 0 && (
          <div className="doc-empty">
            <p>No sections yet. Add one using the + button.</p>
          </div>
        )}
      </div>
    </div>
  );
}
