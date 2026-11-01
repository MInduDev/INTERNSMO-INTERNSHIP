import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import CreateSpaceModal from './components/CreateSpaceModal';
import { authAPI } from './services/api';

// Screens
import LoginPage from './screens/LoginPage';
import RegisterPage from './screens/RegisterPage';
import HomeScreen from './screens/HomeScreen';
import BrowseScreen from './screens/BrowseScreen';
import MovieDetailsScreen from './screens/MovieDetailsScreen';
import JoinSpaceScreen from './screens/JoinSpaceScreen';
import LobbyScreen from './screens/LobbyScreen';
import WatchRoomScreen from './screens/WatchRoomScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import MySpacesScreen from './screens/MySpacesScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import AICoPilotExpandedScreen from './screens/AICoPilotExpandedScreen';
import AdminTimelineScreen from './screens/AdminTimelineScreen';
import HostDisconnectedScreen from './screens/HostDisconnectedScreen';
import ReconnectingScreen from './screens/ReconnectingScreen';

export default function App() {
  // Current screen state - redirect to login if no auth token found
  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('token') ? 'home' : 'login';
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  // Shared current user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const handleUserUpdated = useCallback((newUserData) => {
    if (newUserData) {
      setCurrentUser(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
    }
  }, []);

  // Fetch fresh profile on load or token change & listen for update events
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe().then((res) => {
        const u = res?.user || (res?.email ? res : null);
        if (u) {
          handleUserUpdated(u);
        }
      });
    }

    const handleSync = (e) => {
      if (e.detail) {
        handleUserUpdated(e.detail);
      }
    };
    const handleAuthExpired = () => {
      setCurrentUser(null);
      setRoomCode(null);
      setCurrentScreen('login');
    };

    window.addEventListener('watchspace-user-updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('watchspace-auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('watchspace-user-updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('watchspace-auth-expired', handleAuthExpired);
    };
  }, [handleUserUpdated]);

  // Navigate helper
  const navigate = (screenId) => {
    setCurrentScreen(screenId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle room creation
  const handleSpaceCreated = (spaceData) => {
    setIsCreateModalOpen(false);
    if (spaceData.movie) setSelectedMovie(spaceData.movie);
    if (spaceData.code) setRoomCode(spaceData.code);
    navigate('lobby');
  };

  // Header should be visible on all browsing & app screens, but hidden on standalone auth/states
  const hideNavbarScreens = ['login', 'register', 'watch-room'];
  const showNavbar = !hideNavbarScreens.includes(currentScreen);

  // Render the current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginPage onNavigate={navigate} onLoginSuccess={handleUserUpdated} />;
      
      case 'register':
        return <RegisterPage onNavigate={navigate} onRegisterSuccess={handleUserUpdated} />;
      
      case 'home':
        return (
          <HomeScreen
            onNavigate={navigate}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectMovie={setSelectedMovie}
            onJoinRoom={(code) => setRoomCode(code)}
            currentUser={currentUser}
          />
        );
      
      case 'browse':
        return (
          <BrowseScreen
            onNavigate={navigate}
            onSelectMovie={setSelectedMovie}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        );
      
      case 'movie-details':
        return (
          <MovieDetailsScreen
            movie={selectedMovie}
            onNavigate={navigate}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        );
      
      case 'create-modal-preview':
        // Specifically for previewing screen 6 as a standalone view
        return (
          <div style={{ padding: '60px 20px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreateSpaceModal
              isOpen={true}
              movie={selectedMovie}
              onClose={() => navigate('home')}
              onCreated={handleSpaceCreated}
              currentUser={currentUser}
            />
          </div>
        );

      case 'join-space':
        return (
          <JoinSpaceScreen
            onNavigate={navigate}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onJoinRoom={(code) => setRoomCode(code)}
          />
        );
      
      case 'lobby':
        return (
          <LobbyScreen
            onNavigate={navigate}
            roomCode={roomCode}
            movie={selectedMovie}
            currentUser={currentUser}
          />
        );
      
      case 'watch-room':
        return (
          <WatchRoomScreen
            onNavigate={navigate}
            roomCode={roomCode}
            movie={selectedMovie}
            currentUser={currentUser}
            onOpenCreateModal={(m) => {
              if (m) setSelectedMovie(m);
              setIsCreateModalOpen(true);
            }}
          />
        );
      
      case 'recommendations':
        return (
          <RecommendationsScreen
            onNavigate={navigate}
            onSelectMovie={setSelectedMovie}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        );
      
      case 'my-spaces':
        return (
          <MySpacesScreen
            onNavigate={navigate}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectMovie={setSelectedMovie}
            onJoinRoom={(code) => setRoomCode(code)}
          />
        );
      
      case 'analytics':
        return <AnalyticsScreen onNavigate={navigate} roomCode={roomCode} movie={selectedMovie} />;
      
      case 'profile':
        return (
          <ProfileScreen
            initialTab="overview"
            onNavigate={navigate}
            onSelectMovie={setSelectedMovie}
            currentUser={currentUser}
            onUserUpdated={handleUserUpdated}
          />
        );
      
      case 'settings':
        return (
          <ProfileScreen
            initialTab="settings"
            onNavigate={navigate}
            onSelectMovie={setSelectedMovie}
            currentUser={currentUser}
            onUserUpdated={handleUserUpdated}
          />
        );
      
      case 'ai-expanded':
        return <AICoPilotExpandedScreen onNavigate={navigate} />;
      
      case 'admin-timeline':
        return (
          <ProfileScreen
            initialTab="admin"
            onNavigate={navigate}
            onSelectMovie={setSelectedMovie}
            currentUser={currentUser}
            onUserUpdated={handleUserUpdated}
          />
        );
      
      case 'host-disconnected':
        return <HostDisconnectedScreen onNavigate={navigate} movie={selectedMovie} />;
      
      case 'reconnecting':
        return <ReconnectingScreen onNavigate={navigate} movie={selectedMovie} roomCode={roomCode} />;
      
      default:
        return (
          <HomeScreen
            onNavigate={navigate}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectMovie={setSelectedMovie}
            currentUser={currentUser}
          />
        );
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      {showNavbar && (
        <Navbar
          currentScreen={currentScreen}
          onNavigate={navigate}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          currentUser={currentUser}
        />
      )}

      {/* Main Viewport Content */}
      <main style={{ flex: 1 }}>
        {renderScreen()}
      </main>

      {/* Modal (Can be opened from anywhere) */}
      <CreateSpaceModal
        isOpen={isCreateModalOpen}
        movie={selectedMovie}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleSpaceCreated}
        currentUser={currentUser}
      />
    </div>
  );
}
