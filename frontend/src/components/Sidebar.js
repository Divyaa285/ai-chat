import React, { useState } from 'react';
import '../styles/Sidebar.css'; 
export default function Sidebar({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, user, onProfileClick }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(c =>
    (c.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
     

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">🤖</div>
            <span className="sidebar-title">NexusAI</span>
          </div>
          <button className="new-chat-btn" onClick={onNewChat} title="New Chat">+</button>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>

        <div className="sidebar-section-label">Conversations</div>

        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="empty-chats">
              <div className="empty-icon">💬</div>
              No conversations yet.<br />Click + to begin.
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="no-results">
              🔎<br />No chats match<br />"{searchQuery}"
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
                onMouseEnter={() => setHoveredId(chat.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span className="chat-item-icon">💬</span>
                <span className="chat-item-name" title={chat.title}>{chat.title || 'New Chat'}</span>
                <button
                  className="delete-btn"
                  onClick={e => { e.stopPropagation(); onDeleteChat(chat.id); }}
                  title="Delete"
                >✕</button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer" onClick={onProfileClick}>
          <div className="user-row">
          {user.picture ? (
                  <img 
                    src={user.picture} 
                    alt="avatar" 
                    className="user-avatar" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                    e.target.style.display = 'none'; 
      
               }}
           />
) : (
  <div className="user-avatar-placeholder">{user.name?.[0] || 'U'}</div>
)}
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <span className="user-caret">⚙</span>
          </div>
        </div>
      </div>
    </>
  );
}
