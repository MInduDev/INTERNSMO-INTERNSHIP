import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Shield, Plus, Upload, Trash2, Film, Users, BarChart3, Database, 
  ArrowLeft, CheckCircle2, Activity, Clock, Sparkles, AlertCircle,
  X, RefreshCw, Power, Check, Radio, Settings
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, resolveAssetUrl, timelineAPI, spacesAPI, adminAPI } from '../services/api';

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
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState('');
  const [eventType, setEventType] = useState('Trivia');
  const [timestamp, setTimestamp] = useState('');
  const [content, setContent] = useState('');
  const [variationOptionsInput, setVariationOptionsInput] = useState('');
  const [subtitleOptionLabel, setSubtitleOptionLabel] = useState('');
  const [subtitleLanguage, setSubtitleLanguage] = useState('en');
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [subtitleUploadLoading, setSubtitleUploadLoading] = useState(false);
  const subtitleFileInputRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeAdminTab, setActiveAdminTab] = useState('timeline');

  // Real data state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [spacesList, setSpacesList] = useState([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState('');
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
  const [moviesError, setMoviesError] = useState('');
  const activeSpaces = spacesList.filter((space) => ['active', 'lobby'].includes(space.status));

  // Add Movie Modal State
  const [isAddMovieModalOpen, setIsAddMovieModalOpen] = useState(false);
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieYear, setNewMovieYear] = useState('');
  const [newMovieDuration, setNewMovieDuration] = useState('');
  const [newMovieRating, setNewMovieRating] = useState('');
  const [newMovieGenres, setNewMovieGenres] = useState('');
  const [newMovieDirector, setNewMovieDirector] = useState('');
  const [newMovieCast, setNewMovieCast] = useState('');
  const [newMovieDescription, setNewMovieDescription] = useState('');
  const [newMoviePosterFile, setNewMoviePosterFile] = useState(null);
  const [newMovieVideoFile, setNewMovieVideoFile] = useState(null);
  const [isAddingMovie, setIsAddingMovie] = useState(false);
  const [addMovieError, setAddMovieError] = useState('');
  const moviePosterInputRef = useRef(null);
  const movieVideoInputRef = useRef(null);

  const fetchMovies = useCallback(async () => {
    setMoviesError('');
    try {
      setMoviesLoading(true);
      const res = await moviesAPI.getAll();
      const list = Array.isArray(res) ? res : (res?.movies || []);
      setMoviesList(list);
      return list;
    } catch (err) {
      setMoviesList([]);
      setMoviesError(err.message || 'Could not load catalog titles.');
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
      setSelectedMovie(moviesList[0].slug || moviesList[0].id || moviesList[0]._id);
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

    if (!newMoviePosterFile) {
      setAddMovieError('Choose a poster image file.');
      return;
    }
    if (!newMovieVideoFile) {
      setAddMovieError('Choose an MP4 or WebM movie file.');
      return;
    }

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
        ...(newMovieYear.trim() ? { year: newMovieYear.trim() } : {}),
        ...(newMovieDuration.trim() ? { duration: newMovieDuration.trim() } : {}),
        ...(newMovieRating.trim() ? { rating: Number(newMovieRating) } : {}),
        genres: genresArray,
        ...(newMovieDirector.trim() ? { director: newMovieDirector.trim() } : {}),
        cast: castArray,
        description: newMovieDescription.trim()
      };

      const res = await moviesAPI.create(payload, newMoviePosterFile, newMovieVideoFile);
      if (res?.success || res?.movie) {
        if (actionNoticeTimeoutRef.current) clearTimeout(actionNoticeTimeoutRef.current);
        setActionNotice({ message: `"${payload.title}" added to movie catalog!`, isError: false });
        actionNoticeTimeoutRef.current = setTimeout(() => setActionNotice(null), 5000);

        setIsAddMovieModalOpen(false);
        setNewMovieTitle('');
        setNewMovieYear('');
        setNewMovieDuration('');
        setNewMovieRating('');
        setNewMovieGenres('');
        setNewMovieDirector('');
        setNewMovieCast('');
        setNewMovieDescription('');
        setNewMoviePosterFile(null);
        setNewMovieVideoFile(null);
        if (moviePosterInputRef.current) moviePosterInputRef.current.value = '';
        if (movieVideoInputRef.current) movieVideoInputRef.current.value = '';
        await fetchMovies();
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
    setEventsError('');
    if (!selectedMovie) {
      setEvents([]);
      return;
    }
    try {
      setEventsLoading(true);
      const res = await timelineAPI.getByMovie(selectedMovie);
      if (Array.isArray(res)) {
        setEvents(res);
      } else if (res?.events) {
        setEvents(res.events);
      } else {
        throw new Error('The timeline endpoint returned an unexpected response.');
      }
    } catch (err) {
      setEvents([]);
      setEventsError(err.message || 'Could not load timeline markers.');
    } finally {
      setEventsLoading(false);
    }
  }, [selectedMovie]);

  useEffect(() => {
    fetchTimelineEvents();
  }, [fetchTimelineEvents]);

  // Fetch real users from MongoDB
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const users = await adminAPI.getUsers();
      setUsersList(users);
    } catch (err) {
      setUsersList([]);
      setUsersError(err.message || 'Could not load users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch real watch spaces from MongoDB
  const fetchSpaces = useCallback(async () => {
    setSpacesLoading(true);
    setSpacesError('');
    try {
      const spaces = await adminAPI.getSpaces();
      setSpacesList(spaces);
    } catch (err) {
      setSpacesList([]);
      setSpacesError(err.message || 'Could not load Watch Spaces.');
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

  const handleUploadSubtitleOption = async () => {
    const label = subtitleOptionLabel.trim();
    const languageCode = subtitleLanguage.trim();
    if (!label || !subtitleFile || !/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(languageCode)) {
      notifyAction('Enter an option label, language code, and choose a .vtt file.', true);
      return;
    }

    let options = [];
    const input = variationOptionsInput.trim();
    if (input) {
      try {
        if (input.startsWith('[')) {
          options = JSON.parse(input);
        } else if (input.startsWith('{')) {
          notifyAction('Variation options must be a JSON array.', true);
          return;
        } else {
          options = input.split(',').map(option => option.trim()).filter(Boolean)
            .map((optionLabel, index) => ({ id: `opt-${index + 1}`, label: optionLabel }));
        }
      } catch (_error) {
        notifyAction('Fix the variation options JSON before uploading a subtitle option.', true);
        return;
      }
    }
    if (!Array.isArray(options) || options.length >= 4 ||
        options.some(option => !option || (typeof option !== 'string' && typeof option !== 'object'))) {
      notifyAction('Variation polls require 2–4 valid options; no more than four can be added.', true);
      return;
    }

    setSubtitleUploadLoading(true);
    try {
      const response = await timelineAPI.uploadSubtitle(subtitleFile, languageCode);
      options.push({
        id: `subtitle-${Date.now()}`,
        label,
        assetType: 'subtitle',
        subtitleUrl: response.asset.url,
        language: response.asset.language
      });
      setVariationOptionsInput(JSON.stringify(options, null, 2));
      setSubtitleOptionLabel('');
      setSubtitleFile(null);
      if (subtitleFileInputRef.current) subtitleFileInputRef.current.value = '';
      notifyAction(`Uploaded and added "${label}". Add at least one more option, then save the marker.`);
    } catch (error) {
      notifyAction(error.message || 'Could not upload the subtitle file.', true);
    } finally {
      setSubtitleUploadLoading(false);
    }
  };

  // Add timeline event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const totalSeconds = parseTimestampToSeconds(timestamp);
    let variationOptions;
    if (eventType === 'Variation Point' && variationOptionsInput.trim()) {
      const input = variationOptionsInput.trim();
      if (input.startsWith('[') || input.startsWith('{')) {
        try {
          variationOptions = JSON.parse(input);
        } catch (_err) {
          notifyAction('Variation options must be valid JSON.', true);
          return;
        }
        if (!Array.isArray(variationOptions)) {
          notifyAction('Variation options JSON must be an array.', true);
          return;
        }
      } else {
        variationOptions = input.split(',').map(option => option.trim()).filter(Boolean);
      }
    }
    const eventPayload = {
      movieId: selectedMovie,
      timestampSeconds: totalSeconds,
      timeFormatted: timestamp,
      type: eventType,
      content: content.trim(),
      metadata: variationOptions
        ? { variationOptions }
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
            { id: 'dashboard', label: 'Live Dashboard', icon: BarChart3, badge: activeSpaces.length ? `${activeSpaces.length} Live` : null },
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

              {moviesError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load catalog: {moviesError}</p>}
              {eventsError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load timeline markers: {eventsError}</p>}

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
                      placeholder="HH:MM:SS"
                      style={{ padding: '8px' }}
                      required
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
                        Approved subtitle variations:
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        2–4 options
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                      <input
                        className="input-field"
                        value={subtitleOptionLabel}
                        onChange={(e) => setSubtitleOptionLabel(e.target.value)}
                        placeholder="Option label (e.g. Hindi subtitles)"
                        aria-label="Subtitle variation option label"
                      />
                      <input
                        className="input-field"
                        value={subtitleLanguage}
                        onChange={(e) => setSubtitleLanguage(e.target.value)}
                        placeholder="Language code (e.g. hi)"
                        aria-label="Subtitle language code"
                        maxLength={20}
                      />
                      <input
                        ref={subtitleFileInputRef}
                        className="input-field"
                        type="file"
                        accept=".vtt,text/vtt"
                        aria-label="Choose a WebVTT subtitle file"
                        onChange={(e) => setSubtitleFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleUploadSubtitleOption}
                        disabled={subtitleUploadLoading}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Upload size={14} /> {subtitleUploadLoading ? 'Uploading…' : 'Upload & add option'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Upload a valid WebVTT (.vtt) file for each subtitle choice. Admin uploads are validated and stored by the server; poll results display as synchronized app captions over YouTube.
                    </p>
                    <textarea
                      className="input-field"
                      value={variationOptionsInput}
                      onChange={(e) => setVariationOptionsInput(e.target.value)}
                      placeholder={'[\n  { "label": "Original audio" },\n  { "label": "Hindi subtitles" }\n]'}
                      rows={6}
                      required
                      style={{ padding: '8px 12px', borderColor: 'rgba(168, 85, 247, 0.45)', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                    />
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Uploaded subtitle options are added here with a server-generated asset reference. Add 2–4 options total and save the marker; arbitrary subtitle URLs are not accepted.
                    </p>
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

              {eventsLoading ? (
                <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading timeline markers...</p>
              ) : eventsError ? null : events.length === 0 ? (
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
                                    • {typeof opt === 'string' ? opt : opt.label}
                                    {typeof opt === 'object' && opt.approved && ' (asset approved)'}
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
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>Open Watch Spaces</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>
                {activeSpaces.length} Live
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px' }}>
                  ● MongoDB Watch Spaces
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
                  {usersList.length} Users
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px' }}>
                  ● Single Admin RBAC
                </div>
              </div>

              <div className="glass-card" style={{ padding: '18px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>WebSocket Gateway</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#94a3b8' }}>
                Not measured
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                No gateway health endpoint
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

              {spacesError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load Watch Spaces: {spacesError}</p>}
              {spacesLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading active spaces...</div>
              ) : spacesError ? null : activeSpaces.length === 0 ? (
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
                    {activeSpaces.map(s => (
                      <tr key={s.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                          {s.code}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>
                          {s.title}
                        </td>
                        <td style={{ padding: '12px', color: '#c084fc' }}>
                          {s.movie?.title || 'Not specified'}
                        </td>
                        <td style={{ padding: '12px', color: '#e2e8f0' }}>
                          {s.host?.name || 'Not available'}
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

            {moviesError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load catalog: {moviesError}</p>}
            {moviesLoading && moviesList.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Loading catalog titles...</div>
            ) : moviesError ? null : moviesList.length === 0 ? (
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
                      {movie.poster
                        ? <img src={resolveAssetUrl(movie.poster)} alt={movie.title} style={{ width: '64px', height: '88px', objectFit: 'cover', borderRadius: '6px' }} />
                        : <div aria-hidden="true" style={{ width: '64px', height: '88px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />}
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

            {usersError && <p role="alert" style={{ color: '#fca5a5' }}>Could not load registered users: {usersError}</p>}
            {usersLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading registered users...</div>
            ) : usersError ? null : usersList.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No registered users were returned by the server.</p>
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
                          {u.avatar
                            ? <img src={u.avatar} alt={u.name || ''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            : <span aria-label={u.name || 'User'} style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)' }}>{u.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                          {u.name}
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8' }}>{u.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${u.role === 'admin' ? 'badge-ai' : u.role === 'host' ? 'badge-live' : 'badge-pill'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#64748b', fontSize: '0.78rem' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Date not available'}
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

            </div>

            <form onSubmit={handleBulkUploadSubmit}>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`[\n  {\n    "timestampSeconds": 0,\n    "timeFormatted": "HH:MM:SS",\n    "type": "Trivia",\n    "content": "Enter verified timeline content here."\n  }\n]`}
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
                  placeholder="Enter movie title"
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
                    placeholder="Release year"
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
                    placeholder="Duration"
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
                    placeholder="Rating"
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
                  placeholder="Enter genres, comma-separated"
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
                    placeholder="Director"
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
                    placeholder="Cast members, comma-separated"
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
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                  Poster Image File *
                </label>
                <input
                  ref={moviePosterInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => setNewMoviePosterFile(e.target.files?.[0] || null)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
                <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '6px' }}>
                  JPEG, PNG, or WebP; maximum 10 MB. This image is also used as the movie backdrop.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Movie Video File *
                </label>
                <input
                  ref={movieVideoInputRef}
                  type="file"
                  accept=".mp4,.webm,video/mp4,video/webm"
                  onChange={(e) => setNewMovieVideoFile(e.target.files?.[0] || null)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
                <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '6px' }}>
                  Upload an MP4 or WebM file (maximum 2 GB). Use only video you have permission to upload.
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
