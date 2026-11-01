import React, { useState } from 'react';
import { Sparkles, Mail, Lock, Film, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();

      const data = await authAPI.login(normalizedEmail, normalizedPassword);
      if (data && data.success) {
        const token = data.accessToken || data.token;
        localStorage.setItem('token', token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(data.user);
          }
          window.dispatchEvent(new CustomEvent('watchspace-user-updated', { detail: data.user }));
        }
        onNavigate('home');
      } else {
        setError(data?.message || 'Invalid email or password');
      }
    } catch (err) {
      setError(err.message || 'Login request failed. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      background: '#070a13'
    }}>
      {/* Left Hero Side */}
      <div className="auth-hero" style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        backgroundImage: 'linear-gradient(180deg, rgba(7, 10, 19, 0.4) 0%, rgba(7, 10, 19, 0.85) 100%), url("https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&auto=format&fit=crop&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(168, 85, 247, 0.5)'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            WatchSpace <span style={{ color: '#a855f7' }}>AI</span>
          </span>
        </div>

        {/* Hero Quote */}
        <div style={{ maxWidth: '480px' }}>
          <h1 className="auth-hero-title" style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px' }}>
            Watch Together.<br />
            <span style={{
              background: 'linear-gradient(90deg, #60a5fa, #c084fc, #f43f5e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Explore More.</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            AI-powered watch parties, real-time chat, smart insights and personalized synchronized viewing experiences.
          </p>

          <div className="auth-form-pane" style={{
            display: 'flex',
            gap: '16px',
            marginTop: '32px'
          }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#38bdf8' }}>Realtime</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Playback Sync</div>
            </div>
            <div style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a855f7' }}>Timeline AI</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Grounded Co-Pilot</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          © 2026 WatchSpace AI. Synchronized Streaming Platform.
        </div>
      </div>

      {/* Right Form Side */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div className="glass-card auth-card" style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 36px',
          background: 'rgba(13, 20, 36, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '6px' }}>Welcome Back!</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '28px' }}>
            Sign in to continue to WatchSpace AI
          </p>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rajat@watchspace.tv"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please register a new account or use password: password123'); }} style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '12px' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '22px 0',
            gap: '12px',
            color: '#475569',
            fontSize: '0.8rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '11px' }}
          >
            Create a new account
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: '#94a3b8' }}>
            Don't have an account?{' '}
            <span
              onClick={() => onNavigate('register')}
              style={{ color: '#a855f7', fontWeight: 600, cursor: 'pointer' }}
            >
              Register
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
