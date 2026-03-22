import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfileModal from '../components/ProfileModal';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ChatPage({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${user.token}` };

  useEffect(() => { fetchChats(); }, []);

  useEffect(() => {
    if (activeChatId) fetchMessages(activeChatId);
    else setMessages([]);
  }, [activeChatId]);

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/chats`, { headers });
      setChats(res.data);
      if (res.data.length > 0) setActiveChatId(res.data[0].id);
    } catch (err) {
      setError('Failed to load chats.');
    }
  };

  const fetchMessages = async (chatId) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${BACKEND}/api/chats/${chatId}/messages`, { headers });
      setMessages(res.data);
    } catch (err) {
      setError('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post(`${BACKEND}/api/chats`, { title: 'New Chat' }, { headers });
      setChats(prev => [res.data, ...prev]);
      setActiveChatId(res.data.id);
      setMessages([]);
      return res.data.id;
    } catch (err) {
      setError('Failed to create chat.');
      return null;
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`${BACKEND}/api/chats/${chatId}`, { headers });
      const remaining = chats.filter(c => c.id !== chatId);
      setChats(remaining);
      if (activeChatId === chatId) {
        if (remaining.length > 0) setActiveChatId(remaining[0].id);
        else { setActiveChatId(null); setMessages([]); }
      }
    } catch (err) {
      setError('Failed to delete chat.');
    }
  };

  const sendMessage = async (text, files = [], chatId = null) => {
    if (!text.trim() && files.length === 0) return;

    let targetChatId = chatId || activeChatId;
    if (!targetChatId) {
      targetChatId = await createNewChat();
      if (!targetChatId) return;
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      message: text,
      files: files.map(f => ({ ...f, id: f.id || Date.now() + Math.random() })),
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    setError('');

    try {
      const filesPayload = files.map(({ preview, ...rest }) => rest);
      const res = await axios.post(
        `${BACKEND}/api/chats/${targetChatId}/messages`,
        { message: text, files: filesPayload },
        { headers }
      );
      const aiMsg = { id: Date.now() + 1, role: 'assistant', message: res.data.reply };
      setMessages(prev => [...prev, aiMsg]);
      setChats(prev => prev.map(c =>
        c.id === targetChatId ? { ...c, title: res.data.chat_title } : c
      ));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  // Cut history at edited message, then resend
  const editMessage = async (messageId, newText) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    setMessages(messages.slice(0, msgIndex));
    await sendMessage(newText, [], activeChatId);
  };

  const clearChat = async () => {
    if (!activeChatId) return;
    try {
      await axios.delete(`${BACKEND}/api/chats/${activeChatId}/messages`, { headers });
      setMessages([]);
      setError('');
    } catch (err) {
      setError('Failed to clear chat.');
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setError(''); }}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        user={user}
        onProfileClick={() => setShowProfile(true)}
      />
      <ChatWindow
        messages={messages}
        onSend={sendMessage}
        onEdit={editMessage}
        onClear={clearChat}
        loading={loading}
        sending={sending}
        error={error}
        chatTitle={chats.find(c => c.id === activeChatId)?.title || 'New Chat'}
      />
      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onLogout={onLogout} />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: '#0f0f0f',
    overflow: 'hidden',
  },
};
