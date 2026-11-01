// src/screens/HomeScreen.jsx
// Home screen pulls data from the backend with robust fallbacks
import React from 'react';
import { Play, Plus, Clock, Users, HelpCircle, Sparkles, ChevronRight } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, spacesAPI, authAPI } from '../services/api';

export default function HomeScreen({ onNavigate, onOpenCreateModal, onSelectMovie, onJoinRoom, currentUser }) {
  // ---- Data fetching ----
  const { data: movies, loading: moviesLoading } = useFetch(() => moviesAPI.getAll());
  const { data: profile, loading: profileLoading } = useFetch(() => authAPI.getMe());
  const { data: upcoming, loading: upcomingLoading } = useFetch(() => spacesAPI.getMySpaces());

  const moviesList = Array.isArray(movies) ? movies : (movies?.movies || []);
  const storedUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const user = currentUser || (profile?.email ? profile : profile?.user) || storedUser;

  // While any critical data is loading, show a loading placeholder
  if (moviesLoading && moviesList.length === 0) {
    return (
      <div className="home-screen" style={{ padding: '60px 36px', maxWidth: '1440px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Loading WatchSpace...</p>
      </div>
    );
  }

  const featured = moviesList[1] || moviesList[0] || {
    title: 'Dune: Part Two',
    genres: ['Sci-Fi', 'Adventure', 'Action'],
    year: '2024',
    duration: '2h 46m',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'
  };

  const continueWatching = moviesList.slice(0, 4).map((m, idx) => ({
    id: m.id || m._id || m.slug,
    movie: m,
    title: m.title,
    poster: m.poster,
    progress: [68, 42, 85, 19][idx] || 50,
    timeLeft: ['42m left', '1h 12m left', '18m left', '1h 45m left'][idx] || '30m left'
  }));

  const upcomingSpaces = Array.isArray(upcoming) ? upcoming : (upcoming?.spaces || []);

  return (
    <div className="home-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Hero Featured Movie Banner */}
      <div className="home-featured" style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        minHeight: '380px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '40px',
        backgroundImage: `linear-gradient(180deg, rgba(8, 12, 22, 0.2) 0%, rgba(8, 12, 22, 0.92) 100%), url(${featured.backdrop || featured.poster})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        marginBottom: '32px'
      }}>
        {/* Welcome Text */}
        <div className="home-welcome" style={{ position: 'absolute', top: '32px', left: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
              Good Evening, {user?.name || 'Guest'}
            </span>
            <span className="badge badge-ai">
              <Sparkles size={11} /> Ready for party
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
            Ready for your next synchronized watch party?
          </p>
        </div>
        {/* Movie Info */}
        <div style={{ maxWidth: '640px' }}>
          <span className="badge badge-pill" style={{ marginBottom: '8px' }}>
            {(featured.genres || ['Sci-Fi']).join(' • ')} • {featured.year || '2024'} • {featured.duration || '2h 30m'}
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
            {featured.title}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '22px' }}>
            {featured.description}
          </p>
          <div className="home-featured-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              onClick={() => {
                if (onSelectMovie) onSelectMovie(featured);
                if (onJoinRoom) onJoinRoom(null);
                onNavigate('watch-room');
              }}
              className="btn btn-primary"
            >
              <Play size={16} fill="#ffffff" /> Continue Watching
            </button>
            <button onClick={onOpenCreateModal} className="btn btn-secondary">
              <Plus size={16} /> Create Watch Space
            </button>
            <button
              onClick={() => {
                if (onSelectMovie) onSelectMovie(featured);
                onNavigate('movie-details');
              }}
              className="btn btn-secondary"
              style={{ padding: '10px 14px' }}
            >
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Continue Watching + Your Activity */}
      <div className="home-overview-grid" style={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1fr',
        gap: '24px',
        marginBottom: '36px'
      }}>
        {/* Continue Watching Rail */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Continue Watching</h3>
            <span onClick={() => onNavigate('browse')} style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ChevronRight size={14} />
            </span>
          </div>
          <div className="home-continue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            {continueWatching.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (onSelectMovie) onSelectMovie(item.movie);
                  onNavigate('movie-details');
                }}
                className="glass-card"
                title="Click to view Movie Details"
                style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <div style={{ position: 'relative', height: '110px' }}>
                  <img src={item.poster} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(13,20,36,0.95) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: '8px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1' }}>
                    <span style={{ fontWeight: 600 }}>{item.progress}%</span>
                    <span>{item.timeLeft}</span>
                  </div>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', width: '100%' }}>
                  <div style={{ height: '100%', width: `${item.progress}%`, background: '#ff2a54' }} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Activity Card */}
        <div className="glass-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your Activity</h3>
            <span onClick={() => onNavigate('analytics')} style={{ fontSize: '0.75rem', color: '#a855f7', cursor: 'pointer' }}>
              Full Stats
            </span>
          </div>
          <div className="home-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Clock size={16} color="#38bdf8" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.stats?.watchTime || '0h'}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Watch Time</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Users size={16} color="#ff2a54" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.stats?.watchSpaces ?? 0}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Spaces Joined</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <HelpCircle size={16} color="#a855f7" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.stats?.aiQuestions ?? 0}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>AI Questions</div>
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.78rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#818cf8" />
            <span>AI Co-Pilot is active in all public watch spaces</span>
          </div>
        </div>
      </div>

      {/* Upcoming Watch Spaces Rail */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Upcoming Watch Spaces</h3>
          <span onClick={() => onNavigate('my-spaces')} style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Manage Spaces <ChevronRight size={14} />
          </span>
        </div>
        <div className="home-spaces-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {upcomingSpaces.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              No upcoming spaces yet. Click "+ Create Watch Space" above to start one!
            </div>
          ) : (
            upcomingSpaces.map((space) => {
              const movieTitle = typeof space.movie === 'string' ? space.movie : (space.movie?.title || 'Watch Party');
              const participantsCount = Array.isArray(space.participants) ? space.participants.length : (space.participants || 1);
              return (
                <div key={space._id || space.id || space.code} className="glass-card" style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="badge badge-pill" style={{ fontSize: '0.7rem' }}>{movieTitle}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {participantsCount}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>{space.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>{space.time || 'Today, 8:00 PM'}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const matched = moviesList.find(m => m.title?.toLowerCase().includes(movieTitle.toLowerCase())) || moviesList[0];
                        if (onSelectMovie) onSelectMovie(matched);
                        if (onJoinRoom) onJoinRoom(space.code);
                        onNavigate('lobby');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Join
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(space.code);
                        alert(`Room Code copied: ${space.code}`);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Copy Code"
                    >
                      {space.code}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
