import React, { useState, useRef, useEffect } from 'react';
import { User, Clock, Users, HelpCircle, Edit3, Settings, Sparkles, Film, ArrowRight, LogOut, X, Check, Camera, Upload, Plus, Shield, LayoutGrid } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { authAPI, interactionsAPI, moviesAPI, resolveAssetUrl } from '../services/api';
import SettingsScreen from './SettingsScreen';
import AdminTimelineScreen from './AdminTimelineScreen';

const AVAILABLE_GENRES = [
  'Sci-Fi', 'Action', 'Drama', 'Thriller', 'Adventure', 
  'Comedy', 'Animation', 'Horror', 'Romance', 'Mystery'
];

export default function ProfileScreen({ initialTab = 'overview', onNavigate, onSelectMovie, currentUser, onUserUpdated }) {
  const { data: profileData, loading: profileLoading, error: profileError } = useFetch(() => authAPI.getMe());
  const { data: moviesData = [], loading: moviesLoading, error: moviesError } = useFetch(() => moviesAPI.getAll());
  const { data: historyData = [], loading: historyLoading, error: historyError } = useFetch(() => interactionsAPI.getMyHistory());

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fileInputRef = useRef(null);
  const [localUserOverride, setLocalUserOverride] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editSubtitleLanguage, setEditSubtitleLanguage] = useState('');
  const [editGenres, setEditGenres] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const freshProfile = profileData?.email ? profileData : profileData?.user;
  const activeUser = localUserOverride || freshProfile || (profileLoading ? currentUser : null);

  React.useEffect(() => {
    if (freshProfile && !localUserOverride) {
      localStorage.setItem('user', JSON.stringify(freshProfile));
    }
  }, [freshProfile, localUserOverride]);

  const user = activeUser || {};

  const isAdmin = (user.role?.toLowerCase() === 'admin') || (currentUser?.role?.toLowerCase() === 'admin');

  const handleOpenEdit = () => {
    setEditName(user.name || '');
    setEditAvatar(user.avatar || '');
    setEditSubtitleLanguage(user.subtitleLanguage || '');
    setEditGenres(Array.isArray(user.genres) ? user.genres : []);
    setStatusMsg({ text: '', type: '' });
    setIsEditOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ text: 'Please choose an image file (PNG, JPG, WebP)', type: 'error' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ text: 'Image file size must be less than 10MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          let width = img.width;
          let height = img.height;

          // Crop to centered square
          const minDimension = Math.min(width, height);
          const startX = (width - minDimension) / 2;
          const startY = (height - minDimension) / 2;

          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, startX, startY, minDimension, minDimension, 0, 0, MAX_SIZE, MAX_SIZE);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setEditAvatar(compressedDataUrl);
          setStatusMsg({ text: 'Custom image uploaded! Click "Save Changes" to apply.', type: 'success' });
        } catch (err) {
          setEditAvatar(event.target.result);
          setStatusMsg({ text: 'Image loaded! Click "Save Changes" to apply.', type: 'success' });
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleToggleGenre = (g) => {
    if (editGenres.includes(g)) {
      if (editGenres.length > 1) {
        setEditGenres(editGenres.filter(item => item !== g));
      }
    } else {
      if (editGenres.length < 6) {
        setEditGenres([...editGenres, g]);
      }
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setStatusMsg({ text: 'Please enter a valid display name', type: 'error' });
      return;
    }

    setIsSaving(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const payload = {
        name: editName.trim(),
        avatar: editAvatar.trim(),
        subtitleLanguage: editSubtitleLanguage,
        genres: editGenres
      };

      const res = await authAPI.updateProfile(payload);
      if (res && res.success) {
        const updated = res.user;
        setLocalUserOverride(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('watchspace-user-updated', { detail: updated }));
        if (onUserUpdated) onUserUpdated(updated);
        setStatusMsg({ text: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => {
          setIsEditOpen(false);
          setStatusMsg({ text: '', type: '' });
        }, 800);
      } else {
        setStatusMsg({ text: res?.message || 'Failed to update profile', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: err.message || 'Error updating profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const movies = Array.isArray(moviesData) ? moviesData : (moviesData?.movies || []);
  const recentActivity = (Array.isArray(historyData) ? historyData : []).map(interaction => {
    const movie = movies.find(item => item.slug === interaction.titleId);
    return {
      id: interaction._id || `${interaction.titleId}-${interaction.updatedAt || ''}`,
      movie,
      title: movie?.title || interaction.titleId,
      watched: `${Math.floor(Number(interaction.watchedSeconds || 0) / 60)} min watched`,
      date: interaction.updatedAt ? new Date(interaction.updatedAt).toLocaleString() : 'Date not recorded',
      poster: movie?.poster
    };
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    onNavigate('login');
  };

  return (
    <div className="profile-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {profileError && <p role="alert" style={{ color: '#fca5a5', marginBottom: '16px' }}>Could not load profile from the server: {profileError.message}</p>}
      {/* User Header Profile Card */}
      <div className="glass-card profile-header" style={{
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px'
      }}>
        <div className="profile-identity" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {user.avatar
            ? <img src={user.avatar} alt={user.name || ''} style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1' }} />
            : <div aria-label={user.name || 'Profile'} style={{ width: '90px', height: '90px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)', border: '3px solid #6366f1', fontSize: '2rem' }}>{user.name?.charAt(0)?.toUpperCase() || '?'}</div>}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{user.name || (profileLoading ? 'Loading profile…' : 'Profile data unavailable')}</h2>
              <span className="badge badge-ai">{user.role || 'Role not reported'}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              {user.email ? `@${user.email.split('@')[0]}` : 'Email not available'}
              {user.createdAt ? ` • Member since ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
            </div>
          </div>
        </div>

        <div className="profile-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ gap: '6px' }}
          >
            <Clock size={16} /> Activity
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ gap: '6px' }}
          >
            <Settings size={16} /> Settings
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                gap: '6px',
                background: activeTab === 'admin' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(239, 68, 68, 0.12)',
                color: activeTab === 'admin' ? '#ffffff' : '#fca5a5',
                borderColor: 'rgba(239, 68, 68, 0.35)'
              }}
            >
              <Shield size={16} /> Admin Panel
            </button>
          )}
          <button
            onClick={handleOpenEdit}
            className="btn btn-secondary"
            style={{ gap: '6px' }}
          >
            <Edit3 size={16} /> Edit Profile
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ gap: '6px', color: '#f87171' }}
            title="Log out of account"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      {/* Dynamic Tab Content */}
      {activeTab === 'overview' && (
        <div className="profile-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
        {/* Left Column: Stats & Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Stats Grid */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Viewing Statistics</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <Users size={16} color="#ff2a54" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{user.stats?.watchSpaces ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Titles Completed</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <Clock size={16} color="#38bdf8" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{user.stats?.watchTime ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Watch Time</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <HelpCircle size={16} color="#a855f7" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{user.stats?.aiQuestions ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>AI Questions</div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Preferences</h4>
            
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>Favorite Genres</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Array.isArray(user.genres) ? user.genres : []).map((g) => (
                  <span key={g} className="badge badge-pill" style={{ padding: '6px 12px' }}>
                    {g}
                  </span>
                ))}
                {(!Array.isArray(user.genres) || user.genres.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No genres saved.</span>}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Preferred Subtitle Language</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.subtitleLanguage || 'Not set'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>Interests</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Array.isArray(user.interests) ? user.interests : []).map((it) => (
                  <span key={it} className="badge badge-ai" style={{ padding: '4px 10px' }}>
                    {it}
                  </span>
                ))}
                {(!Array.isArray(user.interests) || user.interests.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No interests saved.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Activity</h4>
            <span style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer' }}>View All History</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {historyError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load watch history: {historyError.message}</p>}
            {moviesError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load movie details: {moviesError.message}</p>}
            {(historyLoading || moviesLoading) && <p style={{ color: '#94a3b8' }}>Loading watch history…</p>}
            {!historyLoading && !historyError && recentActivity.length === 0 && (
              <p style={{ color: '#94a3b8' }}>The server returned no watch history for this account.</p>
            )}
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="profile-activity-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div className="profile-activity-info" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {act.poster && <img src={resolveAssetUrl(act.poster)} alt={act.title} style={{ width: '48px', height: '64px', borderRadius: '6px', objectFit: 'cover' }} />}
                  <div>
                    <h5 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{act.title}</h5>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{act.watched}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{act.date}</div>
                  </div>
                </div>

                <button
                  disabled={!act.movie}
                  onClick={() => {
                    if (onSelectMovie) onSelectMovie(act.movie);
                    onNavigate('watch-room');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '4px' }}
                >
                  Rewatch <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsScreen
          embedded={true}
          onNavigate={(screen) => {
            if (screen === 'admin-timeline') setActiveTab('admin');
            else if (screen === 'profile') setActiveTab('overview');
            else onNavigate(screen);
          }}
          currentUser={currentUser}
          onUserUpdated={onUserUpdated}
        />
      )}

      {/* Admin Panel Tab */}
      {activeTab === 'admin' && (
        <AdminTimelineScreen
          embedded={true}
          onNavigate={(screen) => {
            if (screen === 'settings') setActiveTab('settings');
            else if (screen === 'profile') setActiveTab('overview');
            else onNavigate(screen);
          }}
          currentUser={currentUser}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 15, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Edit3 size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit Profile</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Update your display info and viewing preferences</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Avatar Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '10px' }}>
                  Avatar Selection
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />

                {/* Avatar Circles Row with "+" Button at the end */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {editAvatar && (
                    <img
                      src={editAvatar}
                      alt="Custom Upload"
                      onClick={() => setEditAvatar(editAvatar)}
                      title="Custom uploaded avatar"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: '2.5px solid #ff2a54',
                        transform: 'scale(1.12)',
                        boxShadow: '0 0 14px rgba(255, 42, 84, 0.55)',
                        transition: 'all 0.18s ease'
                      }}
                    />
                  )}

                  {/* "+" Button to Trigger File Upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload image from computer"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: '2px dashed rgba(255, 255, 255, 0.35)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#c084fc',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ff2a54';
                      e.currentTarget.style.color = '#ff2a54';
                      e.currentTarget.style.background = 'rgba(255, 42, 84, 0.12)';
                      e.currentTarget.style.transform = 'scale(1.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                      e.currentTarget.style.color = '#c084fc';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Custom URL Input */}
                <input
                  type="text"
                  placeholder={editAvatar.startsWith('data:') ? 'Custom image uploaded from computer' : 'Or paste custom image URL...'}
                  value={editAvatar.startsWith('data:') ? '' : editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              {/* Display Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  className="input-field"
                />
              </div>

              {/* Subtitle Language */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Preferred Subtitle Language
                </label>
                <select
                  value={editSubtitleLanguage}
                  onChange={(e) => setEditSubtitleLanguage(e.target.value)}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">No preference set</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Italian">Italian</option>
                </select>
              </div>

              {/* Favorite Genres Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Favorite Genres (select up to 5)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {AVAILABLE_GENRES.map((g) => {
                    const isSelected = editGenres.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => handleToggleGenre(g)}
                        style={{
                          background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: isSelected ? '#c7d2fe' : '#94a3b8',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected && '✓ '}
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Message */}
              {statusMsg.text && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: statusMsg.type === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: statusMsg.type === 'success' ? '#4ade80' : '#f87171'
                }}>
                  {statusMsg.text}
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ gap: '6px' }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
