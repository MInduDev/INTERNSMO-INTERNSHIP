import React, { useState, useEffect } from 'react';
import { X, Sparkles, Film, Users, Lock, Globe } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, spacesAPI } from '../services/api';

export default function CreateSpaceModal({ isOpen, onClose, onCreated, movie: initialMovie, currentUser }) {
  const { data: moviesData } = useFetch(() => moviesAPI.getAll());
  const movies = Array.isArray(moviesData) ? moviesData : (moviesData?.movies || []);

  const [roomName, setRoomName] = useState('Friday Movie Night');
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [copilotMode, setCopilotMode] = useState('normal');
  const [sceneVoting, setSceneVoting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMovie?.id || initialMovie?._id || initialMovie?.slug) {
      setSelectedMovieId(initialMovie.id || initialMovie._id || initialMovie.slug);
    } else if (movies.length > 0 && !selectedMovieId) {
      setSelectedMovieId(movies[0].id || movies[0]._id || movies[0].slug);
    }
  }, [initialMovie, movies]);

  if (!isOpen) return null;

  const currentMovie = movies.find(m => (m.id || m._id || m.slug) === selectedMovieId) || initialMovie || movies[0] || {
    title: 'Dune',
    slug: 'dune',
    year: '2024',
    duration: '2h 46m',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let activeUser = currentUser;
      if (!activeUser || !activeUser.name) {
        try {
          activeUser = JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
          activeUser = {};
        }
      }

      const hostName = activeUser?.name || 'Host';
      const hostAvatar = activeUser?.avatar;

      const result = await spacesAPI.create({
        title: roomName,
        movieSlug: currentMovie.slug || currentMovie.id,
        movieTitle: currentMovie.title,
        visibility: visibility === 'public' ? 'Public' : 'Private',
        aiCoPilotLevel: copilotMode.charAt(0).toUpperCase() + copilotMode.slice(1),
        sceneVotingEnabled: sceneVoting,
        hostName,
        hostAvatar
      });

      const createdSpace = result?.space;
      onCreated({
        name: roomName,
        visibility,
        copilotMode,
        sceneVoting,
        movie: currentMovie,
        code: createdSpace?.code,
        space: createdSpace
      });
    } catch (err) {
      console.warn('Failed to create space on server:', err);
      onCreated({
        name: roomName,
        visibility,
        copilotMode,
        sceneVoting,
        movie: currentMovie
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '24px',
        background: '#0d1424',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>Create Watch Space</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Movie Preview */}
        <div style={{
          display: 'flex',
          gap: '14px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '12px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <img
            src={currentMovie.poster}
            alt={currentMovie.title}
            style={{ width: '48px', height: '64px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1 }}>
            {movies.length > 1 ? (
              <select
                value={selectedMovieId}
                onChange={(e) => setSelectedMovieId(e.target.value)}
                className="input-field"
                style={{ padding: '4px 8px', fontSize: '0.85rem', marginBottom: '4px' }}
              >
                {movies.map((m) => (
                  <option key={m.id || m._id || m.slug} value={m.id || m._id || m.slug}>
                    {m.title}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{currentMovie.title}</div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              {currentMovie.year} • {currentMovie.duration}
            </div>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              color: '#a855f7',
              marginTop: '4px'
            }}>
              Room Name: {roomName || 'Untitled Space'}
            </div>
          </div>
        </div>

        {/* Room Name Input */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
            Room Name
          </label>
          <input
            type="text"
            className="input-field"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Friday Movie Night"
          />
        </div>

        {/* Visibility */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '8px' }}>
            Visibility
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => setVisibility('public')}
              style={{
                border: `1px solid ${visibility === 'public' ? '#ff2a54' : 'rgba(255,255,255,0.1)'}`,
                background: visibility === 'public' ? 'rgba(255, 42, 84, 0.1)' : 'rgba(255,255,255,0.02)',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                <Globe size={14} color={visibility === 'public' ? '#ff2a54' : '#94a3b8'} />
                Public
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                Anyone with the code can join
              </div>
            </div>

            <div
              onClick={() => setVisibility('private')}
              style={{
                border: `1px solid ${visibility === 'private' ? '#ff2a54' : 'rgba(255,255,255,0.1)'}`,
                background: visibility === 'private' ? 'rgba(255, 42, 84, 0.1)' : 'rgba(255,255,255,0.02)',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                <Lock size={14} color={visibility === 'private' ? '#ff2a54' : '#94a3b8'} />
                Private
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                Only invited people can join
              </div>
            </div>
          </div>
        </div>

        {/* AI Co-Pilot Level */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '8px' }}>
            AI Co-Pilot Level
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['minimal', 'normal', 'chatty'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCopilotMode(level)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${copilotMode === level ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                  background: copilotMode === level ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                  color: copilotMode === level ? '#c084fc' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Scene Voting Checkbox */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255,255,255,0.03)',
          padding: '10px 12px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <input
            type="checkbox"
            id="sceneVotingCheck"
            checked={sceneVoting}
            onChange={(e) => setSceneVoting(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#ff2a54', cursor: 'pointer' }}
          />
          <label htmlFor="sceneVotingCheck" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
            <strong>Scene Voting:</strong> Enable group audience voting
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {isSubmitting ? 'Creating Space...' : 'Create Watch Space'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
