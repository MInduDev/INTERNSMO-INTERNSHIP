import React from 'react';
import { Sparkles, Star, Play, Film } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, resolveAssetUrl } from '../services/api';

function MovieRail({ title, movies, onNavigate, onSelectMovie, onJoinRoom, variant = 'primary' }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>{title}</h3>
      {movies.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>The server returned no movies for this section.</p>
      ) : (
        <div className="recommendation-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '18px'
        }}>
          {movies.map(movie => {
            const movieId = movie._id || movie.id || movie.slug;
            const openDetails = () => {
              onSelectMovie?.(movie);
              onNavigate('movie-details');
            };
            const watchMovie = event => {
              event.stopPropagation();
              onSelectMovie?.(movie);
              onJoinRoom?.(null);
              onNavigate('watch-room');
            };

            return (
              <article
                key={movieId}
                className="glass-card"
                onClick={openDetails}
                style={{ overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {movie.poster ? (
                  <img src={resolveAssetUrl(movie.poster)} alt={movie.title} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                ) : (
                  <div aria-hidden="true" style={{ width: '100%', height: '240px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.06)' }}>
                    <Film size={28} color="#94a3b8" />
                  </div>
                )}
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</div>
                    {movie.rating !== undefined && movie.rating !== null && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#facc15', fontSize: '0.75rem' }}>
                        <Star size={12} fill="#facc15" /> {movie.rating}
                      </span>
                    )}
                  </div>
                  <button onClick={watchMovie} className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ width: '100%', padding: '6px' }}>
                    <Play size={12} fill="#fff" /> Watch
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function RecommendationsScreen({ onNavigate, onSelectMovie, onJoinRoom }) {
  const { data, loading, error } = useFetch(() => moviesAPI.getRecommendations());
  const recommendations = data?.recommendations || [];
  const moreLikeThis = data?.moreLikeThis || [];

  if (loading && !data) {
    return (
      <div className="recommendations-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
        <p style={{ color: '#94a3b8' }}>Loading recommendations from the server…</p>
      </div>
    );
  }

  return (
    <div className="recommendations-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={20} color="#a855f7" />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Recommended For You</h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Recommendations returned by the WatchSpace recommendation service.
          {data?.method ? ` Method: ${data.method}.` : ''}
        </p>
        {error && <p role="alert" style={{ color: '#fca5a5', marginTop: '12px' }}>Could not load recommendations: {error.message}</p>}
      </header>

      {!error && (
        <>
          <MovieRail
            title="Recommendations"
            movies={recommendations}
            onNavigate={onNavigate}
            onSelectMovie={onSelectMovie}
            onJoinRoom={onJoinRoom}
          />
          <MovieRail
            title="More Like This"
            movies={moreLikeThis}
            onNavigate={onNavigate}
            onSelectMovie={onSelectMovie}
            onJoinRoom={onJoinRoom}
            variant="secondary"
          />
        </>
      )}
    </div>
  );
}
