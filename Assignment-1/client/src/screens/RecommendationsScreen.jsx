import React from 'react';
import { Sparkles, Star, Play, Plus, Film } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI } from '../services/api';

export default function RecommendationsScreen({ onNavigate, onSelectMovie, onOpenCreateModal }) {
  const { data: rawRecs = [], loading: recLoading } = useFetch(() => moviesAPI.getRecommendations());
  const { data: rawMovies = [], loading: moviesLoading } = useFetch(() => moviesAPI.getAll());

  const recommendations = Array.isArray(rawRecs) ? rawRecs : (rawRecs?.recommendations || []);
  const movies = Array.isArray(rawMovies) ? rawMovies : (rawMovies?.movies || []);

  if ((recLoading || moviesLoading) && recommendations.length === 0) {
    return (
      <div className="recommendations-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
        <p style={{ color: '#94a3b8' }}>Loading recommendations…</p>
      </div>
    );
  }
  return (
    <div className="recommendations-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={20} color="#a855f7" />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Recommended For You</h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Personalized AI suggestions based on your synchronized watch history, favorite genres, and chat topics.
        </p>
      </div>

      {/* Primary Recommendation Rail */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Top Matches For Your Taste
        </h3>

        <div className="recommendation-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '18px'
        }}>
          {recommendations.map((item) => {
            const found = movies.find(m => m.id === item.id) || movies[0];
            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
                onClick={() => {
                  onSelectMovie(found);
                  onNavigate('movie-details');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >              <div style={{ position: 'relative', height: '260px' }}>
                <img
                  src={item.poster}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(7, 10, 19, 0.85)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#facc15'
                }}>
                  <Star size={12} fill="#facc15" color="#facc15" />
                  {item.rating}
                </div>
              </div>

              <div style={{ padding: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetMovie = movies.find(m => m.id === item.id) || movies[0];
                    if (onSelectMovie) onSelectMovie(targetMovie);
                    onNavigate('watch-room');
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', padding: '6px' }}
                >
                  <Play size={12} fill="#fff" /> Watch Now
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Rail: More Like This */}
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
          More Like This
        </h3>

        <div className="recommendation-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '18px'
        }}>
          {recommendations.map((item) => {
            const found = movies.find(m => m.id === item.id) || movies[0];
            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
                onClick={() => {
                  onSelectMovie(found);
                  onNavigate('movie-details');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 42, 84, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
              <div style={{ position: 'relative', height: '240px' }}>
                <img
                  src={item.poster}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(7, 10, 19, 0.85)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#facc15'
                }}>
                  <Star size={12} fill="#facc15" color="#facc15" />
                  {item.rating}
                </div>
              </div>

              <div style={{ padding: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetMovie = movies.find(m => m.id === item.id) || movies[0];
                    if (onSelectMovie) onSelectMovie(targetMovie);
                    onNavigate('watch-room');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', padding: '6px' }}
                >
                  <Play size={12} fill="#fff" /> Watch
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
