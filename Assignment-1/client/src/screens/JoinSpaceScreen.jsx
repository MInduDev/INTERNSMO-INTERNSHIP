import React, { useState } from 'react';
import { Sparkles, Users, ArrowRight } from 'lucide-react';
import { spacesAPI } from '../services/api';

export default function JoinSpaceScreen({ onNavigate, onOpenCreateModal, onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a valid room code');
      return;
    }

    setIsJoining(true);
    setErrorMsg('');

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await spacesAPI.join(cleanCode, {
        name: storedUser.name,
        avatar: storedUser.avatar
      });

      if (res && res.success === false) {
        setErrorMsg(res.message || 'Room not found or space has already concluded.');
        setIsJoining(false);
        return;
      }

      if (onJoinRoom) {
        onJoinRoom(cleanCode);
      }
      onNavigate('lobby');
    } catch (err) {
      console.warn('Could not join via API:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Unable to join this space. The room may have concluded.';
      setErrorMsg(serverMsg);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '44px 36px',
        textAlign: 'center',
        background: 'rgba(13, 20, 36, 0.95)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Brand Icon */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
        }}>
          <Sparkles size={28} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '8px' }}>
          Join a Watch Space
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '28px' }}>
          Enter the room code shared by your friend and start watching together with real-time AI insights.
        </p>

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
              Room Code
            </label>
            <input
              type="text"
              className="input-field"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter the room code"
              style={{
                textAlign: 'center',
                fontSize: '1.3rem',
                fontWeight: 700,
                letterSpacing: '4px',
                padding: '14px',
                fontFamily: 'var(--font-mono)'
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '1rem', marginBottom: '10px' }}
          >
            Join Space
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginBottom: '20px' }}
          >
            Back to Dashboard
          </button>
        </form>

        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Don't have a code?{' '}
          <span
            onClick={onOpenCreateModal}
            style={{ color: '#a855f7', fontWeight: 600, cursor: 'pointer' }}
          >
            Create a new space
          </span>
        </p>
      </div>
    </div>
  );
}
