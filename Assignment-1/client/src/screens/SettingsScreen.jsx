import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Sliders, HelpCircle, Save, Check, LogOut, Lock, Key, AlertCircle } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { authAPI } from '../services/api';

export default function SettingsScreen({ onNavigate, currentUser, onUserUpdated, embedded = false }) {
  const { data: profileData } = useFetch(() => authAPI.getMe());

  const storedUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [localUser, setLocalUser] = useState(null);
  const activeUser = localUser || currentUser || (profileData?.email ? profileData : profileData?.user) || storedUser;

  const [activeTab, setActiveTab] = useState('account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subtitleLang, setSubtitleLang] = useState('English');
  const [copilotPref, setCopilotPref] = useState(() => {
    return localStorage.getItem('watchspace_copilot') || 'Normal';
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailNotifs, setEmailNotifs] = useState(() => {
    const saved = localStorage.getItem('watchspace_notifications');
    return saved ? JSON.parse(saved).emailNotifs ?? true : true;
  });
  const [partyInvites, setPartyInvites] = useState(() => {
    const saved = localStorage.getItem('watchspace_notifications');
    return saved ? JSON.parse(saved).partyInvites ?? true : true;
  });
  const [recommendationsNotif, setRecommendationsNotif] = useState(() => {
    const saved = localStorage.getItem('watchspace_notifications');
    return saved ? JSON.parse(saved).recommendationsNotif ?? false : false;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState({ text: '', type: '' });

  useEffect(() => {
    if (activeUser) {
      if (activeUser.name) setName(activeUser.name);
      if (activeUser.email) setEmail(activeUser.email);
      if (activeUser.subtitleLanguage) setSubtitleLang(activeUser.subtitleLanguage);
    }
  }, [activeUser?.email, activeUser?.name, activeUser?.subtitleLanguage]);

  const handleSave = async () => {
    if (showPasswordChange && newPassword) {
      if (newPassword.length < 6) {
        setSaveToast({ text: 'New password must be at least 6 characters', type: 'error' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveToast({ text: 'Passwords do not match', type: 'error' });
        return;
      }
    }

    setIsSaving(true);
    setSaveToast({ text: '', type: '' });

    try {
      const payload = {
        name: name.trim() || activeUser?.name,
        email: email.trim() || activeUser?.email,
        subtitleLanguage: subtitleLang,
        ...(showPasswordChange && newPassword ? { password: newPassword } : {})
      };

      const res = await authAPI.updateProfile(payload);

      // Save local preferences
      localStorage.setItem('watchspace_copilot', copilotPref);
      localStorage.setItem('watchspace_notifications', JSON.stringify({
        emailNotifs,
        partyInvites,
        recommendationsNotif
      }));

      if (res && res.success) {
        const updated = res.user;
        setLocalUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('watchspace-user-updated', { detail: updated }));
        if (onUserUpdated) onUserUpdated(updated);
        if (showPasswordChange) {
          setShowPasswordChange(false);
          setNewPassword('');
          setConfirmPassword('');
        }
        setSaveToast({ text: 'Settings & preferences saved successfully!', type: 'success' });
      } else {
        setSaveToast({ text: res?.message || 'Failed to save settings', type: 'error' });
      }
    } catch (err) {
      setSaveToast({ text: err.message || 'Error saving settings', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveToast(prev => prev.type === 'success' ? { text: '', type: '' } : prev);
      }, 3000);
    }
  };

  const isAdmin = activeUser?.role === 'admin';

  const menuItems = [
    { id: 'account', label: 'Account Settings', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ];

  return (
    <div className="settings-screen" style={{ padding: embedded ? '0' : '24px 36px 80px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {!embedded && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Account & System Settings</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Configure your personal preferences, AI assistant responsiveness, and notification alerts.
          </p>
        </div>
      )}

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        {/* Sidebar Menu */}
        <div className="glass-card" style={{ padding: '12px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => item.isAdminLink ? onNavigate('admin-timeline') : setActiveTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: item.isAdminLink ? '1px dashed rgba(168, 85, 247, 0.4)' : 'none',
                  background: item.isAdminLink 
                    ? 'rgba(168, 85, 247, 0.12)' 
                    : (isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent'),
                  color: item.isAdminLink ? '#c084fc' : (isActive ? '#c084fc' : '#94a3b8'),
                  fontWeight: isActive || item.isAdminLink ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  marginBottom: '4px'
                }}
              >
                <Icon size={18} color={item.isAdminLink ? '#c084fc' : (isActive ? '#a855f7' : '#94a3b8')} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="glass-card settings-content" style={{ padding: '32px' }}>
          {activeTab === 'account' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>Account Settings</h3>

              {/* Display Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              {/* Password Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a855f7',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {showPasswordChange ? 'Cancel Password Change' : 'Change Password'}
                  </button>
                </div>

                {!showPasswordChange ? (
                  <input
                    type="password"
                    className="input-field"
                    value="••••••••••••"
                    readOnly
                    style={{ opacity: 0.6 }}
                  />
                ) : (
                  <div style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                        New Password (minimum 6 characters)
                      </label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>Viewing & AI Preferences</h3>

              {/* Subtitle Language */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Preferred Subtitle Language
                </label>
                <select
                  value={subtitleLang}
                  onChange={(e) => setSubtitleLang(e.target.value)}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
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

              {/* AI Co-Pilot Preference */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                  AI Co-Pilot Responsiveness Level
                </label>
                <select
                  value={copilotPref}
                  onChange={(e) => setCopilotPref(e.target.value)}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Minimal">Minimal (Only critical plot alerts & spoilers shield)</option>
                  <option value="Normal">Normal (Standard lore, cast info & timeline answers)</option>
                  <option value="Chatty">Chatty (Frequent trivia, cinematics deep dive & easter eggs)</option>
                </select>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Notification Settings</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email Notifications</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Receive session recaps and account security alerts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#ff2a54' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Watch Party Invites</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Get notified when friends create or start a watch party</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={partyInvites}
                    onChange={(e) => setPartyInvites(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#ff2a54' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Recommendations</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Weekly digest of new movies matching your watch history</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={recommendationsNotif}
                    onChange={(e) => setRecommendationsNotif(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#ff2a54' }}
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Privacy & Security</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
                WatchSpace AI protects your session privacy with end-to-end encrypted room tokens and strict server-side RBAC.
              </p>
              <div className="badge badge-ai" style={{ padding: '8px 14px' }}>JWT Active • Viewer & Host Permissions Granted</div>
            </div>
          )}

          {activeTab === 'help' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Help & Support</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Need help troubleshooting synchronization or timeline AI? Check out our quick guides or submit a support ticket.
              </p>
            </div>
          )}

          {/* Feedback message banner */}
          {saveToast.text && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: saveToast.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: saveToast.type === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: saveToast.type === 'success' ? '#4ade80' : '#f87171'
            }}>
              {saveToast.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="settings-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="settings-primary-actions" style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary"
                style={{ padding: '10px 24px', gap: '6px' }}
              >
                {isSaving ? <Check size={16} /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className="btn btn-secondary"
              >
                Back to Profile
              </button>
            </div>

            <div className="settings-logout-action" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('refreshToken');
                  localStorage.removeItem('user');
                  onNavigate('login');
                }}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px', color: '#f87171' }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
