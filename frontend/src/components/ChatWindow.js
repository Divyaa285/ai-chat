import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/ChatWindow.css';
export default function ChatWindow({ messages, onSend, onClear, onEdit, loading, sending, error, chatTitle }) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Auto-focus edit textarea
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [editingId]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = (msg) => {
    navigator.clipboard.writeText(msg.message);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEditStart = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.message);
  };

  const handleEditSave = (msg) => {
    if (editText.trim() && editText.trim() !== msg.message) {
      onEdit && onEdit(msg.id, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  // ── File processing ───────────────────────────────────────────────────────
  const processFile = (file) => {
    return new Promise((resolve) => {
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || /\.(js|ts|py|jsx|tsx|json|md|html|css|csv|xml|yaml|yml|sh|sql)$/i.test(file.name);
      const isPDF = file.type === 'application/pdf';
      const reader = new FileReader();

      if (isImage) {
        reader.onload = (e) => resolve({
          id: Date.now() + Math.random(),
          name: file.name, type: 'image', mimeType: file.type, size: file.size,
          preview: e.target.result, data: e.target.result.split(',')[1],
        });
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.onload = (e) => resolve({
          id: Date.now() + Math.random(),
          name: file.name, type: 'text', mimeType: file.type || 'text/plain', size: file.size,
          content: e.target.result,
        });
        reader.readAsText(file);
      } else if (isPDF) {
        reader.onload = (e) => resolve({
          id: Date.now() + Math.random(),
          name: file.name, type: 'pdf', mimeType: 'application/pdf', size: file.size,
          preview: e.target.result, data: e.target.result.split(',')[1],
        });
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => resolve({
          id: Date.now() + Math.random(),
          name: file.name, type: 'binary', mimeType: file.type, size: file.size,
          data: e.target.result.split(',')[1],
        });
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFiles = async (files) => {
    const MAX_SIZE = 20 * 1024 * 1024;
    const validFiles = Array.from(files).slice(0, 5 - attachedFiles.length);
    const processed = await Promise.all(validFiles.filter(f => f.size <= MAX_SIZE).map(processFile));
    setAttachedFiles(prev => [...prev, ...processed]);
  };

  const handleFileInput = (e) => {
    if (e.target.files.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id));

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    const filePayload = attachedFiles.map(({ preview, ...rest }) => rest);
    onSend(input, filePayload);
    setInput('');
    setAttachedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type, mimeType) => {
    if (type === 'image') return '🖼';
    if (type === 'pdf') return '📄';
    if (mimeType?.includes('javascript') || mimeType?.includes('typescript')) return '📜';
    if (mimeType?.includes('python')) return '🐍';
    if (mimeType?.includes('json')) return '{}';
    if (type === 'text') return '📝';
    return '📎';
  };

  return (
    <>
     
      <div
        className={`chat-container${dragOver ? ' drop-zone-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.js,.ts,.jsx,.tsx,.py,.json,.html,.css,.csv,.xml,.yaml,.yml,.sh,.sql"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        {/* Top Bar */}
        <div className="chat-topbar">
          <div className="chat-topbar-left">
            <div className="topbar-dot" />
            <span className="topbar-title">{chatTitle}</span>
            <span className="topbar-model-badge">GEMINI 2.5</span>
          </div>
          <button className="clear-btn" onClick={onClear}>🗑 Clear Chat</button>
        </div>

        {/* Messages */}
        <div className="message-area">
          {loading && (
            <div className="loading-msg">
              <div className="loading-spinner" />
              Loading conversation...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-glow">🤖</div>
              <div className="empty-title">How can I help you?</div>
              <div className="empty-sub">Ask me anything — powered by Gemini 2.5 Flash. Attach files, hover to copy or edit.</div>
              <div className="suggestion-chips">
                {['✦ Explain quantum computing','✦ Write a Python script','✦ Summarize a topic','✦ Debug my code'].map(s => (
                  <div key={s} className="chip" onClick={() => onSend(s.replace('✦ ', ''), [])}>{s}</div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role === 'user' ? 'user' : ''}`}>
              <div className={`msg-avatar ${msg.role === 'user' ? 'user-av' : 'ai'}`}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>

              <div className="msg-content-wrap">
                {/* File attachments */}
                {msg.files && msg.files.length > 0 && (
                  <div className="msg-attachments">
                    {msg.files.map((file) => (
                      file.type === 'image' ? (
                        <div key={file.id} className="msg-file-image">
                          <img src={file.preview} alt={file.name} />
                        </div>
                      ) : (
                        <div key={file.id} className={`msg-file-chip ${msg.role === 'user' ? 'user-file' : ''}`}>
                          <span className="msg-file-icon">{getFileIcon(file.type, file.mimeType)}</span>
                          <div className="msg-file-info">
                            <span className="msg-file-name">{file.name}</span>
                            <span className="msg-file-size">{formatSize(file.size)}</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}

                {/* Bubble or inline edit */}
                {msg.message && (
                  editingId === msg.id ? (
                    <div style={{ width: '100%' }}>
                      <textarea
                        ref={editRef}
                        className="edit-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(msg); }
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        rows={Math.min(editText.split('\n').length + 1, 8)}
                      />
                      <div className="edit-actions">
                        <button className="edit-cancel-btn" onClick={handleEditCancel}>Cancel</button>
                        <button className="edit-save-btn" onClick={() => handleEditSave(msg)}>Save & Resend</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`msg-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                      {msg.role === 'assistant'
                        ? <ReactMarkdown>{msg.message}</ReactMarkdown>
                        : msg.message
                      }
                    </div>
                  )
                )}

                {/* Hover actions — shown when not in edit mode */}
                {editingId !== msg.id && msg.message && (
                  <div className="msg-actions">
                    {/* Copy — on all messages */}
                    <button
                      className={`action-btn ${copiedId === msg.id ? 'copied' : ''}`}
                      onClick={() => handleCopy(msg)}
                    >
                      {copiedId === msg.id ? '✓ Copied!' : '⎘ Copy'}
                    </button>
                    {/* Edit — only on user messages */}
                    {msg.role === 'user' && (
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEditStart(msg)}
                      >
                        ✎ Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="message-row">
              <div className="msg-avatar ai">🤖</div>
              <div className="msg-bubble ai">
                <div className="typing-indicator">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-banner">⚠️ {error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          {attachedFiles.length > 0 && (
            <div className="attached-files-strip">
              {attachedFiles.map((file) => (
                file.type === 'image' ? (
                  <div key={file.id} className="attached-file-pill has-preview">
                    <img src={file.preview} alt={file.name} className="pill-image-preview" />
                    <span className="pill-image-label">{file.name}</span>
                    <button className="pill-remove" onClick={() => removeFile(file.id)}>✕</button>
                  </div>
                ) : (
                  <div key={file.id} className="attached-file-pill">
                    <span style={{ fontSize: 16 }}>{getFileIcon(file.type, file.mimeType)}</span>
                    <span className="pill-name">{file.name}</span>
                    <button className="pill-remove" onClick={() => removeFile(file.id)}>✕</button>
                  </div>
                )
              ))}
            </div>
          )}

          <div className="input-wrapper">
            <button className="attach-btn" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={sending}>
              📎
            </button>
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={attachedFiles.length ? 'Ask about your files...' : 'Message NexusAI...'}
              rows={1}
              disabled={sending}
            />
            <button
              className={`send-btn ${(input.trim() || attachedFiles.length > 0) && !sending ? 'active' : 'inactive'}`}
              onClick={handleSend}
              disabled={(!input.trim() && attachedFiles.length === 0) || sending}
            >
              {sending ? '⏳' : '➤'}
            </button>
          </div>
          <div className="input-hint">📎 Attach · Hover to copy/edit · Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </>
  );
}
