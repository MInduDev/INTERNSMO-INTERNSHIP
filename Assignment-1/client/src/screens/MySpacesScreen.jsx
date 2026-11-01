import React, { useState } from 'react';
import { Users, Clock, Play, Film } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, spacesAPI } from '../services/api';

export default function MySpacesScreen({ onNavigate, onOpenCreateModal, onSelectMovie, onJoinRoom }) {
  const [filterTab, setFilterTab] = useState('active');

  const { data: spacesData = [], loading: spacesLoading, error: spacesError } = useFetch(() => spacesAPI.getMySpaces());
  const { data: movies = [], loading: moviesLoading, error: moviesError } = useFetch(() => moviesAPI.getAll());

  const spaces = Array.isArray(spacesData) ? spacesData : (spacesData?.spaces || []);
  const moviesList = Array.isArray(movies) ? movies : (movies?.movies || []);

  if (spacesLoading && spaces.length === 0) {
    return (
      <div className="my-spaces-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
        <p style={{ color: '#94a3b8' }}>Loading your spaces…</p>
      </div>
    );
  }

  const categorized = { active: [], lobby: [], past: [] };
  spaces.forEach((space) => {
    const statusStr = (typeof space.status === 'string' ? space.status : '').toLowerCase();
    if (statusStr === 'active') categorized.active.push(space);
    else if (statusStr === 'lobby') categorized.lobby.push(space);
    else if (statusStr === 'ended') categorized.past.push(space);
  });

  const currentSpaces = categorized[filterTab] || [];



  return (
    <div style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>My Watch Spaces</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Watch Spaces are grouped by their status reported by the server.
          </p>
        </div>


      </div>

      {/* Tabs Filter */}
      <div className="my-spaces-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'active', label: `Active (${categorized.active.length})` },
          { id: 'lobby', label: `Lobby (${categorized.lobby.length})` },
          { id: 'past', label: `Past (${categorized.past.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: 'none',
              background: filterTab === tab.id ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255, 255, 255, 0.06)',
              color: filterTab === tab.id ? '#ffffff' : '#94a3b8',
              fontWeight: filterTab === tab.id ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Spaces List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {spacesError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load Watch Spaces: {spacesError.message}</p>}
        {moviesError && <p role="alert" style={{ color: '#fca5a5' }}>Movie details are unavailable: {moviesError.message}</p>}
        {moviesLoading && <p style={{ color: '#94a3b8' }}>Loading movie details…</p>}
        {currentSpaces.map((item) => {
          const movieTitle = typeof item.movie === 'string' ? item.movie : item.movie?.title;
          const posterSrc = item.poster || item.movie?.poster;
          const hostName = typeof item.host === 'string' ? item.host : item.host?.name;
          const matchedMovie = moviesList.find(m =>
            m.slug === item.movie?.slug ||
            String(m._id || m.id) === String(item.movie?._id || item.movie?.id) ||
            (movieTitle && m.title === movieTitle)
          );

          return (
            <div
              key={item._id || item.id || item.code}
              className="glass-card my-space-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div className="my-space-main" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {posterSrc
                  ? <img src={posterSrc} alt={movieTitle || ''} style={{ width: '60px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  : <div aria-hidden="true" style={{ width: '60px', height: '80px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.06)' }}><Film size={20} /></div>}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4
                      onClick={() => {
                        if (matchedMovie) onSelectMovie?.(matchedMovie);
                        onNavigate('movie-details');
                      }}
                      style={{ fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' }}
                      title={matchedMovie ? 'View Movie Details' : 'Movie details are not in the catalog'}
                    >
                      {item.title || 'Untitled Watch Space'}
                    </h4>
                    <span className="badge badge-pill" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {item.code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Title: <strong>{movieTitle || 'Not specified'}</strong>{hostName ? <> • Host: {hostName}</> : null}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#a855f7', marginTop: '4px' }}>
                    {item.status}
                  </div>
                </div>
              </div>

              <div className="my-space-actions" style={{ display: 'flex', gap: '10px' }}>
                {filterTab === 'past' ? (
                  <>
                    <button
                      onClick={() => {
                        onJoinRoom?.(item.code);
                        if (matchedMovie) onSelectMovie?.(matchedMovie);
                        onNavigate('analytics');
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', gap: '6px' }}
                    >
                      📊 View Summary
                    </button>
                    <button
                      disabled={!matchedMovie}
                      onClick={() => {
                        if (matchedMovie) onSelectMovie?.(matchedMovie);
                        onNavigate('movie-details');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px' }}
                    >
                      Movie Info
                    </button>
                  </>
                ) : (
                  <>
                    {filterTab === 'active' ? (
                      <button
                        onClick={() => {
                          if (matchedMovie) onSelectMovie?.(matchedMovie);
                          onJoinRoom?.(item.code);
                          onNavigate('watch-room');
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 18px' }}
                      >
                        <Play size={14} fill="#fff" /> Continue
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (matchedMovie) onSelectMovie?.(matchedMovie);
                          onJoinRoom?.(item.code);
                          onNavigate('lobby');
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 18px' }}
                      >
                        Join Lobby
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (matchedMovie) onSelectMovie?.(matchedMovie);
                        if (onJoinRoom) onJoinRoom(item.code);
                        onNavigate('lobby');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px' }}
                    >
                      View Details
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!spacesError && !spacesLoading && currentSpaces.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>
            No Watch Spaces with status “{filterTab}” were returned by the server.
          </p>
        )}
      </div>
    </div>
  );
}
