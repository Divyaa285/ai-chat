import React from 'react';
import '../styles/ProfileModal.css'; 

export default function ProfileModal({ user, onClose, onLogout }) {
  return (
    <>
     

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>

          <div className="modal-avatar-wrap">
            {user.picture
              ? <img src={user.picture} alt="avatar" className="modal-avatar" />
              : <div className="modal-avatar-placeholder">{user.name?.[0] || 'U'}</div>
            }
          </div>

          <div className="modal-name">{user.name}</div>
          <div className="modal-email">{user.email}</div>

          <div className="modal-badge">
            <span>✦</span> Google Account Connected
          </div>

          <div className="modal-info-grid">
            <div className="modal-info-row">
              <span className="modal-info-label">AI Model</span>
              <span className="modal-info-value">Gemini 2.5 Flash</span>
            </div>
            <div className="modal-info-row">
              <span className="modal-info-label">Plan</span>
              <span className="modal-info-value">Free Tier</span>
            </div>
            <div className="modal-info-row">
              <span className="modal-info-label">Status</span>
              <span className="modal-info-value" style={{ color: '#4ade80' }}>● Active</span>
            </div>
          </div>

          <button className="logout-btn" onClick={onLogout}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
