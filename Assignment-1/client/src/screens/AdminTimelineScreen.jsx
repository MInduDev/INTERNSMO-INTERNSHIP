import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Shield, Plus, Upload, Trash2, Film, Users, BarChart3, Database, 
  ArrowLeft, CheckCircle2, Activity, Clock, Sparkles, AlertCircle,
  X, RefreshCw, Power, Check, Radio, Settings
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, timelineAPI, spacesAPI, adminAPI } from '../services/api';

const SAMPLE_POSTERS = [
  { label: 'Sci-Fi Neon', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80' },
  { label: 'Cosmic Galaxy', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80' },
  { label: 'Action Night', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80' },
  { label: 'Ancient Fantasy', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80' }
];

export default function AdminTimelineScreen({ onNavigate, currentUser, embedded = false }) {
  const resolvedUser = currentUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const isAdmin = resolvedUser?.role === 'admin';

  // State
  const [events, setEvents] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState('');
  const [eventType, setEventType] = useState('Trivia');
  const [timestamp, setTimestamp] = useState('00:05:30');
  const [content, setContent] = useState('');
  const [variationOptionsInput, setVariationOptionsInput] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeAdminTab, setActiveAdminTab] = useState('timeline');

  // Real data state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [spacesList, setSpacesList] = useState([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const actionNoticeTimeoutRef = useRef(null);

  // Bulk JSON Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Dynamic Movies Catalog state & CRUD
  const [moviesList, setMoviesList] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(false);

  // Add Movie Modal State
  const [isAddMovieModalOpen, setIsAddMovieModalOpen] = useState(false);
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieYear, setNewMovieYear] = useState('2026');
  const [newMovieDuration, setNewMovieDuration] = useState('2h 15m');
  const [newMovieRating, setNewMovieRating] = useState('8.5');
  const [newMovieGenres, setNewMovieGenres] = useState('Sci-Fi, Action');
  const [newMovieDirector, setNewMovieDirector] = useState('');
  const [newMovieCast, setNewMovieCast] = useState('');
  const [newMovieDescription, setNewMovieDescription] = useState('');
  const [newMoviePoster, setNewMoviePoster] = useState('');
  const [newMovieBackdrop, setNewMovieBackdrop] = useState('');
  const [newMovieVideoUrl, setNewMovieVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [isAddingMovie, setIsAddingMovie] = useState(false);
  const [addMovieError, setAddMovieError] = useState('');

  const fetchMovies = useCallback(async () => {
    try {
      setMoviesLoading(true);
      const res = await moviesAPI.getAll();
      const list = Array.isArray(res) ? res : (res?.movies || []);
      setMoviesList(list);
      return list;
    } catch (err) {
      console.warn('Failed to fetch movies:', err);
      return [];
    } finally {
      setMoviesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Set initial selected movie once movies load
  useEffect(() => {
    if (moviesList.length > 0 && !selectedMovie) {
      setSelectedMovie(moviesList[0].slug || moviesList[0].id || 'the-dark-knight');
    }
  }, [moviesList, selectedMovie]);

  const handleCreateMovie = async (e) => {
    e.preventDefault();
    if (!newMovieTitle.trim()) {
      setAddMovieError('Please provide a movie title');
      return;
    }
    if (!newMovieDescription.trim()) {
      setAddMovieError('Please provide a short synopsis');
      return;
    }

    const posterUrl = newMoviePoster.trim() || SAMPLE_POSTERS[0].url;

    setIsAddingMovie(true);
    setAddMovieError('');
    try {
      const genresArray = newMovieGenres
        .split(',')
        .map(g => g.trim())
        .filter(Boolean);

      const castArray = newMovieCast
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const payload = {
        title: newMovieTitle.trim(),
        year: newMovieYear.trim() || '2026',
        duration: newMovieDuration.trim() || '2h 00m',
        rating: parseFloat(newMovieRating) || 8.0,
        genres: genresArray.length > 0 ? genresArray : ['Sci-Fi'],
        director: newMovieDirector.trim() || 'Unknown',
        cast: castArray.length > 0 ? castArray : ['Lead Actor'],
        description: newMovieDescription.trim(),
        poster: posterUrl,
        backdrop: newMovieBackdrop.trim() || posterUrl,
        videoAssetUrl: newMovieVideoUrl.trim() || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      };

      const res = await moviesAPI.create(payload);
      if (res?.success || res?.movie) {
        if (actionNoticeTimeoutRef.current) clearTimeout(actionNoticeTimeoutRef.current);
        setActionNotice({ message: `"${payload.title}" added to movie catalog!`, isError: false });
        actionNoticeTimeoutRef.current = setTimeout(() => setActionNotice(null), 5000);

        setIsAddMovieModalOpen(false);
        setNewMovieTitle('');
        setNewMovieDirector('');
        setNewMovieCast('');
        setNewMovieDescription('');
        setNewMoviePoster('');
        setNewMovieBackdrop('');
        const updated = await fetchMovies();
        if (res?.movie?.slug) {
          setSelectedMovie(res.movie.slug);
        }
      } else {
        setAddMovieError(res?.message || 'Failed to add movie');
      }
    } catch (err) {
      setAddMovieError(err.message || 'Error saving movie to database');
    } finally {
      setIsAddingMovie(false);
    }
  };

  const handleDeleteMovie = async (movie) => {
    const movieSlug = movie.slug || movie.id || movie._id;
    if (!window.confirm(`Are you sure you want to remove "${movie.title}" from the platform catalog? This also cleans up its timeline events.`)) {
      return;
    }

    try {
      const res = await moviesAPI.delete(movieSlug);
      if (res?.success) {
        if (actionNoticeTimeoutRef.current) clearTimeout(actionNoticeTimeoutRef.current);
        setActionNotice({ message: `Movie "${movie.title}" successfully deleted.`, isError: false });
        actionNoticeTimeoutRef.current = setTimeout(() => setActionNotice(null), 5000);

        const remaining = await fetchMovies();
        if (selectedMovie === movieSlug && remaining && remaining.length > 0) {
          setSelectedMovie(remaining[0].slug || remaining[0].id);
        }
      } else {
        if (actionNoticeTimeoutRef.current) clearTimeout(actionNoticeTimeoutRef.current);
        setActionNotice({ message: res?.message || 'Failed to delete movie', isError: true });
        actionNoticeTimeoutRef.current = setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      if (actionNoticeTimeoutRef.current) clearTimeout(actionNoticeTimeoutRef.current);
      setActionNotice({ message: err.message || 'Error deleting movie', isError: true });
      actionNoticeTimeoutRef.current = setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Fetch timeline events for selected movie
  const fetchTimelineEvents = useCallback(async () => {
    if (!selectedMovie) return;
    try {
      const res = await timelineAPI.getByMovie(selectedMovie);
      if (Array.isArray(res)) {
        setEvents(res);
      } else if (res?.events) {
        setEvents(res.events);
      }
    } catch (err) {
      console.warn('Failed to load timeline events:', err);
    }
  }, [selectedMovie]);

  useEffect(() => {
    fetchTimelineEvents();
  }, [fetchTimelineEvents]);

  // Fetch real users from MongoDB
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const users = await adminAPI.getUsers();
      setUsersList(users);
    } catch (err) {
      console.warn('Failed to fetch admin users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch real watch spaces from MongoDB
  const fetchSpaces = useCallback(async () => {
    setSpacesLoading(true);
    try {
      const spaces = await adminAPI.getSpaces();
      setSpacesList(spaces);
    } catch (err) {
      console.warn('Failed to fetch spaces:', err);
    } finally {
      setSpacesLoading(false);
    }
  }, []);

  // Load data when respective tabs are opened
  useEffect(() => {
    if (activeAdminTab === 'users') {
      fetchUsers();
    } else if (activeAdminTab === 'dashboard') {
      fetchSpaces();
    }
  }, [activeAdminTab, fetchUsers, fetchSpaces]);

  // Parse mm:ss or hh:mm:ss to total seconds
  const parseTimestampToSeconds = (ts) => {
    const parts = (ts || '').split(':').map(Number);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
    if (parts.length === 2) return (parts[0] * 60) + (parts[1] || 0);
    return Number(ts) || 0;
  };

  const notifyAction = (msg, isError = false) => {
    setActionNotice({ message: msg, isError });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Add timeline event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const totalSeconds = parseTimestampToSeconds(timestamp);
    const eventPayload = {
      movieId: selectedMovie,
      timestampSeconds: totalSeconds,
      timeFormatted: timestamp,
      type: eventType,
      content: content.trim(),
      metadata: eventType === 'Variation Point' && variationOptionsInput.trim()
        ? { variationOptions: variationOptionsInput.split(',').map(s => s.trim()).filter(Boolean) }
        : {}
    };

    try {
      const res = await timelineAPI.create(eventPayload);
      if (res?.success) {
        const savedEv = res.event || { ...eventPayload, _id: Date.now() };
        setEvents(prev => [...prev, savedEv]);
        setContent('');
        setVariationOptionsInput('');
        notifyAction('Timeline event added successfully!');
      } else {
        notifyAction(res?.message || 'Failed to save event', true);
      }
    } catch (err) {
      console.warn('Failed to save timeline event:', err);
      notifyAction('Error saving event to database', true);
    }
  };

  // Delete timeline event
  const handleDeleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => (e._id || e.id) !== id));
    try {
      await timelineAPI.delete(id);
      notifyAction('Timeline event deleted');
    } catch (err) {
      console.warn('Failed to delete on server:', err);
      notifyAction('Failed to delete from database', true);
    }
  };

  // Update user role in MongoDB
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await adminAPI.updateUserRole(userId, newRole);
      if (res?.success) {
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
        notifyAction(`Role updated to ${newRole.toUpperCase()} for ${res?.user?.name || 'user'}`);
      } else {
        notifyAction(res?.message || 'Failed to update role', true);
      }
    } catch (err) {
      notifyAction(err.message || 'Error updating user role', true);
    }
  };

  // Terminate a Watch Space
  const handleTerminateSpace = async (code) => {
    if (!window.confirm(`Are you sure you want to terminate Watch Space ${code}? All participants will be disconnected.`)) {
      return;
    }
    try {
      const res = await adminAPI.terminateSpace(code);
      if (res?.success) {
        setSpacesList(prev => prev.filter(s => s.code !== code));
        notifyAction(`Watch Space ${code} closed successfully`);
      } else {
        notifyAction(res?.message || 'Could not close space', true);
      }
    } catch (err) {
      notifyAction('Failed to terminate space', true);
    }
  };

  // Handle Bulk JSON Upload
  const handleBulkUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');

    let parsedEvents;
    try {
      parsedEvents = JSON.parse(jsonInput);
      if (!Array.isArray(parsedEvents)) {
        throw new Error('JSON content must be an array of event objects: [ { "timestampSeconds": 120, "type": "Trivia", "content": "..." } ]');
      }
    } catch (err) {
      setUploadError(err.message || 'Invalid JSON syntax. Please check formatting.');
      return;
    }

    setUploadLoading(true);
    try {
      const res = await timelineAPI.uploadJson(selectedMovie, parsedEvents);
      if (res?.success) {
        notifyAction(`Imported ${res?.count || parsedEvents.length} events for ${selectedMovie}!`);
        setIsUploadModalOpen(false);
        setJsonInput('');
        fetchTimelineEvents();
      } else {
        setUploadError(res?.message || 'Failed to import events');
      }
    } catch (err) {
      setUploadError(err.message || 'Error uploading events to database');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setJsonInput(JSON.stringify(parsed, null, 2));
        setUploadError('');
      } catch (err) {
        setUploadError('Selected file is not valid JSON. Please check file formatting.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadTemplate = () => {
    const sample = [
      {
        timestampSeconds: 20,
        timeFormatted: "00:00:20",
        type: "Trivia",
        content: "Matthew McConaughey stars as Cooper, a former pilot navigating a dying Earth."
      },
      {
        timestampSeconds: 50,
        timeFormatted: "00:00:50",
        type: "Character",
        content: "Murph, Cooper's daughter, notices anomalies in her room pointing to gravitational coordinates.",
        metadata: { characterName: "Murph", actorName: "Mackenzie Foy" }
      },
      {
        timestampSeconds: 90,
        timeFormatted: "00:01:30",
        type: "Glossary",
        content: "Gargantua - A rapidly spinning supermassive black hole with a mass of 100 million suns.",
        metadata: { term: "Gargantua" }
      },
      {
        timestampSeconds: 120,
        timeFormatted: "00:02:00",
        type: "Variation Point",
        content: "Audience Poll: Activate theoretical physics commentary stream by Kip Thorne?",
        metadata: { variationOptions: ["Physics Deep Dive", "Director Story Vision"] }
      }
    ];
    setJsonInput(JSON.stringify(sample, null, 2));
    setUploadError('');
  };

  // ─── 403 ACCESS DENIED GUARD ───────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          background: 'rgba(23, 23, 23, 0.85)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Shield size={36} color="#ef4444" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: '#f87171' }}>
            Access Denied (403)
          </h2>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '16px'
          }}>
            Administrator Privileges Required
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Your account ({resolvedUser?.email || 'Current Account'}) is assigned the{' '}
            <strong style={{ color: '#e2e8f0' }}>{resolvedUser?.role || 'viewer'}</strong> role. Access to the Admin Timeline, Metadata Indexing, and Platform Management console is strictly restricted to platform administrators.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => onNavigate('home')}
              className="btn btn-primary"
              style={{ gap: '8px', padding: '10px 20px' }}
            >
              <ArrowLeft size={16} /> Return to Home
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="btn btn-secondary"
              style={{ padding: '10px 20px' }}
            >
              Account Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ADMIN CONSOLE VIEW ────────────────────────────────────────────────────
  return (
    <div className="admin-timeline-root" style={{ padding: embedded ? '0' : '24px 36px 80px', maxWidth: '1440px', margin: '0 auto', width: '100%', minHeight: embedded ? 'auto' : '85vh' }}>
      {/* Top Banner */}
      {!embedded ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={24} color="#a855f7" />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>WatchSpace Admin Console</h2>
              <span style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#c084fc',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                RBAC Master
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Synchronized management interface for timeline metadata, live room monitoring, titles catalog, and MongoDB user accounts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {actionNotice && (
              <div style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: actionNotice.isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                border: `1px solid ${actionNotice.isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
                color: actionNotice.isError ? '#fca5a5' : '#6ee7b7',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {actionNotice.isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                {actionNotice.message}
              </div>
            )}

            <button
              onClick={() => onNavigate('home')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Exit Admin
            </button>
          </div>
        </div>
      ) : actionNotice ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            background: actionNotice.isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
            border: `1px solid ${actionNotice.isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
            color: actionNotice.isError ? '#fca5a5' : '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {actionNotice.isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            {actionNotice.message}
          </div>
        </div>
      ) : null}

      <div className="admin-timeline-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        {/* Navigation Sidebar */}
        <div className="glass-card" style={{ padding: '14px', height: 'fit-content' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 10px 10px' }}>
            Admin Console
          </div>
          {[
            { id: 'timeline', label: 'Timeline Markers', icon: Database, badge: events.length },
            { id: 'dashboard', label: 'Live Dashboard', icon: BarChart3, badge: spacesList.length ? `${spacesList.length} Live` : null },
            { id: 'titles', label: 'Titles Catalog', icon: Film, badge: moviesList.length },
            { id: 'users', label: 'User Accounts', icon: Users, badge: usersList.length || null }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeAdminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveAdminTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                  color: isActive ? '#c084fc' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} color={isActive ? '#a855f7' : '#94a3b8'} />
                  {item.label}
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: isActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#f3e8ff' : '#64748b'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div style={{ margin: '14px 0 10px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          
          <button
            onClick={() => onNavigate('settings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px dashed rgba(255,255,255,0.12)',
              background: 'rgba(255, 255, 255, 0.02)',
              color: '#94a3b8',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <Settings size={16} color="#818cf8" />
            <span>Account Settings</span>
          </button>
        </div>

        {/* ── TAB 1: TIMELINE MANAGEMENT ───────────────────────────────────────── */}
        {activeAdminTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Title Selector & Quick Action Bar */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div className="admin-timeline-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="admin-timeline-title-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Active Title:</label>
                  <select
                    value={selectedMovie}
                    onChange={(e) => setSelectedMovie(e.target.value)}
                    className="input-field"
                    style={{ width: '240px', padding: '6px 12px' }}
                  >
                    {moviesList.map(m => {
                      const val = m.slug || m.id || m._id;
                      return <option key={val} value={val}>{m.title}</option>;
                    })}
                  </select>
                  <button
                    onClick={fetchTimelineEvents}
                    title="Refresh Timeline Markers"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 10px' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div className="admin-timeline-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Import multiple timeline markers from JSON"
                  >
                    <Upload size={13} color="#a855f7" /> Import JSON
                  </button>
                  <span className="badge badge-ai">
                    {events.length} Timeline Markers Indexed
                  </span>
                </div>
              </div>

              {/* Add New Event Form */}
              <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="admin-timeline-filter-row" style={{ display: 'grid', gridTemplateColumns: '170px 150px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Marker Type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="input-field"
                      style={{ padding: '8px' }}
                    >
                      <option value="Trivia">Trivia</option>
                      <option value="Character">Character</option>
                      <option value="Glossary">Glossary</option>
                      <option value="Variation Point">Variation Point (Poll)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Timestamp (HH:MM:SS)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={timestamp}
                      onChange={(e) => setTimestamp(e.target.value)}
                      placeholder="00:05:00"
                      style={{ padding: '8px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                      {eventType === 'Variation Point' ? 'Poll Question / Choice Prompt' : 'Grounded Content / Lore'}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={eventType === 'Variation Point' ? 'e.g. Which commentary stream should the group activate?' : 'Enter trivia fact, lore fact...'}
                      style={{ padding: '8px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <Plus size={15} /> Add Marker
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                      title="Bulk import markers from a JSON file or text"
                    >
                      <Upload size={14} /> Import JSON
                    </button>
                  </div>
                </div>

                {/* Variation Point Specific Options Row */}
                {eventType === 'Variation Point' && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.28)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700 }}>
                        🗳️ Pre-Approved Voting Choices (comma-separated):
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Separate each choice with a comma
                      </span>
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      value={variationOptionsInput}
                      onChange={(e) => setVariationOptionsInput(e.target.value)}
                      placeholder="Director Christopher Nolan Vision, Physicist Kip Thorne Science Lore"
                      style={{ padding: '8px 12px', borderColor: 'rgba(168, 85, 247, 0.45)' }}
                    />
                  </div>
                )}
              </form>
            </div>

            {/* Timeline Events Table */}
            <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Indexed Timeline Markers for {selectedMovie}</h4>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Triggers automatically during playback to prevent AI hallucinations</span>
              </div>

              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
                  <Sparkles size={28} color="#a855f7" style={{ marginBottom: '8px', opacity: 0.7 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No timeline events recorded yet for this title.</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Use the form above to populate scene trivia markers.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '10px 12px', width: '110px' }}>Timestamp</th>
                      <th style={{ padding: '10px 12px', width: '130px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Content / Lore Text</th>
                      <th style={{ padding: '10px 12px', width: '80px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, idx) => {
                      const evId = ev._id || ev.id || idx;
                      const timeDisp = ev.timeFormatted || (ev.timestampSeconds ? `00:${Math.floor(ev.timestampSeconds/60).toString().padStart(2, '0')}:${(ev.timestampSeconds%60).toString().padStart(2, '0')}` : '00:00:00');
                      return (
                        <tr
                          key={evId}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            transition: 'background 0.2s'
                          }}
                        >
                          <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                            {timeDisp}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${
                              ev.type === 'Trivia' ? 'badge-ai' : 
                              ev.type === 'Variation Point' ? 'badge-live' : 'badge-pill'
                            }`}>
                              {ev.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#e2e8f0', lineHeight: 1.4 }}>
                            <div>{ev.content}</div>
                            {ev.metadata?.variationOptions && ev.metadata.variationOptions.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {ev.metadata.variationOptions.map((opt, oi) => (
                                  <span key={oi} className="badge badge-pill" style={{ fontSize: '0.72rem', background: 'rgba(139, 92, 246, 0.18)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#d8b4fe' }}>
                                    • {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteEvent(evId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Delete Marker"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: LIVE DASHBOARD ────────────────────────────────────────────── */}
        {activeAdminTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Metric Tiles */}
            <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '18px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>Active Watch Spaces</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>
                  {spacesList.length} Live
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px' }}>
                  ● MongoDB watchspaces
                </div>
              </div>

              <div className="glass-card" style={{ padding: '18px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>Catalog Movies</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                  {moviesList.length} Titles
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                  Indexed in Catalog
                </div>
              </div>

              <div className="glass-card" style={{ padding: '18px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>Registered Users</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc' }}>
                  {usersList.length || '3'} Users
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px' }}>
                  ● Single Admin RBAC
                </div>
              </div>

              <div className="glass-card" style={{ padding: '18px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>WebSocket Gateway</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                  Connected
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px' }}>
                  Port 5000 Handshake
                </div>
              </div>
            </div>

            {/* Active Spaces Table */}
            <div className="glass-card admin-dashboard-table-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Active Watch Space Sessions</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '3px 0 0' }}>Real-time rooms created by hosts across the platform</p>
                </div>
                <button
                  onClick={fetchSpaces}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {spacesLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading active spaces...</div>
              ) : spacesList.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                  <Radio size={28} color="#64748b" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No active Watch Space sessions currently running.</p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>When users click "Create Space" or invite friends, they appear here live.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '10px 12px' }}>Room Code</th>
                      <th style={{ padding: '10px 12px' }}>Room Title</th>
                      <th style={{ padding: '10px 12px' }}>Movie</th>
                      <th style={{ padding: '10px 12px' }}>Host</th>
                      <th style={{ padding: '10px 12px' }}>Participants</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spacesList.map(s => (
                      <tr key={s.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                          {s.code}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>
                          {s.title}
                        </td>
                        <td style={{ padding: '12px', color: '#c084fc' }}>
                          {s.movie?.title || 'Dune'}
                        </td>
                        <td style={{ padding: '12px', color: '#e2e8f0' }}>
                          {s.host?.name || 'Host'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-pill">
                            {(s.participants || []).length} connected
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleTerminateSpace(s.code)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', gap: '4px' }}
                            title="Force close room"
                          >
                            <Power size={13} /> End Room
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: TITLES CATALOG ────────────────────────────────────────────── */}
        {activeAdminTab === 'titles' && (
          <div className="glass-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Platform Movie Catalog ({moviesList.length} Titles)</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '3px 0 0' }}>Titles available for synchronized playback and RAG lore trivia</p>
              </div>
              <button
                onClick={() => {
                  setAddMovieError('');
                  setIsAddMovieModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px' }}
              >
                <Plus size={15} /> Add New Movie
              </button>
            </div>

            {moviesLoading && moviesList.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Loading catalog titles...</div>
            ) : moviesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
                <Film size={28} color="#a855f7" style={{ marginBottom: '8px', opacity: 0.7 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No titles in catalog.</p>
                <button
                  onClick={() => setIsAddMovieModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '12px', gap: '6px' }}
                >
                  <Plus size={14} /> Add First Movie
                </button>
              </div>
            ) : (
              <div className="admin-movie-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {moviesList.map(movie => {
                  const movieSlug = movie.slug || movie.id || movie._id;
                  const isCurrent = selectedMovie === movieSlug;
                  return (
                    <div 
                      key={movieSlug} 
                      style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        background: isCurrent ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.03)', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        border: isCurrent ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.06)' 
                      }}
                    >
                      <img 
                        src={movie.poster || SAMPLE_POSTERS[0].url} 
                        alt={movie.title} 
                        style={{ width: '64px', height: '88px', objectFit: 'cover', borderRadius: '6px' }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={movie.title}>
                            {movie.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{movie.duration} • {movie.year}</div>
                          <div style={{ fontSize: '0.72rem', color: '#c084fc', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(movie.genres || []).join(', ')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                          <button
                            onClick={() => {
                              setSelectedMovie(movieSlug);
                              setActiveAdminTab('timeline');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', flex: 1, justifyContent: 'center' }}
                          >
                            Manage Markers →
                          </button>
                          <button
                            onClick={() => handleDeleteMovie(movie)}
                            className="btn btn-secondary btn-sm"
                            title={`Delete "${movie.title}"`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '5px 8px',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: USER ACCOUNTS (MONGODB RBAC) ─────────────────────────────── */}
        {activeAdminTab === 'users' && (
          <div className="glass-card admin-users-table-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Registered MongoDB Accounts</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '3px 0 0' }}>
                  Live users from MongoDB. Changes to roles take effect immediately across all sessions.
                </p>
              </div>
              <button
                onClick={fetchUsers}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {usersLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading registered users...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '10px 12px' }}>User</th>
                    <th style={{ padding: '10px 12px' }}>Email</th>
                    <th style={{ padding: '10px 12px' }}>Current Role</th>
                    <th style={{ padding: '10px 12px' }}>Registered</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Modify Role (RBAC)</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isSystemAdmin = u.email === 'admin@watchspace.tv';
                    return (
                      <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img 
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                            alt={u.name} 
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
                          />
                          {u.name}
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8' }}>{u.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${u.role === 'admin' ? 'badge-ai' : u.role === 'host' ? 'badge-live' : 'badge-pill'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#64748b', fontSize: '0.78rem' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {isSystemAdmin ? (
                            <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 700 }}>
                              👑 Primary Admin
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              className="input-field"
                              style={{ width: '110px', padding: '4px 8px', fontSize: '0.78rem' }}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="host">Host</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── BULK JSON UPLOAD MODAL ───────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="#a855f7" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Bulk Import Timeline Markers</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '14px', lineHeight: 1.5 }}>
              Paste a JSON array of scene markers for <strong style={{ color: '#38bdf8' }}>{selectedMovie}</strong>. 
              Each item should include <code>timestampSeconds</code>, <code>type</code> ("Trivia", "Character", "Glossary", "Variation Point"), and <code>content</code>.
            </p>

            {uploadError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                marginBottom: '12px'
              }}>
                {uploadError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px', fontSize: '0.78rem' }}
              >
                <Upload size={13} color="#38bdf8" /> 📁 Choose .json File
              </button>

              <button
                type="button"
                onClick={handleLoadTemplate}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px', fontSize: '0.78rem' }}
              >
                <Sparkles size={13} color="#a855f7" /> 📋 Load Sample Markers
              </button>
            </div>

            <form onSubmit={handleBulkUploadSubmit}>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`[\n  {\n    "timestampSeconds": 180,\n    "timeFormatted": "00:03:00",\n    "type": "Trivia",\n    "content": "Frank Herbert was inspired by the sand dunes of Florence, Oregon."\n  }\n]`}
                rows={10}
                className="input-field"
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  padding: '12px',
                  marginBottom: '16px'
                }}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={uploadLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploadLoading}
                  style={{ gap: '6px' }}
                >
                  {uploadLoading ? 'Importing...' : 'Upload & Hydrate Title'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD NEW MOVIE ────────────────────────────────────────────── */}
      {isAddMovieModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={20} color="#a855f7" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Add Movie to Catalog</h3>
              </div>
              <button
                onClick={() => setIsAddMovieModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {addMovieError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '16px'
              }}>
                {addMovieError}
              </div>
            )}

            <form onSubmit={handleCreateMovie} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Movie Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blade Runner 2049"
                  value={newMovieTitle}
                  onChange={(e) => setNewMovieTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div className="admin-upload-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Release Year
                  </label>
                  <input
                    type="text"
                    placeholder="2026"
                    value={newMovieYear}
                    onChange={(e) => setNewMovieYear(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="2h 15m"
                    value={newMovieDuration}
                    onChange={(e) => setNewMovieDuration(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Rating (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    placeholder="8.5"
                    value={newMovieRating}
                    onChange={(e) => setNewMovieRating(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Genres (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Sci-Fi, Action, Thriller"
                  value={newMovieGenres}
                  onChange={(e) => setNewMovieGenres(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Director
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Christopher Nolan"
                    value={newMovieDirector}
                    onChange={(e) => setNewMovieDirector(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                    Top Cast (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leonardo DiCaprio, Joseph Gordon-Levitt"
                    value={newMovieCast}
                    onChange={(e) => setNewMovieCast(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Synopsis / Description *
                </label>
                <textarea
                  placeholder="A brief overview of the plot and themes..."
                  value={newMovieDescription}
                  onChange={(e) => setNewMovieDescription(e.target.value)}
                  rows={3}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600, margin: 0 }}>
                    Poster Image URL
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Or pick a sample preset:</span>
                </div>
                <input
                  type="url"
                  placeholder="https://.../poster.jpg"
                  value={newMoviePoster}
                  onChange={(e) => setNewMoviePoster(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {SAMPLE_POSTERS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewMoviePoster(preset.url)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: newMoviePoster === preset.url ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        border: newMoviePoster === preset.url ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: newMoviePoster === preset.url ? '#f3e8ff' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Video Stream / Asset URL (Local MP4, Direct MP4, or YouTube)
                </label>
                <input
                  type="text"
                  placeholder="/movies/movie.mp4 or https://.../video.mp4 or YouTube link"
                  value={newMovieVideoUrl}
                  onChange={(e) => setNewMovieVideoUrl(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setNewMovieVideoUrl('/movies/interstellar.mp4')}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: '#c084fc',
                      cursor: 'pointer'
                    }}
                  >
                    📁 Local: /movies/interstellar.mp4
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMovieVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: '#38bdf8',
                      cursor: 'pointer'
                    }}
                  >
                    🌐 Public Demo MP4
                  </button>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '6px' }}>
                  💡 <strong>Tip for AI & Trivia:</strong> Local MP4 or Direct MP4 gives 100% exact second-by-second timestamps for Scene Trivia and AI Co-Pilot grounding.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddMovieModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isAddingMovie}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isAddingMovie}
                  style={{ gap: '6px' }}
                >
                  {isAddingMovie ? 'Adding to Catalog...' : 'Save & Publish Movie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
