import React, { useState } from 'react';
import { Play, Copy, Check, Users, Sparkles, Settings, ArrowLeft, Shield, Volume2 } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { spacesAPI } from '../services/api';

export default function LobbyScreen({ onNavigate, roomCode = 'ABC123', movie }) {
  const [copied, setCopied] = useState(false);
  const { data: spaceData, loading } = useFetch(() => roomCode ? spacesAPI.getByCode(roomCode) : null, [roomCode]);

  const space = spaceData?.space;
  const displayMovie = movie || space?.movie || {
    title: space?.title || 'Watch Party',
    description: 'Synchronized Watch Space room.',
    backdrop: space?.movie?.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80'
  };

  const participants = space?.participants || [];
  const readyCount = participants.filter(p => p.isReady || p.active).length;
  const isEnded = space?.status === 'ended';

  const handleCopy = () => {
    navigator.clipboard?.writeText(window.location.origin + '?room=' + roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isEnded) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '40px 32px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(13, 20, 36, 0.95)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Shield size={30} color="#f87171" />
          </div>
          <span className="badge badge-pill" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', marginBottom: '12px' }}>
            Room: {roomCode} • Status: Concluded
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '10px 0 8px' }}>
            Watch Space Concluded
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 28px' }}>
            This watch party for <strong style={{ color: '#f8fafc' }}>{displayMovie.title}</strong> has already ended. Live playback and party voting are closed, but you can inspect the full session analytics.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('analytics')}
              className="btn btn-primary"
              style={{ gap: '8px', padding: '12px 24px' }}
            >
              📊 View Session Summary
            </button>
            <button
              onClick={() => onNavigate('my-spaces')}
              className="btn btn-secondary"
              style={{ padding: '12px 24px' }}
            >
              Back to My Spaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="lobby-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={16} /> Exit Lobby
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 
                onClick={() => onNavigate('movie-details')}
                style={{ fontSize: '1.4rem', fontWeight: 800, cursor: 'pointer' }}
                title="View Movie Details"
              >
                {displayMovie.title}
              </h2>
              <span className="badge badge-ai">Room: {roomCode}</span>
              {isEnded && (
                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                  Concluded
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Host: {space?.host?.name || 'Host'} • {isEnded ? 'Session ended' : `${readyCount} Participants ready`}
            </div>
          </div>
        </div>

        <div className="lobby-header-actions" style={{ display: 'flex', gap: '12px' }}>
          {isEnded ? (
            <>
              <button onClick={() => onNavigate('my-spaces')} className="btn btn-secondary">
                Back to My Spaces
              </button>
              <button
                onClick={() => onNavigate('analytics')}
                className="btn btn-primary"
                style={{ padding: '10px 22px', gap: '6px' }}
              >
                📊 View Session Summary
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCopy} className="btn btn-secondary">
                {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                {copied ? 'Link Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => onNavigate('watch-room')}
                className="btn btn-primary"
                style={{ padding: '10px 22px' }}
              >
                <Play size={16} fill="#fff" />
                Start Watching
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Lobby Layout */}
      <div className="lobby-layout" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px' }}>
        {/* Left: Movie Stage Preview */}
        <div className="glass-card" style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          minHeight: '440px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '30px',
          backgroundImage: `linear-gradient(180deg, rgba(7, 10, 19, 0.2) 0%, rgba(7, 10, 19, 0.95) 100%), url("${displayMovie.backdrop || displayMovie.poster}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Waiting / Concluded Badge */}
          <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
            {isEnded ? (
              <span className="badge badge-pill" style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', backdropFilter: 'blur(8px)', padding: '6px 14px' }}>
                🛑 Watch Space Concluded
              </span>
            ) : (
              <span className="badge badge-pill" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '6px 12px' }}>
                <Users size={14} color="#38bdf8" /> Waiting for all participants to get snacks...
              </span>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>{displayMovie.title}</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', maxWidth: '500px', marginBottom: '20px' }}>
              {isEnded ? 'This watch party has finished. All participants have disconnected and playback is closed.' : displayMovie.description}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              {isEnded ? (
                <button
                  onClick={() => onNavigate('analytics')}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', gap: '8px' }}
                >
                  📊 View Session Summary
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('watch-room')}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px' }}
                >
                  <Play size={16} fill="#fff" />
                  Launch Watch Room
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Participants + Room Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Participants Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#6366f1" />
                Participants ({readyCount}/{participants.length || 1})
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>● Ready</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {participants.map((person, idx) => (
                <div
                  key={person.id || person._id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: person.active !== false && person.isOnline !== false ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    opacity: person.active !== false && person.isOnline !== false ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={person.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={person.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{person.name}</div>
                      <div style={{ fontSize: '0.72rem', color: person.role === 'Host' ? '#ff2a54' : '#94a3b8' }}>
                        {person.role || 'Viewer'}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${person.isReady || person.active ? 'badge-pill' : ''}`} style={{ fontSize: '0.7rem' }}>
                    {person.isReady || person.active ? 'Ready' : 'Invited'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Room Settings */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={16} color="#a855f7" />
              Room Settings
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>AI Co-Pilot:</span>
                <span style={{ color: '#c084fc', fontWeight: 600 }}>{space?.aiCoPilotLevel || 'Normal'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Scene Voting:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{space?.sceneVotingEnabled !== false ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Max Participants:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>10</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', alignItems: 'center' }}>
                <span>Invite Code:</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  color: '#facc15',
                  background: 'rgba(250, 204, 21, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  {roomCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
