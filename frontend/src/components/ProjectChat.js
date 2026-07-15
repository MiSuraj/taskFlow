import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api';
import { SOCKET_URL } from '../config';

const EMOJIS = ['👍','👎','❤️','😂','🎉','🔥','👀','✅','❌','🚀','💯','🤔','😅','💪','🙏'];

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, currentUser, onReact, members }) {
  const isMine = msg.sender?._id === currentUser.id || msg.sender?.username === currentUser.username;
  const [showEmoji, setShowEmoji] = useState(false);

  const renderText = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@')
        ? <span key={i} className="mention">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className={`msg-row ${isMine ? 'msg-mine' : 'msg-theirs'}`}>
      {!isMine && (
        <div className="msg-avatar" title={msg.sender?.username}>
          {(msg.sender?.username || '?')[0].toUpperCase()}
        </div>
      )}
      <div className="msg-body">
        {!isMine && <span className="msg-author">{msg.sender?.username}</span>}
        <div className="msg-bubble-wrap">
          <div className={`msg-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
            <p className="msg-text">{renderText(msg.text)}</p>
            <span className="msg-time">{formatTime(msg.createdAt)}</span>
          </div>
          <button className="emoji-trigger" onClick={() => setShowEmoji(v => !v)}>＋</button>
          {showEmoji && (
            <div className="emoji-popup">
              {EMOJIS.map(e => (
                <button key={e} className="emoji-opt" onClick={() => { onReact(msg._id, e); setShowEmoji(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        {msg.reactions?.length > 0 && (
          <div className="msg-reactions">
            {msg.reactions.map((r, i) => (
              <button key={i} className="reaction-chip" onClick={() => onReact(msg._id, r.emoji)}>
                {r.emoji} {r.users?.length}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectChat({ projectId, currentUser, projectMembers = [] }) {
  const [rooms,        setRooms]        = useState([]);
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState('');
  const [onlineUsers,  setOnlineUsers]  = useState([]);
  const [typingUsers,  setTypingUsers]  = useState([]);
  const [showMention,  setShowMention]  = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showQuickEmoji, setShowQuickEmoji] = useState(false);
  // manager: create room modal
  const [showNewRoom,  setShowNewRoom]  = useState(false);
  const [newRoomName,  setNewRoomName]  = useState('');
  const [newRoomMembers, setNewRoomMembers] = useState([]);
  // manager: manage room members
  const [showManage,   setShowManage]   = useState(false);

  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);
  const isManager   = currentUser.role === 'manager' || currentUser.role === 'admin';

  // ── Socket setup ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('online-users', setOnlineUsers);
    socket.on('chat-message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('chat-reaction', (updated) => setMessages(prev => prev.map(m => m._id === updated._id ? updated : m)));
    socket.on('typing', ({ username, isTyping }) => {
      setTypingUsers(prev =>
        isTyping ? [...new Set([...prev, username])] : prev.filter(u => u !== username)
      );
    });

    return () => socket.disconnect();
  }, []);

  // ── Join/leave room ──
  useEffect(() => {
    if (!activeRoom) return;
    const socket = socketRef.current;
    socket.emit('join-chat', activeRoom._id);
    api.get(`/chat/messages/${activeRoom._id}`).then(({ data }) => setMessages(data));
    return () => socket.emit('leave-chat', activeRoom._id);
  }, [activeRoom]);

  // ── Load rooms ──
  const loadRooms = useCallback(async () => {
    const { data } = await api.get(`/chat/rooms/${projectId}`);
    setRooms(data);
    if (!activeRoom && data.length > 0) setActiveRoom(data[0]);
  }, [projectId, activeRoom]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // ── Scroll to bottom ──
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!text.trim() || !activeRoom) return;
    const mentionMatches = [...text.matchAll(/@(\w+)/g)].map(m => m[1]);
    const mentions = projectMembers
      .filter(u => mentionMatches.includes(u.username))
      .map(u => u._id);
    socketRef.current.emit('chat-message', { roomId: activeRoom._id, text: text.trim(), mentions });
    setText('');
    setShowQuickEmoji(false);
    socketRef.current.emit('typing', { roomId: activeRoom._id, isTyping: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') { setShowMention(false); setShowQuickEmoji(false); }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    // Mention autocomplete
    const match = val.match(/@(\w*)$/);
    if (match) { setMentionQuery(match[1]); setShowMention(true); }
    else { setShowMention(false); }
    // Typing indicator
    socketRef.current?.emit('typing', { roomId: activeRoom?._id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId: activeRoom?._id, isTyping: false });
    }, 1500);
  };

  const insertMention = (username) => {
    setText(prev => prev.replace(/@\w*$/, `@${username} `));
    setShowMention(false);
  };

  const insertEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowQuickEmoji(false);
  };

  const handleReact = (msgId, emoji) => {
    socketRef.current?.emit('chat-react', { messageId: msgId, emoji, roomId: activeRoom?._id });
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    const { data } = await api.post('/chat/rooms', {
      name: newRoomName.trim(), projectId, memberIds: newRoomMembers,
    });
    setRooms(prev => [...prev, data]);
    setActiveRoom(data);
    setNewRoomName(''); setNewRoomMembers([]); setShowNewRoom(false);
  };

  const addMemberToRoom = async (userId) => {
    const { data } = await api.patch(`/chat/rooms/${activeRoom._id}/members`, { userId });
    setRooms(prev => prev.map(r => r._id === data._id ? data : r));
    setActiveRoom(data);
  };

  const removeMemberFromRoom = async (userId) => {
    const { data } = await api.delete(`/chat/rooms/${activeRoom._id}/members/${userId}`);
    setRooms(prev => prev.map(r => r._id === data._id ? data : r));
    setActiveRoom(data);
  };

  const deleteRoom = async (roomId) => {
    await api.delete(`/chat/rooms/${roomId}`);
    setRooms(prev => prev.filter(r => r._id !== roomId));
    if (activeRoom?._id === roomId) setActiveRoom(rooms.find(r => r._id !== roomId) || null);
  };

  const mentionSuggestions = projectMembers.filter(u =>
    u.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) && u.username !== currentUser.username
  );

  const notInRoom = projectMembers.filter(u =>
    !activeRoom?.members?.some(m => (m._id || m) === u._id)
  );

  const isOnline = (username) => onlineUsers.includes(username);

  return (
    <div className="chat-container">
      {/* Room sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span>💬 Channels</span>
          {isManager && (
            <button className="icon-btn" onClick={() => setShowNewRoom(true)} title="New channel">+</button>
          )}
        </div>

        {rooms.length === 0 && <p className="sidebar-empty">No channels yet{isManager ? '. Create one!' : '.'}</p>}
        {rooms.map(r => (
          <div key={r._id} className={`chat-room-item ${activeRoom?._id === r._id ? 'active' : ''}`}
            onClick={() => setActiveRoom(r)}>
            <span className="chat-room-name"># {r.name}</span>
            <span className="chat-room-members">{r.members?.length || 0} members</span>
          </div>
        ))}

        {/* Online presence */}
        <div className="online-section">
          <p className="online-title">👥 Online ({onlineUsers.length})</p>
          {projectMembers.map(u => (
            <div key={u._id} className="online-row">
              <span className={`online-dot ${isOnline(u.username) ? 'dot-online' : 'dot-offline'}`} />
              <span className="online-name">{u.username}</span>
              {isOnline(u.username) && <span className="online-tag">online</span>}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat main */}
      <div className="chat-main">
        {!activeRoom ? (
          <div className="chat-empty">
            <p>{isManager ? 'Create a channel to start chatting.' : 'No channels available yet.'}</p>
          </div>
        ) : (
          <>
            {/* Room header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <span className="chat-room-title"># {activeRoom.name}</span>
                <span className="chat-member-count">{activeRoom.members?.length || 0} members</span>
              </div>
              {isManager && (
                <div className="chat-header-actions">
                  <button className="btn btn-xs btn-assign" onClick={() => setShowManage(v => !v)}>
                    ⚙️ Manage
                  </button>
                  <button className="btn btn-xs btn-delete" onClick={() => deleteRoom(activeRoom._id)}>
                    🗑
                  </button>
                </div>
              )}
            </div>

            {/* Manage members panel */}
            {showManage && (
              <div className="chat-manage-panel">
                <p className="manage-title">Members</p>
                <div className="manage-members">
                  {(activeRoom.members || []).map(m => {
                    const member = typeof m === 'object' ? m : projectMembers.find(u => u._id === m);
                    if (!member) return null;
                    return (
                      <span key={member._id} className="manage-member-chip">
                        <span className={`online-dot ${isOnline(member.username) ? 'dot-online' : 'dot-offline'}`} />
                        {member.username}
                        <button onClick={() => removeMemberFromRoom(member._id)}>×</button>
                      </span>
                    );
                  })}
                </div>
                {notInRoom.length > 0 && (
                  <div className="manage-add-row">
                    <select className="assign-select" defaultValue=""
                      onChange={e => { if (e.target.value) addMemberToRoom(e.target.value); }}>
                      <option value="">Add member…</option>
                      {notInRoom.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-no-msgs">No messages yet. Say something! 👋</div>
              )}
              {messages.map(msg => (
                <MessageBubble key={msg._id} msg={msg} currentUser={currentUser}
                  onReact={handleReact} members={projectMembers} />
              ))}
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>
                  <span className="typing-dots"><span/><span/><span/></span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="chat-input-area">
              {showMention && mentionSuggestions.length > 0 && (
                <div className="mention-popup">
                  {mentionSuggestions.map(u => (
                    <button key={u._id} className="mention-option" onClick={() => insertMention(u.username)}>
                      <span className={`online-dot ${isOnline(u.username) ? 'dot-online' : 'dot-offline'}`} />
                      @{u.username}
                    </button>
                  ))}
                </div>
              )}
              {showQuickEmoji && (
                <div className="quick-emoji-bar">
                  {EMOJIS.map(e => (
                    <button key={e} className="emoji-opt" onClick={() => insertEmoji(e)}>{e}</button>
                  ))}
                </div>
              )}
              <div className="chat-input-row">
                <button className="chat-tool-btn" onClick={() => setShowQuickEmoji(v => !v)} title="Emoji">😊</button>
                <textarea
                  className="chat-input"
                  placeholder={`Message #${activeRoom.name}  (@ to mention)`}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button className="btn btn-pick chat-send-btn" onClick={send} disabled={!text.trim()}>
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New room modal */}
      {showNewRoom && (
        <div className="modal-overlay" onClick={() => setShowNewRoom(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>💬 New Channel</h3>
            <label>Channel name</label>
            <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
              placeholder="e.g. general" autoFocus />
            <label style={{ marginTop: 12 }}>Add members</label>
            <div className="new-room-members">
              {projectMembers.filter(u => u.username !== currentUser.username).map(u => (
                <label key={u._id} className="member-check">
                  <input type="checkbox" checked={newRoomMembers.includes(u._id)}
                    onChange={e => setNewRoomMembers(prev =>
                      e.target.checked ? [...prev, u._id] : prev.filter(id => id !== u._id)
                    )} />
                  <span className={`online-dot ${isOnline(u.username) ? 'dot-online' : 'dot-offline'}`} />
                  {u.username} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({u.role})</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setShowNewRoom(false)}>Cancel</button>
              <button className="btn btn-create" onClick={createRoom} disabled={!newRoomName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
