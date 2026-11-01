import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, RotateCcw, Clock } from 'lucide-react';

export default function HostDisconnectedScreen({ onNavigate, movie }) {
  const [secondsWaiting, setSecondsWaiting] = useState(14);
  const backdrop = movie?.backdrop || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80';

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsWaiting(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(180deg, rgba(7, 10, 19, 0.85) 0%, rgba(7, 10, 19, 0.98) 100%), url("${backdrop}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '40px 20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '44px 36px',
        textAlign: 'center',
        background: 'rgba(13, 20, 36, 0.92)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Warning Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#ef4444'
        }}>
          <AlertTriangle size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          Host Disconnected
        </h2>

        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '24px' }}>
          The host has lost connection. Playback is temporarily paused to preserve synchronization.
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '10px',
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: '#cbd5e1',
          marginBottom: '28px'
        }}>
          <Clock size={14} color="#facc15" />
          <span>Waiting elapsed: <strong>{secondsWaiting}s</strong> (Timeout in 60s)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => onNavigate('watch-room')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
          >
            <RotateCcw size={16} className="spin-slow" />
            Waiting for host to reconnect...
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '11px' }}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
