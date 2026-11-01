import React from 'react';
import { Sparkles, Search, Bell, Plus, Shield, User, LogIn, Settings } from 'lucide-react';

export default function Navbar({ currentScreen, onNavigate, onOpenCreateModal, currentUser }) {
  const [activeUser, setActiveUser] = React.useState(currentUser);

  React.useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    }
  }, [currentUser]);

  React.useEffect(() => {
    const handleSync = (e) => {
      const u = e.detail || JSON.parse(localStorage.getItem('user') || 'null');
      if (u) setActiveUser(u);
    };
    window.addEventListener('watchspace-user-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('watchspace-user-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const storedUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const user = activeUser || currentUser || storedUser;
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <nav className="app-navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 32px',
      background: 'rgba(7, 10, 18, 0.9)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Left: Brand Logo & Navigation Links */}
      <div className="app-navbar-main" style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
        <div
          onClick={() => onNavigate('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(168, 85, 247, 0.4)'
          }}>
            <Sparkles size={18} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            WatchSpace <span style={{ color: '#a855f7' }}>AI</span>
          </span>
        </div>

        {/* Main Nav Links */}
        <div className="app-navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {[
            { id: 'home', label: 'Home' },
            { id: 'browse', label: 'Browse' },
            { id: 'my-spaces', label: 'Watch Spaces' },
            { id: 'recommendations', label: 'Recommendations' }
          ].map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '6px 0',
                  transition: 'color 0.2s'
                }}
              >
                {item.label}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#6366f1',
                    borderRadius: '2px'
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Search, Actions, Admin & Settings, Profile */}
      <div className="app-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Search Bar */}
        <div className="app-navbar-search" style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Search movies, rooms..."
            onClick={() => currentScreen !== 'browse' && onNavigate('browse')}
            style={{
              padding: '8px 12px 8px 36px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.85rem',
              width: '180px',
              outline: 'none',
              transition: 'all 0.2s'
            }}
          />
        </div>

        {/* Join Space Button */}
        <button
          onClick={() => onNavigate('join-space')}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <LogIn size={14} />
          Join Space
        </button>

        {/* Create Space Button */}
        <button
          onClick={onOpenCreateModal}
          className="btn btn-primary btn-sm"
          style={{ gap: '6px' }}
        >
          <Plus size={15} />
          Create Space
        </button>

        {/* Admin Console Shortcut */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin-timeline')}
            className="btn btn-secondary btn-sm"
            style={{
              gap: '6px',
              borderColor: 'rgba(168, 85, 247, 0.4)',
              background: currentScreen === 'admin-timeline' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.1)',
              color: '#d8b4fe'
            }}
            title="Open Admin Timeline & System Console"
          >
            <Shield size={14} color="#c084fc" />
            Admin
          </button>
        )}



        {/* Notification Bell */}
        <button
          onClick={() => alert('No new notifications')}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex'
          }}
        >
          <Bell size={18} />
        </button>

        {/* User Profile Avatar / Sign In */}
        {user ? (
          <div
            onClick={() => onNavigate('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: '20px',
              background: currentScreen === 'profile' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: currentScreen === 'profile' ? '1px solid #6366f1' : '1px solid transparent'
            }}
          >
            {user.avatar
              ? <img src={user.avatar} alt={user.name || ''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
              : <span aria-hidden="true" style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.08)' }}>{user.name?.charAt(0)?.toUpperCase() || '?'}</span>}
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name || user.email || 'Profile'}</span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('login')}
            className="btn btn-primary btn-sm"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
