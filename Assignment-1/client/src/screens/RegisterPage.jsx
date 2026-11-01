import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { authAPI } from '../services/api';

export default function RegisterPage({ onNavigate }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const data = await authAPI.register({
        name: fullName,
        email,
        password,
      });
      if (data && data.success) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        onNavigate('home');
      } else {
        setError(data?.message || 'Registration failed');
      }
    } catch (e) {
      setError(e.message);
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
        backgroundImage: 'linear-gradient(180deg, rgba(7, 10, 19, 0.45) 0%, rgba(7, 10, 19, 0.9) 100%), url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80")',
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
          <h1 className="auth-hero-title" style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px' }}>
            Join the Watch Party<br />
            <span style={{
              background: 'linear-gradient(90deg, #60a5fa, #c084fc, #f43f5e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Community</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Create your account and start watching with friends, get AI insights, and discover new favorites.
          </p>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          © 2026 WatchSpace AI. Free tier available.
        </div>
      </div>

      {/* Right Form Side */}
      <div className="auth-form-pane" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div className="glass-card auth-card" style={{
          width: '100%',
          maxWidth: '430px',
          padding: '36px 34px',
          background: 'rgba(13, 20, 36, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div className="register-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '22px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create Account</h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Already have an account?{' '}
              <a href="#login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                Login
              </a>
            </span>
          </div>

          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>
                Full name
              </label>
              <input
                type="text"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>
                Email address
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>
                Password
              </label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>
                Confirm password
              </label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Create Account
            </button>
          </form>

          <p style={{ marginTop: '18px', fontSize: '0.75rem', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
            By creating an account, you agree to our{' '}
            <span style={{ color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span> and{' '}
            <span style={{ color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
