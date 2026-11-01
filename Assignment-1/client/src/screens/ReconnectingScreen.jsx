import React from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { resolveAssetUrl } from '../services/api';

export default function ReconnectingScreen({ onNavigate, movie, roomCode }) {
  const backdrop = movie?.backdrop;

  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: backdrop
        ? `linear-gradient(180deg, rgba(7, 10, 19, 0.85) 0%, rgba(7, 10, 19, 0.98) 100%), url("${resolveAssetUrl(backdrop)}")`
        : 'linear-gradient(135deg, #0f172a, #1e1b4b)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '40px 20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '44px 36px',
        textAlign: 'center',
        background: 'rgba(13, 20, 36, 0.94)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
      }}>
        <RefreshCw size={36} color="#818cf8" style={{ marginBottom: '18px' }} />
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          Connection interrupted
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '28px' }}>
          Return to {roomCode ? `Watch Space ${roomCode}` : 'the Watch Space'} to retry the authenticated connection and resynchronize playback.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => onNavigate('watch-room')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            <RefreshCw size={15} /> Retry Watch Room
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px' }}
          >
            <ArrowLeft size={15} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
