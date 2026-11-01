import React from 'react';
import { Play, Plus, Clock, Users, HelpCircle, ChevronRight } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { authAPI, interactionsAPI, moviesAPI, resolveAssetUrl, spacesAPI } from '../services/api';

function durationInSeconds(duration) {
  if (typeof duration === 'number' && Number.isFinite(duration)) return duration * 60;
  if (typeof duration !== 'string') return null;
  const hours = Number(duration.match(/(\d+)\s*h/i)?.[1] || 0);
  const minutes = Number(duration.match(/(\d+)\s*m/i)?.[1] || 0);
  const seconds = Number(duration.match(/(\d+)\s*s/i)?.[1] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

function formatRemaining(seconds) {
  const minutes = Math.ceil(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m left` : `${minutes}m left`;
}

export default function HomeScreen({ onNavigate, onOpenCreateModal, onSelectMovie, onJoinRoom }) {
  const { data: moviesData, loading: moviesLoading, error: moviesError } = useFetch(() => moviesAPI.getAll());
  const { data: profile, loading: profileLoading, error: profileError } = useFetch(() => authAPI.getMe());
  const { data: historyData, loading: historyLoading, error: historyError } = useFetch(() => interactionsAPI.getMyHistory());
  const { data: spacesData, loading: spacesLoading, error: spacesError } = useFetch(() => spacesAPI.getMySpaces());

  const movies = Array.isArray(moviesData) ? moviesData : [];
  const history = Array.isArray(historyData) ? historyData : [];
  const spaces = Array.isArray(spacesData) ? spacesData : [];
  const user = profile?.user || profile;
  const featured = movies[0];
  const activeSpaces = spaces.filter(space => space.status === 'active' || space.status === 'lobby');
  const continueWatching = history
    .filter(interaction => !interaction.completed && Number(interaction.watchedSeconds) > 0)
    .map(interaction => {
      const movie = movies.find(item => item.slug === interaction.titleId);
      if (!movie) return null;
      const watchedSeconds = Number(interaction.watchedSeconds);
      const duration = durationInSeconds(movie.duration);
      const progress = duration ? Math.min(100, Math.round((watchedSeconds / duration) * 100)) : null;
      return {
        id: interaction._id || `${interaction.titleId}-${interaction.updatedAt || ''}`,
        movie,
        watchedSeconds,
        progress,
        timeLeft: duration ? formatRemaining(Math.max(0, duration - watchedSeconds)) : null
      };
    })
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="home-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {moviesLoading && movies.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '40px 0' }}>Loading movies from the server…</p>
      ) : moviesError ? (
        <p role="alert" style={{ color: '#fca5a5', padding: '24px 0' }}>
          Could not load the movie catalog: {moviesError.message}
        </p>
      ) : featured ? (
        <section
          className="home-featured"
          style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            minHeight: '380px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '40px',
            backgroundImage: featured.backdrop
              ? `linear-gradient(180deg, rgba(8, 12, 22, 0.2) 0%, rgba(8, 12, 22, 0.92) 100%), url("${resolveAssetUrl(featured.backdrop)}")`
              : 'linear-gradient(135deg, #172554, #1e1b4b)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            marginBottom: '32px'
          }}
        >
          <div className="home-welcome" style={{ position: 'absolute', top: '32px', left: '40px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
              {profileLoading ? 'Loading profile…' : profileError ? 'Welcome' : `Welcome${user?.name ? `, ${user.name}` : ''}`}
            </span>
            {profileError && <p role="alert" style={{ color: '#fca5a5', fontSize: '0.78rem' }}>Profile data is unavailable.</p>}
          </div>
          <div style={{ maxWidth: '640px' }}>
            <span className="badge badge-pill" style={{ marginBottom: '8px' }}>
              {[...(featured.genres || []), featured.year, featured.duration].filter(Boolean).join(' • ')}
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
              {featured.title}
            </h1>
            {featured.description && (
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '22px' }}>
                {featured.description}
              </p>
            )}
            <div className="home-featured-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  onSelectMovie?.(featured);
                  onJoinRoom?.(null);
                  onNavigate('watch-room');
                }}
                className="btn btn-primary"
              >
                <Play size={16} fill="#ffffff" /> Watch
              </button>
              <button onClick={onOpenCreateModal} className="btn btn-secondary">
                <Plus size={16} /> Create Watch Space
              </button>
              <button
                onClick={() => {
                  onSelectMovie?.(featured);
                  onNavigate('movie-details');
                }}
                className="btn btn-secondary"
                style={{ padding: '10px 14px' }}
              >
                Details
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="glass-card" style={{ padding: '36px', marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '8px' }}>No movies in the catalog</h2>
          <p style={{ color: '#94a3b8', marginBottom: '18px' }}>Movies added by an administrator will appear here.</p>
          <button onClick={() => onNavigate('browse')} className="btn btn-secondary">Browse catalog</button>
        </section>
      )}

      <div className="home-overview-grid" style={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1fr',
        gap: '24px',
        marginBottom: '36px'
      }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Continue Watching</h3>
            <span onClick={() => onNavigate('browse')} style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Browse catalog <ChevronRight size={14} />
            </span>
          </div>
          {historyError ? (
            <p role="alert" style={{ color: '#fca5a5' }}>Could not load watch history: {historyError.message}</p>
          ) : historyLoading ? (
            <p style={{ color: '#94a3b8' }}>Loading watch history…</p>
          ) : continueWatching.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No in-progress watch history is available.</p>
          ) : (
            <div className="home-continue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              {continueWatching.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onSelectMovie?.(item.movie);
                    onJoinRoom?.(null);
                    onNavigate('watch-room');
                  }}
                  className="glass-card"
                  style={{ overflow: 'hidden', cursor: 'pointer', textAlign: 'left', color: 'inherit', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  {item.movie.poster ? (
                    <img src={resolveAssetUrl(item.movie.poster)} alt={item.movie.title} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '110px', background: '#172554' }} />
                  )}
                  {item.progress !== null && (
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', width: '100%' }}>
                      <div style={{ height: '100%', width: `${item.progress}%`, background: '#ff2a54' }} />
                    </div>
                  )}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.movie.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                      {item.timeLeft || `${Math.floor(item.watchedSeconds / 60)} min watched`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your Activity</h3>
            <span onClick={() => onNavigate('analytics')} style={{ fontSize: '0.75rem', color: '#a855f7', cursor: 'pointer' }}>
              Full Stats
            </span>
          </div>
          {profileError ? (
            <p role="alert" style={{ color: '#fca5a5' }}>Could not load account activity: {profileError.message}</p>
          ) : profileLoading ? (
            <p style={{ color: '#94a3b8' }}>Loading account activity…</p>
          ) : (
            <div className="home-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 6px', borderRadius: '10px' }}>
                <Clock size={16} color="#38bdf8" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.stats?.watchTime ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Watch Time</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 6px', borderRadius: '10px' }}>
                <Users size={16} color="#ff2a54" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.stats?.watchSpaces ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Titles Completed</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 6px', borderRadius: '10px' }}>
                <HelpCircle size={16} color="#a855f7" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.stats?.aiQuestions ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>AI Questions</div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Your Watch Spaces</h3>
          <span onClick={() => onNavigate('my-spaces')} style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Manage Spaces <ChevronRight size={14} />
          </span>
        </div>
        {spacesError ? (
          <p role="alert" style={{ color: '#fca5a5' }}>Could not load Watch Spaces: {spacesError.message}</p>
        ) : spacesLoading ? (
          <p style={{ color: '#94a3b8' }}>Loading Watch Spaces…</p>
        ) : activeSpaces.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            No active or waiting Watch Spaces were returned by the server.
          </div>
        ) : (
          <div className="home-spaces-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {activeSpaces.map(space => {
              const movieTitle = typeof space.movie === 'string' ? space.movie : space.movie?.title;
              const participantCount = Array.isArray(space.participants) ? space.participants.length : 0;
              return (
                <div key={space._id || space.id || space.code} className="glass-card" style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="badge badge-pill" style={{ fontSize: '0.7rem' }}>{movieTitle || 'Movie not specified'}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {participantCount}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>{space.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>Status: {space.status}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const matchedMovie = movies.find(movie => movie.slug === space.movie?.slug || movie.title === movieTitle);
                        if (matchedMovie) onSelectMovie?.(matchedMovie);
                        onJoinRoom?.(space.code);
                        onNavigate(space.status === 'active' ? 'watch-room' : 'lobby');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Join
                    </button>
                    {space.code && (
                      <button
                        onClick={() => navigator.clipboard?.writeText(space.code)}
                        className="btn btn-secondary btn-sm"
                        title="Copy code"
                      >
                        {space.code}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
