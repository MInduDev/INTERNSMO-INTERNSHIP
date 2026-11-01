import React, { useState } from 'react';
import { Users, Clock, Play, Plus, Eye, Calendar, Sparkles, LogIn } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, spacesAPI } from '../services/api';

export default function MySpacesScreen({ onNavigate, onOpenCreateModal, onSelectMovie, onJoinRoom }) {
  const [filterTab, setFilterTab] = useState('active'); // active, upcoming, past

  // Fetch user spaces from backend
  const { data: spacesData = [], loading: spacesLoading } = useFetch(() => spacesAPI.getMySpaces());
  // Fetch all movies for poster lookup
  const { data: movies = [], loading: moviesLoading } = useFetch(() => moviesAPI.getAll());

  const spaces = Array.isArray(spacesData) ? spacesData : (spacesData?.spaces || []);
  const moviesList = Array.isArray(movies) ? movies : (movies?.movies || []);

  if ((spacesLoading || moviesLoading) && spaces.length === 0) {
    return (
      <div className="my-spaces-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
        <p style={{ color: '#94a3b8' }}>Loading your spaces…</p>
      </div>
    );
  }

  // Organize spaces into categories
  const categorized = { active: [], upcoming: [], past: [] };
  spaces.forEach((space) => {
    const statusStr = (typeof space.status === 'string' ? space.status : '').toLowerCase();
    const category = statusStr.includes('now') || statusStr.includes('active') || statusStr.includes('lobby') || !space.status
      ? 'active'
      : statusStr.includes('tomorrow') || statusStr.includes('pm') || statusStr.includes('upcoming')
        ? 'upcoming'
        : 'past';
    categorized[category].push(space);
  });

  const currentSpaces = categorized[filterTab] || [];



  return (
    <div style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>My Watch Spaces</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Manage and jump into your active, upcoming, or past synchronized viewing parties.
          </p>
        </div>


      </div>

      {/* Tabs Filter */}
      <div className="my-spaces-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'active', label: `Active (${categorized.active.length})` },
          { id: 'upcoming', label: `Upcoming (${categorized.upcoming.length})` },
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
        {currentSpaces.map((item) => {
          const movieTitle = typeof item.movie === 'string' ? item.movie : (item.movie?.title || item.title || 'Movie');
          const posterSrc = item.poster || item.movie?.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80';
          const hostName = typeof item.host === 'string' ? item.host : (item.host?.name || 'Host');
          const matchedMovie = moviesList.find(m => m.title?.toLowerCase().includes(movieTitle.toLowerCase())) || moviesList[0];

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
                <img
                  src={posterSrc}
                  alt={movieTitle}
                  style={{ width: '60px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4
                      onClick={() => {
                        if (onSelectMovie) onSelectMovie(matchedMovie);
                        onNavigate('movie-details');
                      }}
                      style={{ fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer' }}
                      title="View Movie Details"
                    >
                      {item.title}
                    </h4>
                    <span className="badge badge-pill" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {item.code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Title: <strong>{movieTitle}</strong> • Host: {hostName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#a855f7', marginTop: '4px' }}>
                    {typeof item.status === 'string' ? item.status : 'Active'}
                  </div>
                </div>
              </div>

              <div className="my-space-actions" style={{ display: 'flex', gap: '10px' }}>
                {filterTab === 'past' ? (
                  <>
                    <button
                      onClick={() => {
                        if (onJoinRoom) onJoinRoom(item.code);
                        if (onSelectMovie) onSelectMovie(matchedMovie);
                        onNavigate('analytics');
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', gap: '6px' }}
                    >
                      📊 View Summary
                    </button>
                    <button
                      onClick={() => {
                        if (onSelectMovie) onSelectMovie(matchedMovie);
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
                          if (onSelectMovie) onSelectMovie(matchedMovie);
                          if (onJoinRoom) onJoinRoom(item.code);
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
                          if (onSelectMovie) onSelectMovie(matchedMovie);
                          if (onJoinRoom) onJoinRoom(item.code);
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
                        if (onSelectMovie) onSelectMovie(matchedMovie);
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
      </div>
    </div>
  );
}
