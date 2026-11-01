import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, MessageSquare, 
  Send, Users, Radio, AlertCircle, BarChart2, CheckCircle2, ChevronRight, ThumbsUp,
  Crown, Eye, Lock, RefreshCw, Power, LogOut, UserX, X, ShieldAlert
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useFetch } from '../hooks/useFetch';
import { moviesAPI, aiAPI, spacesAPI, timelineAPI, refreshAccessToken } from '../services/api';

function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function WatchRoomScreen({ onNavigate, roomCode, movie, currentUser: propUser, onOpenCreateModal }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(9300); // in seconds
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'chat'
  const [showEndModal, setShowEndModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [spaceEndedNotice, setSpaceEndedNotice] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomHostName, setRoomHostName] = useState('');
  const [roomLocked, setRoomLocked] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatNotice, setChatNotice] = useState('');
  const [roomAccessError, setRoomAccessError] = useState('');
  const [appliedVariationNotice, setAppliedVariationNotice] = useState('');
  const [activeVariation, setActiveVariation] = useState(null);
  const [reactions, setReactions] = useState([]);
  const socketRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  const aiEndRef = useRef(null);
  const videoRef = useRef(null);
  const audioVariationRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const hostHeartbeatRef = useRef(null);
  const latencySampleRef = useRef(null);
  const pendingPingRef = useRef(null);
  const isOriginalStreamDirectRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isMutedRef = useRef(isMuted);
  const [isAILoading, setIsAILoading] = useState(false);

  isPlayingRef.current = isPlaying;
  isMutedRef.current = isMuted;

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const activeUser = propUser || storedUser;
  const currentUserName = activeUser.name || 'Viewer';

  // Fetch space data to know room host & participants (if in a watch room)
  const isSoloWatch = !roomCode || roomCode === 'solo' || roomCode === 'SOLO' || roomCode === 'ABC123';
  const { data: spaceData } = useFetch(() => (!isSoloWatch && roomCode) ? spacesAPI.getByCode(roomCode) : null, [roomCode, isSoloWatch]);
  const space = spaceData?.space;

  // Initialize participants from space API if not yet received via socket
  useEffect(() => {
    if (space?.participants && participants.length === 0) {
      setParticipants(space.participants);
    }
  }, [space, participants.length]);
  useEffect(() => {
    if (space?.host?.name) setRoomHostName(space.host.name);
    if (typeof space?.isLocked === 'boolean') setRoomLocked(space.isLocked);
  }, [space?.host?.name, space?.isLocked]);
  const spaceHostName = roomHostName || space?.host?.name || 'Host';

  // Check if user is Host:
  // In Solo Watch mode, or if user is an Admin, they have 100% control over playback.
  // Host detection: In multiplayer space, isHost is true ONLY if activeUser created this space or is designated Host.
  // Viewers who join the room are strictly in Viewer Mode (PRD Epic 1).
  const myParticipant = participants.find((participant) => (
    ((participant.userId || participant.id) && (activeUser?._id || activeUser?.id) &&
      String(participant.userId || participant.id) === String(activeUser._id || activeUser.id))
  ));
  const isHostComputed = Boolean(
    isSoloWatch ||
    myParticipant?.role === 'Host'
  );

  const isHost = isHostComputed;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  // Viewer warning toast state
  const [viewerNotice, setViewerNotice] = useState(null);
  const showViewerWarning = () => {
    setViewerNotice(`Playback is synchronized by Host (${spaceHostName}). Only the Host can control playback.`);
    setTimeout(() => setViewerNotice(null), 3500);
  };

  // ── REAL-TIME SOCKET.IO CONNECTION (ONLY FOR WATCH SPACES) ───────────────────
  useEffect(() => {
    if (isSoloWatch || !roomCode) return;
    const token = localStorage.getItem('token');
    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socket.on('room.sync.pong', ({ clientSentAt } = {}) => {
      if (Number.isFinite(clientSentAt) && clientSentAt === pendingPingRef.current) {
        latencySampleRef.current = Math.max(0, performance.now() - clientSentAt);
      }
    });

    socketRef.current = socket;
    setConnectionStatus('connecting');
    let refreshingSocketToken = false;

    const emitJoin = () => {
      socket.emit('join-room', {
        roomCode,
        user: {
          name: currentUserName,
          avatar: activeUser?.avatar,
          role: isHost ? 'Host' : 'Viewer'
        }
      });
    };

    if (socket.connected) {
      emitJoin();
      setConnectionStatus('connected');
    }
    socket.on('connect', () => {
      refreshingSocketToken = false;
      setConnectionStatus('connected');
      emitJoin();
    });
    socket.on('disconnect', () => {
      setConnectionStatus('reconnecting');
      setTypingUsers([]);
    });
    socket.on('connect_error', async () => {
      setConnectionStatus('reconnecting');
      if (refreshingSocketToken) return;
      refreshingSocketToken = true;
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken && socketRef.current === socket) {
        socket.auth = { token: refreshedToken };
        socket.disconnect();
        socket.connect();
      } else {
        refreshingSocketToken = false;
        if (!localStorage.getItem('token')) {
          socket.disconnect();
          setConnectionStatus('disconnected');
        }
      }
    });
    socket.io.on('reconnect_failed', () => setConnectionStatus('disconnected'));
    socket.on('room-join-error', ({ message } = {}) => {
      setConnectionStatus('connected');
      setRoomAccessError(message || 'Unable to join this Watch Space.');
    });

    // Periodic presence ping every 10 seconds to keep isOnline state fresh
    const presenceTimer = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence-ping', { roomCode, userName: currentUserName });
      }
    }, 10000);
    const syncPingTimer = setInterval(() => {
      if (socket.connected) {
        const clientSentAt = performance.now();
        pendingPingRef.current = clientSentAt;
        socket.emit('room.sync.ping', { clientSentAt });
      }
    }, 5000);
    const syncMeasurementTimer = setInterval(() => {
      const heartbeat = hostHeartbeatRef.current;
      if (!socket.connected || !heartbeat || isHostRef.current || latencySampleRef.current === null) return;
      const position = ytPlayerRef.current?.getCurrentTime
        ? ytPlayerRef.current.getCurrentTime()
        : videoRef.current?.currentTime;
      if (typeof position !== 'number' || !Number.isFinite(position)) return;
      const elapsedSeconds = heartbeat.isPlaying
        ? Math.max(0, (performance.now() - heartbeat.receivedAt) / 1000)
        : 0;
      socket.emit('room.sync.measurement', {
        driftMs: (position - (heartbeat.position + elapsedSeconds)) * 1000,
        latencyMs: latencySampleRef.current
      });
    }, 2000);

    // Initial state sent from server when joining
    socket.on('initial-sync-state', (state) => {
      setRoomAccessError('');
      if (state.playbackState) {
        const hostPlaying = Boolean(state.playbackState.isPlaying);
        setIsPlaying(hostPlaying);
        if (typeof state.playbackState.currentTime === 'number') {
          setCurrentTime(state.playbackState.currentTime);
          if (ytPlayerRef.current?.seekTo) {
            try {
              ytPlayerRef.current.seekTo(state.playbackState.currentTime, true);
              if (hostPlaying) {
                ytPlayerRef.current.playVideo();
              } else {
                ytPlayerRef.current.pauseVideo();
              }
            } catch (e) {}
          } else if (videoRef.current) {
            videoRef.current.currentTime = state.playbackState.currentTime;
            if (hostPlaying) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
          }
        }
      }
      if (state.host?.name) setRoomHostName(state.host.name);
      if (typeof state.isLocked === 'boolean') setRoomLocked(state.isLocked);
      if (Array.isArray(state.participants) && state.participants.length > 0) {
        setParticipants(state.participants);
      }
      if (Array.isArray(state.chatMessages) && state.chatMessages.length > 0) {
        setChatMessages([
          { id: 'sys-welcome', user: 'System', text: `Welcome to Room ${roomCode}! Stream synchronized.`, time: '00:00' },
          ...state.chatMessages.map((m, idx) => ({
            id: m._id || idx,
            user: m.senderName || 'Participant',
            text: m.content,
            time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '52:10'
          }))
        ]);
      }
      if (state.activeVariationVote && state.activeVariationVote.active) {
        setActiveVote(state.activeVariationVote);
        if (state.activeVariationVote.votes) {
          setVoteTallies(state.activeVariationVote.votes);
        }
      }
      if (state.currentVariation?.option) {
        const variation = state.currentVariation;
        const canApplyVideo = Boolean(variation.videoUrl);
        const supportsExternalTracks = Boolean(variation.videoUrl) || isOriginalStreamDirectRef.current;
        const canApplyAudio = Boolean(variation.audioUrl) && supportsExternalTracks;
        const canApplySubtitle = Boolean(variation.subtitleUrl) && supportsExternalTracks;
        setAppliedVariationNotice(canApplyVideo || canApplyAudio || canApplySubtitle
          ? variation.option
          : `Selected variation: ${variation.option} (no compatible media asset is configured)`);
        setActiveVariation(canApplyVideo || canApplyAudio || canApplySubtitle ? variation : null);
      }
    });

    // Real-time participants update
    socket.on('participants-updated', (updatedList) => {
      if (Array.isArray(updatedList)) {
        setParticipants(updatedList);
      }
    });
    socket.on('room-lock-updated', ({ isLocked } = {}) => {
      setRoomLocked(Boolean(isLocked));
    });
    socket.on('host-transferred', ({ newHostName } = {}) => {
      if (newHostName) setRoomHostName(newHostName);
    });
    socket.on('typing-update', ({ participantName, isTyping } = {}) => {
      if (!participantName) return;
      setTypingUsers(previous => (
        isTyping
          ? [...new Set([...previous, participantName])]
          : previous.filter(name => name !== participantName)
      ));
    });
    socket.on('new-reaction', (reaction) => {
      if (!reaction?.emoji) return;
      setReactions(previous => [...previous, reaction]);
      setTimeout(() => {
        setReactions(previous => previous.filter(item => item.id !== reaction.id));
      }, 2500);
    });
    socket.on('chat-rejected', ({ message } = {}) => {
      setChatNotice(message || 'Your message could not be sent.');
    });
    socket.on('participant-muted', ({ targetName, isMuted } = {}) => {
      if (targetName?.toLowerCase() === currentUserName.toLowerCase()) {
        setChatNotice(isMuted ? 'The Host muted your chat.' : 'The Host unmuted your chat.');
      }
    });

    // When this viewer is removed by the host
    socket.on('removed-from-room', (data) => {
      setSpaceEndedNotice(data?.message || 'You have been removed from this Watch Space by the Host.');
      setTimeout(() => {
        onNavigate('home');
      }, 3000);
    });

    // Real-time Chat message listener
    socket.on('new-chat-message', (msg) => {
      if (!msg || !msg.content) return;
      setChatMessages(prev => {
        // Prevent duplicate if already received (by ID or exact sender + content within 1.5s)
        const isDuplicate = prev.some(
          m => (msg._id && m.id === msg._id) ||
               (m.text === msg.content && m.user === msg.senderName && Math.abs(Date.now() - (m.createdAt || 0)) < 1500)
        );
        if (isDuplicate) return prev;
        return [
          ...prev,
          {
            id: msg._id || Date.now() + Math.random(),
            user: msg.senderName || 'Participant',
            text: msg.content,
            time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatTime(currentTime),
            createdAt: Date.now()
          }
        ];
      });
    });

    // Synchronized playback updates from Host
    socket.on('sync-play', ({ position }) => {
      setIsPlaying(true);
      if (typeof position === 'number') {
        setCurrentTime(position);
        if (ytPlayerRef.current?.seekTo) {
          try {
            ytPlayerRef.current.seekTo(position, true);
            ytPlayerRef.current.playVideo();
          } catch (e) {}
        } else if (videoRef.current) {
          videoRef.current.currentTime = position;
          videoRef.current.playbackRate = 1;
          videoRef.current.play().catch(() => {});
        }
      }
    });

    socket.on('sync-pause', ({ position }) => {
      setIsPlaying(false);
      if (typeof position === 'number') {
        setCurrentTime(position);
        if (ytPlayerRef.current?.pauseVideo) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch (e) {}
        } else if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.playbackRate = 1;
        }
      }
    });

    socket.on('sync-seek', ({ position }) => {
      if (typeof position === 'number') {
        setCurrentTime(position);
        if (ytPlayerRef.current?.seekTo) {
          try {
            ytPlayerRef.current.seekTo(position, true);
          } catch (e) {}
        } else if (videoRef.current) {
          videoRef.current.currentTime = position;
          videoRef.current.playbackRate = 1;
        }
      }
    });

    socket.on('sync-heartbeat', ({ position, isPlaying: hostPlaying }) => {
      if (!isHost) {
        if (typeof position === 'number' && typeof hostPlaying === 'boolean') {
          hostHeartbeatRef.current = {
            position,
            isPlaying: hostPlaying,
            receivedAt: performance.now()
          };
        }
        if (typeof position === 'number') {
          const currentPosition = ytPlayerRef.current?.getCurrentTime
            ? ytPlayerRef.current.getCurrentTime()
            : videoRef.current?.currentTime;
          if (typeof currentPosition === 'number') {
            const drift = position - currentPosition;
            if (Math.abs(drift) > 2 || (ytPlayerRef.current?.seekTo && Math.abs(drift) > 0.25)) {
              if (ytPlayerRef.current?.seekTo) {
                try { ytPlayerRef.current.seekTo(position, true); } catch (e) {}
              } else if (videoRef.current) {
                videoRef.current.currentTime = position;
                videoRef.current.playbackRate = 1;
              }
            } else if (videoRef.current) {
              videoRef.current.playbackRate = Math.abs(drift) <= 0.05 ? 1 : drift > 0 ? 1.05 : 0.95;
            }
            setCurrentTime(currentPosition);
          }
        }
        if (typeof hostPlaying === 'boolean') {
          setIsPlaying(hostPlaying);
        }
      }
    });

    socket.on('space-ended-by-host', (data) => {
      if (!isHost) {
        setSpaceEndedNotice(data?.message || 'The Host has concluded this Watch Space.');
        setTimeout(() => {
          onNavigate('home');
        }, 12000);
      }
    });

    // Real-Time Variation Voting Listeners
    socket.on('room.variation.voteOpen', (data) => {
      const payload = data?.payload || data;
      setActiveVote(payload || true);
      setSelectedVoteOption(null);
      if (payload?.votes) {
        setVoteTallies(payload.votes);
      } else {
        setVoteTallies({});
      }
    });

    socket.on('room.variation.voteClose', ({ winningOption } = {}) => {
      setActiveVote(null);
      setSelectedVoteOption(null);
      if (winningOption) setAppliedVariationNotice(winningOption.label || winningOption);
    });

    socket.on('variation-votes-updated', (data) => {
      if (data?.votes) {
        setVoteTallies(data.votes);
      }
    });
    socket.on('room.variation.applied', (variation = {}) => {
      if (variation.option) {
        const supportedVideo = Boolean(variation.videoUrl);
        const supportsExternalTracks = supportedVideo || isOriginalStreamDirectRef.current;
        const supportedAudio = Boolean(variation.audioUrl) && supportsExternalTracks;
        const supportedSubtitle = Boolean(variation.subtitleUrl) && supportsExternalTracks;
        const canApplyAsset = supportedVideo || supportedAudio || supportedSubtitle;
        setAppliedVariationNotice(canApplyAsset
          ? variation.option
          : `Selected variation: ${variation.option} (no compatible media asset is configured)`);
        setActiveVariation(canApplyAsset ? {
          option: variation.option,
          optionId: variation.optionId,
          videoUrl: variation.videoUrl,
          audioUrl: supportedAudio ? variation.audioUrl : '',
          subtitleUrl: variation.subtitleUrl,
          language: variation.language
        } : null);
      }
    });
    socket.on('vote-rejected', ({ message } = {}) => {
      setSelectedVoteOption(null);
      setChatNotice(message || 'Your vote could not be recorded.');
      setTimeout(() => setChatNotice(''), 3500);
    });

    return () => {
      clearInterval(presenceTimer);
      clearInterval(syncPingTimer);
      clearInterval(syncMeasurementTimer);
      hostHeartbeatRef.current = null;
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      socket.io.off('reconnect_failed');
      socket.disconnect();
    };
  }, [roomCode, currentUserName, isHost, onNavigate]);

  // Compute active online participants and live count dynamically
  const activeParticipantsList = participants.length > 0
    ? participants
    : (space?.participants || [{ name: currentUserName, role: isHost ? 'Host' : 'Viewer', isOnline: true }]);
  const isChatMuted = Boolean(myParticipant?.isMuted);

  const onlineParticipants = activeParticipantsList.filter(p => p.isOnline !== false);
  const liveCount = Math.max(onlineParticipants.length, 1);

  // Host action: remove a participant
  const handleRemoveParticipant = (targetName) => {
    if (!isHost || !targetName) return;
    if (window.confirm(`Are you sure you want to remove "${targetName}" from this Watch Space?`)) {
      if (socketRef.current) {
        socketRef.current.emit('host-remove-participant', { targetName });
      }
    }
  };

  const handleToggleParticipantMute = (participant) => {
    if (!isHost || !participant?.name || !socketRef.current?.connected) return;
    socketRef.current.emit('host-mute-participant', {
      targetName: participant.name,
      isMuted: !participant.isMuted
    });
  };

  const handleTransferHost = (participant) => {
    if (!isHost || !participant?.name || !socketRef.current?.connected) return;
    if (window.confirm(`Transfer Host control to "${participant.name}"?`)) {
      socketRef.current.emit('host-transfer', { newHostName: participant.name });
    }
  };

  const handleToggleRoomLock = () => {
    if (!isHost || !socketRef.current?.connected) return;
    socketRef.current.emit('host-set-room-lock', { isLocked: !roomLocked });
  };

  const handleChatTyping = (value) => {
    if (!socketRef.current?.connected || isChatMuted) return;
    socketRef.current.emit('typing-update', { isTyping: Boolean(value.trim()) });
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (value.trim()) {
      typingStopTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('typing-update', { isTyping: false });
      }, 1500);
    }
  };

  const handleSendReaction = (emoji) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-reaction', { emoji });
    }
  };

  const handleConfirmEndSpace = async () => {
    setShowEndModal(false);
    if (socketRef.current) {
      socketRef.current.emit('host-end-space');
    }
    try {
      await spacesAPI.delete(roomCode);
    } catch (err) {
      console.warn('Space deletion error:', err.message);
    }
    onNavigate('analytics');
  };

  // If movie prop missing, fetch a default list
  const { data: movies = [], loading: moviesLoading } = useFetch(() => moviesAPI.getAll());
  const moviesList = Array.isArray(movies) ? movies : (movies?.movies || []);
  const currentMovie = movie || space?.movie || moviesList.find(m => m.slug === space?.movie?.slug || m.title === space?.movie?.title) || moviesList[0] || {
    title: 'Interstellar',
    slug: 'interstellar',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    videoAssetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  };

  const rawVideoUrl = currentMovie?.videoAssetUrl || '';
  const originalYouTubeId = extractYouTubeId(rawVideoUrl);
  isOriginalStreamDirectRef.current = Boolean(!originalYouTubeId && (
    rawVideoUrl.startsWith('http') ||
    rawVideoUrl.startsWith('/') ||
    rawVideoUrl.endsWith('.mp4') ||
    rawVideoUrl.endsWith('.webm') ||
    rawVideoUrl.endsWith('.mkv') ||
    rawVideoUrl.includes('google')
  ));
  const selectedVideoUrl = activeVariation?.videoUrl || rawVideoUrl;
  const youtubeId = activeVariation?.videoUrl ? null : extractYouTubeId(rawVideoUrl);
  const isDirectVideo = !youtubeId && Boolean(
    selectedVideoUrl.startsWith('http') ||
    selectedVideoUrl.startsWith('/') ||
    selectedVideoUrl.endsWith('.mp4') ||
    selectedVideoUrl.endsWith('.webm') ||
    selectedVideoUrl.endsWith('.mkv') ||
    selectedVideoUrl.includes('google')
  );

  useEffect(() => {
    const audio = audioVariationRef.current;
    if (!audio) return;
    if (!activeVariation?.audioUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    if (Math.abs(audio.currentTime - currentTime) > 1.5) {
      audio.currentTime = currentTime;
    }
    if (isPlaying) {
      audio.play().catch(() => {
        setAppliedVariationNotice('The browser blocked the selected audio asset from playing.');
        setActiveVariation(previous => previous ? { ...previous, audioUrl: '' } : null);
      });
    }
    else audio.pause();
  }, [activeVariation?.audioUrl, currentTime, isPlaying]);

  // ── OFFICIAL YOUTUBE IFRAME PLAYER API SYNCHRONIZATION ───────────────────
  // Binds directly to YouTube player events so clicking the center Play button
  // immediately starts the scene clock, scrubber tracking, and trivia triggers.
  useEffect(() => {
    if (!youtubeId) return;

    let disposed = false;
    let retryTimeout = null;
    let pollInterval = null;
    let player = null;
    const container = youtubeContainerRef.current;

    const initYT = () => {
      if (disposed || !container) return;
      if (!window.YT || !window.YT.Player) {
        retryTimeout = setTimeout(initYT, 150);
        return;
      }

      const playerElement = document.createElement('div');
      container.replaceChildren(playerElement);

      try {
        player = new window.YT.Player(playerElement, {
          width: '100%',
          height: '100%',
          videoId: youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            fs: 0,
            iv_load_policy: 3,
            disablekb: 1,
            playsinline: 1
          },
          events: {
            onReady: (event) => {
              if (disposed) {
                event.target.destroy();
                return;
              }

              ytPlayerRef.current = player;
              try {
                const dur = Math.floor(event.target.getDuration());
                if (dur > 0) setTotalTime(dur);
                if (isMutedRef.current) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }
                if (isPlayingRef.current) {
                  event.target.playVideo();
                } else {
                  // Ensure player starts paused until Host starts playback
                  event.target.pauseVideo();
                }
              } catch (e) {}
            },
            onStateChange: (event) => {
              // YT.PlayerState: 1 = playing, 2 = paused, 0 = ended, 3 = buffering
              if (event.data === 1) {
                // If viewer is in a watch space and host has not started playing, prevent unauthorized playback
                if (!isSoloWatch && !isHostRef.current && !isPlayingRef.current) {
                  try { event.target.pauseVideo(); } catch (e) {}
                  return;
                }
                setIsPlaying(true);
              } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
              }
            }
          }
        });
      } catch (err) {
        console.warn('YT.Player init error:', err);
      }
    };

    initYT();

    // High-precision sync loop: continuously reads exact playback seconds from YouTube
    pollInterval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state === 1) { // Video is actively playing!
            const exactSec = ytPlayerRef.current.getCurrentTime();
            setCurrentTime(Math.floor(exactSec));
            const d = Math.floor(ytPlayerRef.current.getDuration());
            if (d > 0) setTotalTime(d);
            if (isHostRef.current && socketRef.current) {
              socketRef.current.emit('playback-heartbeat', {
                position: exactSec,
                isPlaying: true
              });
            }
          }
        } catch (e) {}
      }
    }, 350);

    return () => {
      disposed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (player?.destroy) {
        try { player.destroy(); } catch (e) {}
      }
      if (ytPlayerRef.current === player) {
        ytPlayerRef.current = null;
      }
      container?.replaceChildren();
    };
  }, [youtubeId]);

  // Direct video host heartbeat (only when non-YouTube stream is playing)
  useEffect(() => {
    if (youtubeId || !isHost || !isPlaying) return;
    const timer = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const sec = videoRef.current.currentTime;
        setCurrentTime(Math.floor(sec));
        if (socketRef.current) {
          socketRef.current.emit('playback-heartbeat', {
            position: sec,
            isPlaying: true
          });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, isPlaying, youtubeId]);

  const handleTogglePlay = () => {
    if (!isHost) {
      showViewerWarning();
      return;
    }
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    if (youtubeId && ytPlayerRef.current) {
      try {
        if (nextPlay) {
          if (typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          }
        } else {
          if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        }
      } catch (e) {
        console.warn('YouTube play toggle error:', e);
      }
    } else if (videoRef.current && !youtubeId) {
      if (nextPlay) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    if (socketRef.current) {
      socketRef.current.emit('room.playback.update', {
        state: nextPlay ? 'play' : 'pause',
        positionSeconds: currentTime,
        issuedBy: currentUserName
      });
    }
  };

  const handleSeek = (newTime) => {
    if (!isHost) {
      showViewerWarning();
      return;
    }
    setCurrentTime(newTime);
    if (youtubeId && ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.seekTo === 'function') {
          ytPlayerRef.current.seekTo(newTime, true);
        }
      } catch (e) {
        console.warn('YouTube seek error:', e);
      }
    } else if (videoRef.current && !youtubeId) {
      videoRef.current.currentTime = newTime;
    }
    if (socketRef.current) {
      socketRef.current.emit('room.playback.update', {
        state: 'seek',
        positionSeconds: newTime,
        issuedBy: currentUserName
      });
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (youtubeId && ytPlayerRef.current) {
      try {
        if (nextMute) {
          if (typeof ytPlayerRef.current.mute === 'function') ytPlayerRef.current.mute();
        } else {
          if (typeof ytPlayerRef.current.unMute === 'function') ytPlayerRef.current.unMute();
        }
      } catch (e) {
        console.warn('YouTube mute error:', e);
      }
    } else if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const handleToggleFullscreen = () => {
    const playerPane = document.querySelector('.watchroom-player-pane') || document.querySelector('.watchroom-viewport');
    if (!document.fullscreenElement) {
      if (playerPane?.requestFullscreen) {
        playerPane.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Sync video element with state
  useEffect(() => {
    if (!videoRef.current || youtubeId) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, youtubeId]);

  useEffect(() => {
    if (!videoRef.current || youtubeId) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 2) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime, youtubeId]);

  useEffect(() => {
    if (!videoRef.current || youtubeId) return;
    videoRef.current.muted = isMuted;
  }, [isMuted, youtubeId]);
  
  // Interactive AI Co-Pilot state
  const [aiMessages, setAiMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'AI Co-Pilot is online and synchronized with this scene. Ask any questions about characters, lore, or plot trivia!',
      source: 'Scene 04 - Lorebase',
      timestamp: '00:52:34'
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');

  // Interactive Live Chat state
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'System', text: `Welcome to Room ${roomCode}! Stream synchronized.`, time: '52:10' }
  ]);
  const [inputChat, setInputChat] = useState('');

  // Scene Voting Modal / Toast state
  const [activeVote, setActiveVote] = useState(null);
  const [selectedVoteOption, setSelectedVoteOption] = useState(null);
  const [voteTallies, setVoteTallies] = useState({});
  const [voteSecondsRemaining, setVoteSecondsRemaining] = useState(30);

  // Active Trivia Popup state & dynamic timeline markers from database
  const [activeTrivia, setActiveTrivia] = useState(null);
  const [movieTimelineEvents, setMovieTimelineEvents] = useState([]);
  const triggeredMarkerIdsRef = useRef(new Set());

  // Load real indexed timeline events for this movie from MongoDB
  const fetchTimelineEvents = React.useCallback(() => {
    const movieSlug = currentMovie?.slug || currentMovie?.id || space?.movie?.slug || 'interstellar';
    timelineAPI.getByMovie(movieSlug)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.events || []);
        setMovieTimelineEvents(list);
        if (list.length > 0 && youtubeId) {
          const maxSec = Math.max(...list.map(e => e.timestampSeconds || 0));
          if (maxSec > 0) {
            setTotalTime(prev => Math.max(prev, maxSec + 12));
          }
        }
      })
      .catch(err => console.warn('Failed to load timeline events for watch room:', err));
  }, [currentMovie?.slug, currentMovie?.id, space?.movie?.slug, youtubeId]);

  useEffect(() => {
    fetchTimelineEvents();
  }, [fetchTimelineEvents]);

  // Window focus listener: dynamically refresh markers if added or modified in another tab
  useEffect(() => {
    const handleFocus = () => fetchTimelineEvents();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchTimelineEvents]);

  // Real-time socket event when markers are created, edited or deleted in Admin Panel
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handleTimelineUpdated = (data) => {
      const activeSlug = currentMovie?.slug || currentMovie?.id || space?.movie?.slug || 'interstellar';
      if (!data?.movieId || data.movieId === activeSlug) {
        fetchTimelineEvents();
      }
    };
    socket.on('timeline-events-updated', handleTimelineUpdated);
    return () => socket.off('timeline-events-updated', handleTimelineUpdated);
  }, [fetchTimelineEvents, currentMovie?.slug, currentMovie?.id, space?.movie?.slug]);

  // 30-Second countdown and auto-close for Group Variation Vote
  useEffect(() => {
    if (!activeVote) {
      setVoteSecondsRemaining(30);
      return;
    }
    setVoteSecondsRemaining(30);
    const interval = setInterval(() => {
      setVoteSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveVote(null);
          setSelectedVoteOption(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeVote?._id, activeVote?.variationId, activeVote?.question, Boolean(activeVote)]);

  // Auto-trigger trivia overlays and variation points when playback reaches matching markers
  useEffect(() => {
    if (movieTimelineEvents.length === 0) return;

    // Remove triggered markers that are now far from playback head (enables re-trigger if scrubbing back)
    triggeredMarkerIdsRef.current.forEach(id => {
      const ev = movieTimelineEvents.find(e => String(e._id || e.sourceId || e.timestampSeconds) === id);
      if (ev && Math.abs(ev.timestampSeconds - currentTime) > 4) {
        triggeredMarkerIdsRef.current.delete(id);
      }
    });

    // 1. Check for Trivia / Character / Glossary overlay (tolerance: within 1s)
    const matchedEvent = movieTimelineEvents.find(ev => 
      Math.abs(ev.timestampSeconds - currentTime) <= 1 && 
      (ev.type === 'Trivia' || ev.type === 'Character' || ev.type === 'Glossary')
    );

    if (matchedEvent) {
      const trvId = String(matchedEvent._id || matchedEvent.sourceId || `trv-${matchedEvent.timestampSeconds}`);
      if (!triggeredMarkerIdsRef.current.has(trvId)) {
        triggeredMarkerIdsRef.current.add(trvId);
        setActiveTrivia(matchedEvent);
        if (isHost && socketRef.current) {
          socketRef.current.emit('trigger-trivia', {
            eventId: matchedEvent.sourceId || matchedEvent._id,
            text: matchedEvent.content,
            tsSeconds: matchedEvent.timestampSeconds
          });
        }
        // Auto-dismiss trivia after 8 seconds
        setTimeout(() => {
          setActiveTrivia(prev => (prev?._id === matchedEvent._id || prev?.sourceId === matchedEvent.sourceId || prev?.content === matchedEvent.content) ? null : prev);
        }, 8000);
      }
    }

    // 2. Check for Variation Point (Voting) overlay (tolerance: within 1s)
    const matchedVariation = movieTimelineEvents.find(ev => 
      Math.abs(ev.timestampSeconds - currentTime) <= 1 &&
      ev.type === 'Variation Point' &&
      Array.isArray(ev.metadata?.variationOptions) &&
      ev.metadata.variationOptions.length >= 2
    );
    if (matchedVariation && !activeVote && isHost) {
      const varId = String(matchedVariation._id || matchedVariation.sourceId || `var-${matchedVariation.timestampSeconds}`);
      if (!triggeredMarkerIdsRef.current.has(varId)) {
        triggeredMarkerIdsRef.current.add(varId);
        setSelectedVoteOption(null);
        if (socketRef.current) {
          socketRef.current.emit('room.variation.voteOpen', {
            variationId: matchedVariation.sourceId || matchedVariation._id || 'var-commentary-01',
            question: matchedVariation.content,
            durationSeconds: 30
          });
        }
      }
    }
  }, [currentTime, movieTimelineEvents, activeVote, isHost]);

  // Open trivia on demand via the Scene Trivia button
  const handleOpenSceneTrivia = () => {
    if (activeTrivia) {
      setActiveTrivia(null);
      return;
    }
    // Find closest event up to current time, or any event in the movie
    const pastEvents = movieTimelineEvents.filter(ev => ev.timestampSeconds <= currentTime);
    const selected = pastEvents.length > 0 
      ? pastEvents[pastEvents.length - 1] 
      : (movieTimelineEvents[0] || {
          type: 'Scene Trivia',
          timeFormatted: formatTime(currentTime),
          content: 'No custom timeline markers have been authored for this scene yet. You can import or add markers in the Admin Panel!'
        });
    setActiveTrivia(selected);
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle asking AI
  const handleAskAI = async (questionText) => {
    const q = (questionText || inputQuestion || '').trim();
    if (!q) return;

    const userMsg = { id: Date.now(), sender: 'user', text: q };
    setAiMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setIsAILoading(true);

    const movieSlug = currentMovie?.slug || currentMovie?.id || (currentMovie?.title ? currentMovie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'interstellar');

    try {
      const res = await aiAPI.ask({
        movieId: movieSlug,
        currentTimestamp: currentTime,
        question: q,
        roomCode: isSoloWatch ? undefined : roomCode
      });

      const aiData = res?.data || res;
      const answer = aiData?.answer || aiData?.text || res?.answer || res?.text || 'No lore record available for this timestamp.';
      const source = aiData?.source || res?.source || (aiData?.sourceEvents?.length ? `Source: ${aiData.sourceEvents[0]}` : (res?.sourceEvents?.length ? `Source: ${res.sourceEvents[0]}` : 'Timeline Lorebase'));

      const aiReply = {
        id: Date.now() + 1,
        sender: 'ai',
        text: answer,
        source: source,
        timestamp: formatTime(currentTime)
      };
      setAiMessages(prev => [...prev, aiReply]);
    } catch (err) {
      console.warn('AI query error:', err);
      setAiMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'AI Co-Pilot is currently offline. Please try again shortly.',
        source: '',
        timestamp: formatTime(currentTime)
      }]);
    } finally {
      setIsAILoading(false);
    }
  };

  // Auto-scroll chat & AI to bottom when messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'ai') {
      aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, aiMessages, activeTab, isAILoading]);

  // Handle sending chat message
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputChat.trim()) return;
    if (isChatMuted) {
      setChatNotice('Your chat has been muted by the Host.');
      return;
    }
    const cleanText = inputChat.trim();
    setInputChat('');
    handleChatTyping('');

    if (socketRef.current && socketRef.current.connected) {
      // Emit single event to server; server broadcasts back new-chat-message to all clients
      socketRef.current.emit('send-chat-message', {
        content: cleanText,
        senderName: currentUserName,
        senderAvatar: activeUser?.avatar
      });
    } else {
      // Fallback if running offline without active socket
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          user: currentUserName,
          text: cleanText,
          time: formatTime(currentTime),
          createdAt: Date.now()
        }
      ]);
    }
  };

  return (
    <div className="watchroom-root">
      {/* Top Watch Room Nav Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        background: 'rgba(13, 20, 36, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            onClick={() => onNavigate('home')}
            style={{ fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}
            title="Return to Home Dashboard"
          >
            WatchSpace <span style={{ color: '#a855f7' }}>AI</span>
          </div>
          <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              onClick={() => onNavigate('movie-details')}
              style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              title="View Movie Details"
            >
              {currentMovie.title}
            </span>
            {isSoloWatch ? (
              <>
                <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Play size={12} fill="#c084fc" /> Solo Watch
                </span>
                <span className="badge badge-pill" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                  1080p Full HD
                </span>
              </>
            ) : (
              <>
                <span className="badge badge-pill" style={{ fontFamily: 'var(--font-mono)' }}>
                  Room: {roomCode}
                </span>
                {isHost ? (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(255, 42, 84, 0.15)',
                      color: '#ff2a54',
                      border: '1px solid rgba(255, 42, 84, 0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Crown size={12} /> Host Control
                  </span>
                ) : (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Eye size={12} /> Viewer Mode
                  </span>
                )}
                {/* Room Live Stream Status Indicator */}
                <span
                  className="badge badge-live"
                  style={{
                    background: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                    color: connectionStatus === 'connected' ? '#4ade80' : '#fbbf24',
                    border: `1px solid ${connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px'
                  }}
                  title={`Room connection: ${connectionStatus}`}
                >
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: connectionStatus === 'connected' ? '#22c55e' : '#f59e0b'
                  }} />
                  <span>{connectionStatus === 'connected' ? 'CONNECTED' : connectionStatus.toUpperCase()}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSoloWatch ? (
            <>
              {onOpenCreateModal && (
                <button
                  onClick={() => onOpenCreateModal(currentMovie)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Create a synchronized party for this movie"
                >
                  <Users size={14} /> Invite Friends (Create Space)
                </button>
              )}
              <button
                onClick={() => onNavigate('home')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Exit solo player and return to home"
              >
                <LogOut size={14} /> Exit Player
              </button>
            </>
          ) : (
            <>
              {/* Unified Participants Button for both Host & Viewer */}
              <button
                onClick={() => setShowParticipantsModal(true)}
                className="btn btn-secondary btn-sm"
                title={isHost ? "Manage Room Participants" : "View Room Participants"}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={14} /> Participants ({liveCount})
              </button>

              {isHost ? (
                <button
                  onClick={() => setShowEndModal(true)}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                  }}
                  title="End Watch Space session for all participants"
                >
                  <Power size={14} /> End Watch Space
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('home')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Leave this watch space"
                >
                  <LogOut size={14} /> Leave Room
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {roomAccessError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '76px',
            right: '20px',
            zIndex: 1200,
            maxWidth: 'min(420px, calc(100vw - 40px))',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#2a1720',
            border: '1px solid rgba(239,68,68,0.5)',
            color: '#fecaca',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{roomAccessError}</span>
            <button
              type="button"
              onClick={() => setRoomAccessError('')}
              aria-label="Dismiss room access message"
              style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Left Player (72%) + Right Sidebar (28%) */}
      <div className="watchroom-layout">
        {/* Left: Video Player & Controls */}
        <div className="watchroom-player-pane">
          {/* Main Video Viewport */}
          <div className="watchroom-viewport">
            {/* 16:9 Aspect-Ratio container strictly eliminates letterboxing */}
            <div className="watchroom-video-aspect">
              {/* 1. Embedded YouTube Player (Controlled via YouTube IFrame API) */}
              {youtubeId ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    ref={youtubeContainerRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              ) : isDirectVideo ? (
                /* 2. Real HTML5 Video Player (Local movie file or direct MP4/WebM URL) */
                <video
                  ref={videoRef}
                  src={selectedVideoUrl}
                  autoPlay={isPlaying}
                  muted={isMuted || Boolean(activeVariation?.audioUrl)}
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => {
                    if (audioVariationRef.current && Math.abs(audioVariationRef.current.currentTime - e.target.currentTime) > 0.75) {
                      audioVariationRef.current.currentTime = e.target.currentTime;
                    }
                    if (isHost && !e.target.paused) {
                      setCurrentTime(Math.floor(e.target.currentTime));
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    if (e.target.duration && !isNaN(e.target.duration)) {
                      setTotalTime(Math.floor(e.target.duration));
                    }
                    if (activeVariation?.videoUrl) {
                      e.target.currentTime = currentTime;
                      if (isPlaying) e.target.play().catch(() => {});
                    }
                  }}
                  onError={() => {
                    if (activeVariation?.videoUrl) {
                      setAppliedVariationNotice('The selected video asset could not be loaded; restored the original stream.');
                      setActiveVariation(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1
                  }}
                >
                  {activeVariation?.subtitleUrl && (
                    <track
                      kind="subtitles"
                      src={activeVariation.subtitleUrl}
                      srcLang={activeVariation.language || 'en'}
                      label={activeVariation.language || 'Selected variation'}
                      default
                      onLoad={(event) => {
                        event.currentTarget.track.mode = 'showing';
                      }}
                    />
                  )}
                </video>
              ) : (
                /* 3. Backdrop fallback when no video file is provided */
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%), url("${currentMovie.backdrop || currentMovie.poster}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 1
                }} />
              )}
              {isDirectVideo && activeVariation?.audioUrl && (
                <audio
                  ref={audioVariationRef}
                  src={activeVariation.audioUrl}
                  muted={isMuted}
                  preload="auto"
                  onError={() => {
                    setAppliedVariationNotice('The selected audio asset could not be loaded.');
                    setActiveVariation(previous => previous ? { ...previous, audioUrl: '' } : null);
                  }}
                  style={{ display: 'none' }}
                />
              )}

              {/* Click anywhere on video to toggle Play/Pause */}
              <div
                onClick={() => {
                  handleTogglePlay();
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 3,
                  cursor: 'pointer'
                }}
                title={isPlaying ? 'Click to Pause' : 'Click to Play'}
              />
            </div>
            {/* Real-Time Sync Status Indicator (Watch Spaces only) */}
            {!isSoloWatch && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                zIndex: 15
              }}>
                <div style={{
                  background: 'rgba(13, 20, 36, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid rgba(52, 211, 153, 0.3)'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                  <span style={{ color: '#34d399' }}>Host sync active</span>
                </div>
              </div>
            )}

            {/* Viewer Warning Toast Banner */}
            {viewerNotice && (
              <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                zIndex: 35,
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}>
                <Lock size={16} color="#38bdf8" />
                <span>{viewerNotice}</span>
              </div>
            )}

            {appliedVariationNotice && (
              <div role="status" style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 24,
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(13, 20, 36, 0.95)',
                border: '1px solid rgba(52, 211, 153, 0.5)',
                color: '#a7f3d0',
                fontSize: '0.8rem'
              }}>
                Active variation: {appliedVariationNotice}
              </div>
            )}

            {/* Voting Modal / Banner overlay if active */}
            {activeVote && (() => {
              const voteQuestion = activeVote?.question || activeVote?.content || 'Which pre-authored variation should the group activate?';
              const rawOptions = Array.isArray(activeVote?.options) ? activeVote.options : [];

              return (
                <div className="glass-card" style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '340px',
                  padding: '16px 18px',
                  background: 'rgba(13, 20, 36, 0.95)',
                  border: '1px solid rgba(139, 92, 246, 0.6)',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.85)',
                  borderRadius: '12px',
                  zIndex: 25
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-ai" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      🗳️ Group Variation Vote
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 600 }}>Active ({voteSecondsRemaining}s)</span>
                      <button
                        onClick={() => {
                          setActiveVote(null);
                          if (isHost && socketRef.current) {
                            socketRef.current.emit('room.variation.voteClose');
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex' }}
                        title="Dismiss Vote"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px', color: '#f8fafc', lineHeight: 1.4 }}>
                    {voteQuestion}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rawOptions.map((option, i) => {
                      const key = `opt-${i + 1}`;
                      const label = typeof option === 'string' ? option : option.label;
                      const count = voteTallies?.[key] || 0;
                      const isSelected = selectedVoteOption === key;

                      return (
                        <button
                          key={i}
                          disabled={Boolean(selectedVoteOption)}
                          onClick={() => {
                            if (selectedVoteOption) return;
                            setSelectedVoteOption(key);
                            setVoteTallies(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
                            if (socketRef.current) {
                              socketRef.current.emit('cast-variation-vote', { 
                                option: key, 
                                voterName: currentUserName 
                              });
                            }
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            background: isSelected ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.05)',
                            borderColor: isSelected ? '#34d399' : 'rgba(255,255,255,0.12)',
                            cursor: selectedVoteOption ? 'default' : 'pointer',
                            opacity: (selectedVoteOption && !isSelected) ? 0.6 : 1,
                            fontSize: '0.8rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSelected ? '#34d399' : '#f8fafc' }}>
                            {isSelected ? <CheckCircle2 size={15} color="#34d399" /> : <span style={{ color: '#94a3b8' }}>•</span>}
                            <span style={{ fontWeight: isSelected ? 700 : 500 }}>{label}</span>
                          </span>
                          <span className="badge badge-pill" style={{ fontSize: '0.72rem', background: isSelected ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255,255,255,0.08)', color: isSelected ? '#a7f3d0' : '#cbd5e1' }}>
                            {count} {count === 1 ? 'vote' : 'votes'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedVoteOption && (
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '10px', textAlign: 'center', fontWeight: 600 }}>
                      ✓ Your vote has been recorded for the room!
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Active Trivia Banner overlay */}
            {activeTrivia && (
              <div className="glass-card" style={{
                position: 'absolute',
                bottom: '80px',
                left: '20px',
                maxWidth: '460px',
                padding: '14px 18px',
                background: 'rgba(13, 20, 36, 0.95)',
                border: '1px solid rgba(255, 42, 84, 0.4)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                zIndex: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff2a54', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={12} color="#ff2a54" /> {activeTrivia.type || 'Scene Trivia'} • {activeTrivia.timeFormatted || formatTime(currentTime)}
                  </span>
                  <button onClick={() => setActiveTrivia(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}>✕</button>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', lineHeight: 1.45 }}>
                  {activeTrivia.content || 'Scene trivia information is loading...'}
                </div>
              </div>
            )}

            {/* Center Play Indicator for direct HTML5 video / backdrop (hidden for YouTube to prevent double play button) */}
            {!isPlaying && !youtubeId && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 12,
                  pointerEvents: 'auto'
                }}
              >
                <button
                  onClick={() => {
                    handleTogglePlay();
                  }}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(13, 20, 36, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 42, 84, 0.75)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(255, 42, 84, 0.5)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  title="Play Stream"
                >
                  <Play size={34} fill="#fff" style={{ marginLeft: '4px' }} />
                </button>
              </div>
            )}

            {/* Viewer Stream Paused Notice */}
            {!isHost && !isSoloWatch && !isPlaying && (
              <div style={{
                position: 'absolute',
                bottom: '85px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(13, 20, 36, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                zIndex: 15
              }}>
                <Pause size={14} color="#38bdf8" />
                <span>Paused by Host ({spaceHostName})</span>
              </div>
            )}
          </div>

          {/* Bottom Player Controls Bar */}
          <div style={{
            background: 'rgba(9, 13, 22, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 20px',
            zIndex: 10
          }}>
            {/* Timeline Progress Bar (interactive for all viewers & hosts) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max={totalTime}
                  value={currentTime}
                  onChange={(e) => {
                    handleSeek(Number(e.target.value));
                  }}
                  style={{
                    width: '100%',
                    accentColor: '#ff2a54',
                    cursor: 'pointer',
                    height: '6px',
                    position: 'relative',
                    zIndex: 2
                  }}
                  title="Scrub timeline"
                />

                {/* Dynamic Timeline Marker Pins (Trivia, Variation Points, Characters) */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none', zIndex: 3 }}>
                  {movieTimelineEvents.map((ev, idx) => {
                    const pct = Math.min(Math.max(((ev.timestampSeconds || 0) / (totalTime || 1)) * 100, 0), 100);
                    const isVariation = ev.type === 'Variation Point';
                    const isTrivia = ev.type === 'Trivia';
                    const pinColor = isVariation ? '#f59e0b' : (isTrivia ? '#ec4899' : '#38bdf8');
                    const tooltip = `${ev.timeFormatted || formatTime(ev.timestampSeconds)} • ${ev.type}: ${ev.content || ''}`;

                    return (
                      <div
                        key={ev._id || ev.sourceId || idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isHost || isSoloWatch) {
                            handleSeek(ev.timestampSeconds);
                          }
                        }}
                        title={tooltip}
                        style={{
                          position: 'absolute',
                          left: `${pct}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: isVariation ? '13px' : '8px',
                          height: isVariation ? '13px' : '8px',
                          borderRadius: isVariation ? '2px' : '50%',
                          background: pinColor,
                          border: isVariation ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.6)',
                          boxShadow: `0 0 ${isVariation ? '8px' : '5px'} ${pinColor}`,
                          cursor: (isHost || isSoloWatch) ? 'pointer' : 'default',
                          pointerEvents: 'auto',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isHost && !isSoloWatch && (
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ● Synced with Host ({spaceHostName})
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)', minWidth: '110px' }}>
                  {formatTime(currentTime)} / {formatTime(totalTime)}
                </span>
              </div>
            </div>

            {/* Controls and Interactive Live Triggers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Play/Pause toggle (works for Host & Viewer) */}
                <button
                  onClick={() => {
                    handleTogglePlay();
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} fill="#fff" style={{ marginLeft: '2px' }} />}
                </button>
                <div style={{ height: '14px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                {/* Audio Volume / Mute toggle */}
                <button
                  onClick={handleToggleMute}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div style={{ height: '14px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                {/* YouTube streams indicator badge */}
                {youtubeId && (
                  <span className="badge" style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ff4d6d',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    fontSize: '0.72rem',
                    padding: '3px 8px'
                  }}>
                    ▶ YouTube Sync
                  </span>
                )}

                {/* Scene Trivia for interactive viewer engagement */}
                <button
                  onClick={handleOpenSceneTrivia}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '4px' }}
                >
                  <Sparkles size={12} color="#a855f7" /> Scene Trivia
                </button>

                {/* Host-only Vote Launch Button (Watch Spaces with participants only) */}
                {!isSoloWatch && isHost && (
                  <button
                    onClick={() => {
                      if (activeVote) {
                        setActiveVote(null);
                        if (socketRef.current) {
                          socketRef.current.emit('room.variation.voteClose');
                        }
                        return;
                      }
                      const varEvt = movieTimelineEvents.find(e =>
                        e.type === 'Variation Point' &&
                        Array.isArray(e.metadata?.variationOptions) &&
                        e.metadata.variationOptions.length >= 2
                      );
                      if (!varEvt || !socketRef.current) {
                        setChatNotice('No configured variation options are available for this movie.');
                        setTimeout(() => setChatNotice(''), 3500);
                        return;
                      }
                      setSelectedVoteOption(null);
                      socketRef.current.emit('room.variation.voteOpen', {
                        variationId: varEvt.sourceId,
                        question: varEvt.content,
                        durationSeconds: 30
                      });
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      gap: '4px'
                    }}
                    title="Launch group variation vote for participants"
                  >
                    🗳️ {activeVote ? 'Close Vote' : 'Open Vote'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge badge-pill" style={{ fontSize: '0.7rem' }}>1080p HD</span>
                <button
                  onClick={handleToggleFullscreen}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                  title="Toggle Fullscreen"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: AI Co-Pilot & Live Chat Tabs (Responsive) */}
        <div className="watchroom-sidebar-pane">
          {/* Tab Selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(7, 10, 19, 0.8)'
          }}>
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                padding: '12px',
                background: 'none',
                border: 'none',
                color: activeTab === 'ai' ? '#c084fc' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderBottom: activeTab === 'ai' ? '2px solid #a855f7' : '2px solid transparent'
              }}
            >
              <Sparkles size={15} />
              AI Co-Pilot
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                padding: '12px',
                background: 'none',
                border: 'none',
                color: activeTab === 'chat' ? '#38bdf8' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderBottom: activeTab === 'chat' ? '2px solid #38bdf8' : '2px solid transparent'
              }}
            >
              <MessageSquare size={15} />
              Live Chat
            </button>
          </div>

          {/* AI Co-Pilot View */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Based on current scene • <strong>{formatTime(currentTime)}</strong>
                </span>
                <button
                  onClick={() => onNavigate('ai-expanded')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a855f7',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Expand ↗
                </button>
              </div>

              {/* Chat messages scrollable list */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%'
                    }}
                  >
                    {msg.sender === 'user' ? (
                      <div style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        padding: '10px 14px',
                        borderRadius: '12px 12px 2px 12px',
                        fontSize: '0.85rem'
                      }}>
                        {msg.text}
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '12px 12px 12px 2px',
                        padding: '12px 14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Sparkles size={13} color="#a855f7" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc' }}>AI Co-Pilot</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.45 }}>
                          {msg.text}
                        </div>
                        {msg.source && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                            Source: {msg.source}
                          </div>
                        )}
                        {/* Quick pills */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                          <button
                            onClick={() => handleAskAI('Explain this in more detail')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                          >
                            Explain
                          </button>
                          <button
                            onClick={() => handleAskAI('Show related trivia')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                          >
                            Trivia
                          </button>
                          <button
                            onClick={() => handleAskAI('What happens next without spoilers?')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                          >
                            More
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isAILoading && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px 12px 12px 2px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#c084fc',
                      fontSize: '0.82rem'
                    }}>
                      <Sparkles size={14} className="spin-slow" />
                      <span>AI Co-Pilot is analyzing scene lore at {formatTime(currentTime)}...</span>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              {/* Ask Question Input Form */}
              <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ask AI about this scene..."
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                />
                <button
                  onClick={() => handleAskAI()}
                  className="btn btn-ai btn-sm"
                  style={{ padding: '8px 12px' }}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Live Chat View */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px', overflow: 'hidden' }}>
              {isSoloWatch ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '24px 16px',
                  color: '#94a3b8'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(168, 85, 247, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c084fc',
                    marginBottom: '14px'
                  }}>
                    <MessageSquare size={22} />
                  </div>
                  <h4 style={{ color: '#f8fafc', fontSize: '0.98rem', fontWeight: 700, marginBottom: '6px' }}>
                    Solo Watching
                  </h4>
                  <p style={{ fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '18px', maxWidth: '240px' }}>
                    Live Chat is enabled in Watch Spaces. Invite friends to start a synchronized watch party!
                  </p>
                  {onOpenCreateModal && (
                    <button
                      onClick={() => onOpenCreateModal(currentMovie)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Users size={14} /> Create Watch Space
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {reactions.length > 0 && (
                    <div aria-live="polite" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {reactions.map(reaction => (
                        <span
                          key={reaction.id}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '14px',
                            padding: '4px 9px',
                            fontSize: '0.8rem',
                            color: '#e2e8f0'
                          }}
                        >
                          {reaction.emoji} {reaction.participantName}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chatMessages.map((msg) => {
                      const isMsgHost = msg.user.toLowerCase().includes('host') || 
                                       (spaceHostName && msg.user.toLowerCase().includes(spaceHostName.toLowerCase().split(' ')[0]));
                      const isMsgSystem = msg.user.toLowerCase() === 'system';
                      return (
                        <div key={msg.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: isMsgSystem ? '#c084fc' : (isMsgHost ? '#ff2a54' : '#38bdf8') 
                            }}>
                              {msg.user} {isMsgHost && !isMsgSystem && '👑'}
                            </span>
                            <span style={{ color: '#64748b' }}>{msg.time}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#e2e8f0', wordBreak: 'break-word' }}>{msg.text}</div>
                        </div>
                      );
                    })}
                    {typingUsers.length > 0 && (
                      <div role="status" style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  {chatNotice && (
                    <div role="status" style={{ marginTop: '8px', color: '#fbbf24', fontSize: '0.78rem' }}>
                      {chatNotice}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} aria-label="Send emoji reaction">
                    {['❤️', '😂', '👏', '🔥', '😍', '😮'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSendReaction(emoji)}
                        disabled={connectionStatus !== 'connected'}
                        aria-label={`React ${emoji}`}
                        title={`React ${emoji}`}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '5px 7px',
                          cursor: 'pointer'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleSendChat} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={isChatMuted ? 'Your chat is muted by the Host' : 'Chat with watch party...'}
                      value={inputChat}
                      disabled={isChatMuted}
                      onChange={(e) => {
                        setInputChat(e.target.value);
                        setChatNotice('');
                        handleChatTyping(e.target.value);
                      }}
                      style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                    />
                    <button type="submit" disabled={isChatMuted} className="btn btn-primary btn-sm" style={{ padding: '8px 12px' }}>
                      <Send size={15} />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Host Confirmation Modal: End Watch Space */}
      {showEndModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: '420px',
            maxWidth: '92%',
            padding: '24px',
            background: '#0d1424',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Power size={20} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                End Watch Space?
              </h3>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '22px' }}>
              Ending this session will conclude synchronized playback and chat for all participants in Room <strong>{roomCode}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowEndModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndSpace}
                className="btn btn-sm"
                style={{
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                End Watch Space
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Management Modal */}
      {showParticipantsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: '460px',
            maxWidth: '92%',
            padding: '24px',
            background: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Room Participants
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {liveCount} Active in Room {roomCode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="btn btn-icon btn-secondary btn-sm"
                title="Close"
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Host Moderation Notice */}
            {isHost && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: '#fca5a5'
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>You are the Host. Manage participants, room access, chat moderation, and Host privileges.</span>
                <button
                  type="button"
                  onClick={handleToggleRoomLock}
                  className="btn btn-sm"
                  style={{
                    marginLeft: 'auto',
                    whiteSpace: 'nowrap',
                    background: roomLocked ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: roomLocked ? '#4ade80' : '#fca5a5',
                    border: `1px solid ${roomLocked ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`
                  }}
                  title={roomLocked ? 'Allow new participants to join' : 'Prevent new participants from joining'}
                >
                  <Lock size={13} /> {roomLocked ? 'Unlock Room' : 'Lock Room'}
                </button>
              </div>
            )}

            {/* Participant List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflowY: 'auto',
              paddingRight: '4px',
              maxHeight: '360px'
            }}>
              {activeParticipantsList.map((p, idx) => {
                const isCurrent = p.name === currentUserName || (p.name && activeUser?.name && p.name.toLowerCase() === activeUser.name.toLowerCase());
                const isParticipantHost = p.role === 'Host' || (spaceHostName && p.name && spaceHostName.toLowerCase() === p.name.toLowerCase());
                const isOnline = p.isOnline !== false;

                return (
                  <div
                    key={p.socketId || p.userId || p.name || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '10px 12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: isParticipantHost ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.1)'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: isOnline ? '#22c55e' : '#64748b',
                          border: '2px solid #0d1424'
                        }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                            {p.name}
                          </span>
                          {isCurrent && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              (You)
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          {isParticipantHost ? (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#f59e0b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Crown size={11} /> Host
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.7rem',
                              color: '#38bdf8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Eye size={11} /> Viewer
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: isOnline ? '#4ade80' : '#94a3b8' }}>
                            • {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Host Moderation Action */}
                    {isHost && !isParticipantHost && !isCurrent && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '5px' }}>
                        <button
                          onClick={() => handleToggleParticipantMute(p)}
                          className="btn btn-sm"
                          style={{
                            background: p.isMuted ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                            color: p.isMuted ? '#4ade80' : '#fbbf24',
                            border: `1px solid ${p.isMuted ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                            padding: '5px 8px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={p.isMuted ? `Unmute ${p.name}'s chat` : `Mute ${p.name}'s chat`}
                        >
                          <VolumeX size={12} /> {p.isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        {isOnline && (
                          <button
                            onClick={() => handleTransferHost(p)}
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245,158,11,0.35)',
                              padding: '5px 8px',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={`Transfer Host role to ${p.name}`}
                          >
                            <Crown size={12} /> Make Host
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveParticipant(p.name)}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            padding: '5px 8px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={`Remove ${p.name} from Watch Space`}
                        >
                          <UserX size={12} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '7px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Notification Modal when Host Ends the Space */}
      {spaceEndedNotice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: '400px',
            maxWidth: '92%',
            padding: '26px',
            textAlign: 'center',
            background: '#0d1424',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            borderRadius: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <LogOut size={22} color="#38bdf8" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
              Watch Space Concluded
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
              {spaceEndedNotice} The session has concluded. You can review the viewing telemetry or return to dashboard.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => onNavigate('analytics')}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', gap: '6px' }}
              >
                📊 View Session Summary
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
