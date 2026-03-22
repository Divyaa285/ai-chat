import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import '../styles/LoginPage.css'; 
const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const res = await axios.post(`${BACKEND}/api/auth/google`, {
          token: tokenResponse.access_token,
          user_info: userInfo.data
        });
        onLogin({ ...res.data, token: tokenResponse.access_token });
      } catch (err) {
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed.')
  });

  return (
    <>

      <div className="login-root">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />

        <div className="login-card">
          <div className="brand-row">
            <div className="brand-icon">🤖</div>
            <span className="brand-name">NexusAI</span>
          </div>

          <h1 className="login-headline">Think beyond<br />limits.</h1>
          <p className="login-sub">Powered by Google Gemini. Your intelligent companion for every conversation.</p>

          {error && <div className="error-box">⚠️ {error}</div>}

          <button className="google-btn" onClick={() => login()} disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Signing in...</>
            ) : (
              <>
                <img src="https://developers.google.com/identity/images/g-logo.png" alt="G" style={{ width: 20 }} />
                Continue with Google
              </>
            )}
          </button>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">WHAT YOU GET</span>
            <div className="divider-line" />
          </div>

          <div className="features">
            {['✦ Gemini 2.5 Flash', '✦ Chat History', '✦ Markdown Support', '✦ Multi-Session'].map(f => (
              <div key={f} className="feature-pill">{f}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
