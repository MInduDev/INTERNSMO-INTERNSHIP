import React, { useState, useEffect } from 'react';
import { X, Sparkles, Film, Users, Lock, Globe } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, resolveAssetUrl, spacesAPI } from '../services/api';

export default function CreateSpaceModal({ isOpen, onClose, onCreated, movie: initialMovie, currentUser }) {
  const { data: moviesData = [], loading: moviesLoading, error: moviesError } = useFetch(() => moviesAPI.getAll());
  const movies = Array.isArray(moviesData) ? moviesData : (moviesData?.movies || []);

  const [roomName, setRoomName] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [copilotMode, setCopilotMode] = useState('normal');
  const [sceneVoting, setSceneVoting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialMovie?.id || initialMovie?._id || initialMovie?.slug) {
      setSelectedMovieId(initialMovie.id || initialMovie._id || initialMovie.slug);
    } else if (movies.length > 0 && !selectedMovieId) {
      setSelectedMovieId(movies[0].id || movies[0]._id || movies[0].slug);
    }
  }, [initialMovie, movies]);

  if (!isOpen) return null;

  const currentMovie = movies.find(m => (m.id || m._id || m.slug) === selectedMovieId) || initialMovie;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setSubmitError('Enter a name for this Watch Space.');
      return;
    }
    if (!currentMovie) {
      setSubmitError('Select a movie from the backend catalog before creating a space.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await spacesAPI.create({
        title: roomName,
        movieSlug: currentMovie.slug || currentMovie.id,
        movieTitle: currentMovie.title,
        visibility: visibility === 'public' ? 'Public' : 'Private',
        aiCoPilotLevel: copilotMode.charAt(0).toUpperCase() + copilotMode.slice(1),
        sceneVotingEnabled: sceneVoting,
        hostName: currentUser?.name,
        hostAvatar: currentUser?.avatar
      });

      const createdSpace = result?.space;
      if (result?.success === false || !createdSpace?.code) {
        throw new Error(result?.message || 'The server did not confirm Watch Space creation.');
      }
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
      setSubmitError(err.message || 'Could not create the Watch Space.');
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
          {currentMovie?.poster
            ? <img src={resolveAssetUrl(currentMovie.poster)} alt={currentMovie.title} style={{ width: '48px', height: '64px', borderRadius: '6px', objectFit: 'cover' }} />
            : <div aria-hidden="true" style={{ width: '48px', height: '64px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }}><Film size={18} /></div>}
          <div style={{ flex: 1 }}>
            {moviesLoading ? (
              <div style={{ color: '#94a3b8' }}>Loading movie catalog…</div>
            ) : movies.length > 1 ? (
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
            ) : currentMovie ? (
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{currentMovie.title}</div>
            ) : (
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fca5a5' }}>No movie selected</div>
            )}
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              {[currentMovie?.year, currentMovie?.duration].filter(Boolean).join(' • ')}
            </div>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              color: '#a855f7',
              marginTop: '4px'
            }}>
              Room Name: {roomName || 'Not set'}
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
            placeholder="Enter a Watch Space name"
          />
        </div>

        {(moviesError || submitError) && (
          <p role="alert" style={{ color: '#fca5a5', fontSize: '0.82rem', marginBottom: '14px' }}>
            {submitError || `Could not load movie catalog: ${moviesError.message}`}
          </p>
        )}

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
            disabled={isSubmitting || moviesLoading || Boolean(moviesError) || !currentMovie}
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
