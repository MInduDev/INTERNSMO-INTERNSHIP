// src/screens/BrowseScreen.jsx
// Browse screen now fetches movies from the backend instead of static mock data.
import React, { useState } from 'react';
import { Search, Star, Play, Plus } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI } from '../services/api';

export default function BrowseScreen({ onNavigate, onSelectMovie, onOpenCreateModal }) {
  // Data fetching
  const { data: movies = [], loading: moviesLoading } = useFetch(() => moviesAPI.getAll());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const moviesList = Array.isArray(movies) ? movies : (movies?.movies || []);

  if (moviesLoading && moviesList.length === 0) {
    return (
      <div style={{ padding: '24px 36px', maxWidth: '1440px', margin: '0 auto' }}>
        <p style={{ color: '#94a3b8' }}>Loading movies…</p>
      </div>
    );
  }

  const categories = ['All', 'Action', 'Drama', 'Sci-Fi', 'Comedy', 'Thriller', 'Horror', 'Family'];

  const filteredMovies = moviesList.filter((movie) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      movie.category === selectedCategory ||
      (movie.genres && movie.genres.includes(selectedCategory));
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      movie.title?.toLowerCase().includes(q) ||
      (movie.director && movie.director.toLowerCase().includes(q)) ||
      (movie.genres && movie.genres.some((g) => g.toLowerCase().includes(q)));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Search Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 0 20px 0' }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: '16px', top: '14px' }} />
          <input
            type="text"
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for movies, genres, actors..."
            style={{ paddingLeft: '44px', paddingRight: '16px', fontSize: '0.95rem' }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                border: 'none',
                background:
                  selectedCategory === cat
                    ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                    : 'rgba(255, 255, 255, 0.06)',
                color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                fontWeight: selectedCategory === cat ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow:
                  selectedCategory === cat ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Movies Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px' }}>
        {filteredMovies.map((movie) => (
          <div
            key={movie.id}
            className="glass-card"
            style={{
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.25s, box-shadow 0.25s',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            onClick={() => {
              onSelectMovie(movie);
              onNavigate('movie-details');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(0, 0, 0, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {/* Poster */}
            <div style={{ position: 'relative', height: '290px' }}>
              <img src={movie.poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(7, 10, 19, 0.85)',
                  backdropFilter: 'blur(6px)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#facc15',
                }}
              >
                <Star size={13} fill="#facc15" color="#facc15" />
                {movie.rating}
              </div>

              {/* Hover overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent 40%, rgba(7,10,19,0.95) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '16px',
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase' }}>
                    {movie.genres.join(' • ')}
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{movie.title}</h4>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    {movie.year} • {movie.duration}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom quick actions */}
            <div style={{ display: 'flex', padding: '10px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', gap: '6px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMovie(movie);
                  onNavigate('watch-room');
                }}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, padding: '6px' }}
              >
                <Play size={13} fill="#fff" /> Watch
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreateModal();
                }}
                className="btn btn-secondary btn-sm"
                title="Create Space"
                style={{ padding: '6px 8px' }}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
