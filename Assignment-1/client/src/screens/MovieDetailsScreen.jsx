import React, { useState } from 'react';
import { Play, Plus, Star, Users, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { resolveAssetUrl, timelineAPI } from '../services/api';

export default function MovieDetailsScreen({ movie, onNavigate, onOpenCreateModal, onJoinRoom }) {
  const [activeTab, setActiveTab] = useState('About');
  const genres = Array.isArray(movie?.genres) ? movie.genres : [];
  const { data: timelineEvents = [], loading: timelineLoading, error: timelineError } = useFetch(
    () => movie?.slug ? timelineAPI.getByMovie(movie.slug) : Promise.resolve([]),
    [movie?.slug]
  );

  if (!movie) {
    return (
      <div style={{ maxWidth: '720px', margin: '60px auto', padding: '32px', textAlign: 'center' }} className="glass-card">
        <h2 style={{ marginBottom: '8px' }}>No movie selected</h2>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Select a title from the backend catalog to view its details.</p>
        <button onClick={() => onNavigate('browse')} className="btn btn-secondary">Browse catalog</button>
      </div>
    );
  }

  return (
    <div className="movie-details-screen" style={{ padding: '0 0 80px 0', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Hero Backdrop Banner */}
      <div className="movie-details-hero" style={{
        position: 'relative',
        minHeight: '440px',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '40px 60px',
        backgroundImage: movie.backdrop
          ? `linear-gradient(180deg, rgba(7, 10, 19, 0.3) 0%, rgba(7, 10, 19, 0.95) 100%), url("${resolveAssetUrl(movie.backdrop)}")`
          : 'linear-gradient(135deg, #172554, #1e1b4b)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Back button */}
        <button
          onClick={() => onNavigate('browse')}
          className="btn btn-secondary btn-sm"
          style={{ position: 'absolute', top: '24px', left: '40px', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Browse
        </button>

        {/* Content details overlay */}
        <div className="movie-details-intro" style={{ display: 'flex', gap: '32px', alignItems: 'flex-end', width: '100%' }}>
          {/* Poster image card */}
          {movie.poster && <img
            src={resolveAssetUrl(movie.poster)}
            alt={movie.title}
            style={{
              width: '180px',
              height: '260px',
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
              border: '2px solid rgba(255,255,255,0.1)'
            }}
          />}

          {/* Text Info */}
          <div style={{ flex: 1 }}>
            <div className="movie-details-ratings" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {movie.rating !== undefined && movie.rating !== null && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#facc15', fontSize: '0.9rem', fontWeight: 700 }}>
                <Star size={16} fill="#facc15" color="#facc15" />
                {movie.rating} {Number(movie.votes) > 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}>({movie.votes})</span>}
              </div>}
            </div>

            <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '10px' }}>
              {movie.title}
            </h1>

            <div className="movie-details-meta" style={{ display: 'flex', gap: '16px', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} /> {movie.year}
              </span>
              {genres.length > 0 && <><span>•</span><span>{genres.join(' • ')}</span></>}
              {movie.duration && <><span>•</span><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} /> {movie.duration}
              </span></>}
            </div>

            <p style={{ maxWidth: '720px', color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
              {movie.description}
            </p>

            <div className="movie-details-actions" style={{ display: 'flex', gap: '14px' }}>
              <button
                onClick={() => {
                  onJoinRoom?.(null);
                  onNavigate('watch-room');
                }}
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
              >
                <Play size={18} fill="#fff" />
                Watch Now
              </button>
              <button
                onClick={onOpenCreateModal}
                className="btn btn-secondary"
                style={{ padding: '12px 20px' }}
              >
                <Plus size={18} />
                Create Watch Space
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="movie-details-tabs" style={{ padding: '30px 60px 0' }}>
        <div className="movie-details-tab-list" style={{ display: 'flex', gap: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
          {['About', 'Cast', 'Genres', 'More'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === tab ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: '1rem',
                paddingBottom: '12px',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #ff2a54' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'About' && (
          <div className="movie-details-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Director</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{movie.director || 'Unknown'}</div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Top Cast</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                {Array.isArray(movie.cast) && movie.cast.length > 0
                  ? movie.cast.join(', ')
                  : (typeof movie.cast === 'string' && movie.cast ? movie.cast : 'Not specified')}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Audio & Subtitles</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>Language metadata not provided by the catalog.</div>
            </div>
          </div>
        )}

        {activeTab === 'Cast' && (() => {
          const castList = Array.isArray(movie.cast) 
            ? movie.cast 
            : (typeof movie.cast === 'string' && movie.cast ? movie.cast.split(',').map(s => s.trim()) : []);

          return (
            <div className="movie-details-cast-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {castList.length > 0 ? (
                castList.map((actor, idx) => (
                  <div key={idx} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}>
                      {actor.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{actor}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: 'span 4', padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No cast members listed for this title.
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'Genres' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {genres.map((g) => (
              <span key={g} className="badge badge-pill" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {activeTab === 'More' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ marginBottom: '10px' }}>AI Timeline Trivia Availability</h4>
            {timelineLoading
              ? <p style={{ color: '#94a3b8' }}>Loading timeline metadata…</p>
              : timelineError
                ? <p role="alert" style={{ color: '#fca5a5' }}>Could not load timeline metadata: {timelineError.message}</p>
                : <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {timelineEvents.length} timeline markers are currently indexed for this title.
                  </p>}
          </div>
        )}
      </div>
    </div>
  );
}
