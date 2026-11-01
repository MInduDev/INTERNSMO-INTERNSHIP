// services/socketService.js
// Real-time playback sync, chat, and presence — with JWT handshake auth (PRD §10.1)
// and full PRD §7.3.4 event envelope support
const WatchSpace = require('../models/WatchSpace');
const TimelineEvent = require('../models/TimelineEvent');
const { isApprovedSubtitleUrl } = require('../utils/subtitleAssets');
const { archiveSessionAnalytics } = require('./sessionAnalyticsService');
const { socketAuthMiddleware } = require('../middleware/auth');
const { transitionPlaybackState } = require('./playbackStateMachine');

// Input sanitizer — prevent XSS in chat messages (PRD §10.1)
function sanitizeMsg(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/<[^>]*>/g, '');
}

function initSocket(io) {
  // PRD §10.1: Authenticate all socket connections at handshake time
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const authenticatedUser = socket.user;
    if (!authenticatedUser?.authenticated) {
      socket.disconnect(true);
      return;
    }
    console.log(`[Socket Connected] ID: ${socket.id} | User: ${authenticatedUser.name} | Auth: ${authenticatedUser.authenticated}`);

    let currentRoomCode = null;
    let currentUser = null;
    let lastSyncSampleAt = 0;
    const reactionEmojis = new Set(['❤️', '😂', '👏', '🔥', '😍', '😮']);

    const isRoomHost = (space) => {
      if (!space || !currentUser) return false;
      const authenticatedId = authenticatedUser.authenticated
        ? String(authenticatedUser._id || authenticatedUser.id || '')
        : '';
      const roomHostId = space.host?.userId ? String(space.host.userId) : '';
      return Boolean(roomHostId && authenticatedId && authenticatedId === roomHostId);
    };

    const getSocketParticipant = (space) => (
      space?.participants.find(participant => participant.socketId === socket.id) || null
    );

    // Helper for PRD §7.3.4 event envelope
    const prdEnvelope = (eventName, watchSpaceId, payload) => ({
      event: eventName,
      watchSpaceId,
      payload,
      ts: Date.now()
    });

    // ── 1. Join Watch Space ───────────────────────────────────────────────────
    socket.on('join-room', async ({ roomCode } = {}) => {
      try {
        currentRoomCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
        if (!currentRoomCode) {
          return socket.emit('room-join-error', { message: 'A room code is required.' });
        }
        if (!/^[A-Z0-9]{4,12}$/.test(currentRoomCode)) {
          return socket.emit('room-join-error', { message: 'The room code format is invalid.' });
        }
        currentUser = {
          id: String(authenticatedUser._id || authenticatedUser.id || ''),
          name: authenticatedUser.name,
          avatar: authenticatedUser.avatar,
          role: 'Viewer'
        };
        if (!currentUser.id || !currentUser.name) {
          return socket.emit('room-join-error', { message: 'A valid account is required to join.' });
        }

        let space = await WatchSpace.findOne({ code: currentRoomCode });
        if (!space) {
          return socket.emit('room-join-error', { message: `Room ${currentRoomCode} not found` });
        }
        if (space.status === 'ended') {
          return socket.emit('room-join-error', { message: 'This Watch Space has already ended.' });
        }
        if (
          space.activeVariationVote?.active &&
          space.activeVariationVote.endsAt &&
          space.activeVariationVote.endsAt.getTime() <= Date.now()
        ) {
          await closeVariationVote(currentRoomCode, space.activeVariationVote.endsAt.getTime());
          space = await WatchSpace.findOne({ code: currentRoomCode });
        }

        const authenticatedId = currentUser.id;
        const existing = space.participants.find(
          p => authenticatedId && p.userId && String(p.userId) === authenticatedId
        );
        const isHost = isRoomHost(space);

        if (space.isLocked && !existing && !isHost) {
          return socket.emit('room-join-error', {
            message: 'This Watch Space is locked by the Host.'
          });
        }

        if (!existing && space.participants.filter(p => p.isOnline).length >= (space.maxParticipants || 50)) {
          return socket.emit('room-join-error', {
            message: 'This Watch Space has reached its participant limit.'
          });
        }

        if (existing) {
          existing.isOnline = true;
          existing.socketId = socket.id;
          existing.role = isHost ? 'Host' : 'Viewer';
          if (authenticatedId) existing.userId = authenticatedId;
        } else {
          space.participants.push({
            userId: authenticatedId || undefined,
            name: currentUser.name,
            avatar: currentUser.avatar,
            role: 'Viewer',
            isOnline: true,
            isReady: false,
            socketId: socket.id
          });
        }

        space.analytics = space.analytics || {};
        space.analytics.peakParticipants = Math.max(
          space.analytics.peakParticipants || 0,
          space.participants.filter(p => p.isOnline).length
        );
        currentUser.role = isHost ? 'Host' : 'Viewer';
        currentUser.isRoomHost = isHost;
        socket.join(currentRoomCode);
        console.log(`[Room ${currentRoomCode}] ${currentUser.name} joined`);

        if (isHost) {
          space.playbackState.hostConnected = true;
          io.to(currentRoomCode).emit('host-reconnected', {
            message: 'Host has reconnected', hostName: currentUser.name
          });
        }

        await space.save();

        // Send current state to the joining client
        socket.emit('initial-sync-state', {
          playbackState: space.playbackState,
          participants: space.participants,
          movie: space.movie,
          host: space.host,
          isLocked: space.isLocked,
          chatMessages: space.chatMessages.slice(-50),
          activeVariationVote: space.activeVariationVote,
          currentVariation: space.currentVariation
        });

        const onlineCount = space.participants.filter(p => p.isOnline).length;
        io.to(currentRoomCode).emit('participants-updated', space.participants);
        io.to(currentRoomCode).emit('room.presence.update', prdEnvelope('room.presence.update', currentRoomCode, {
          participantId: socket.id,
          action: 'joined',
          participantCount: onlineCount
        }));
      } catch (err) {
        console.error('[Join Error]:', err.message);
      }
    });

    // ── 2. PRD Playback: room.playback.update ────────────────────────────────
    socket.on('room.playback.update', async ({ state, positionSeconds, issuedBy } = {}) => {
      if (!currentRoomCode) return;

      // PRD §10.1: only the current room Host may issue playback updates
      const space = await WatchSpace.findOne({ code: currentRoomCode }).lean();
      if (!isRoomHost(space)) {
        return socket.emit('error', { message: 'Only the Host can control playback' });
      }

      const now = new Date();
      const transition = transitionPlaybackState(space.playbackState, state, positionSeconds, now);
      if (!transition) {
        return socket.emit('error', { message: 'Invalid playback update.' });
      }

      await WatchSpace.updateOne(
        { code: currentRoomCode },
        {
          $set: {
            'playbackState.isPlaying': transition.playbackState.isPlaying,
            'playbackState.currentTime': transition.playbackState.currentTime,
            'playbackState.lastUpdated': transition.playbackState.lastUpdated,
            ...(state === 'play' ? { startedAt: space.startedAt || now, status: 'active' } : {})
          },
          ...(transition.elapsedPlaybackSeconds > 0
            ? { $inc: { 'analytics.totalWatchSeconds': transition.elapsedPlaybackSeconds } }
            : {})
        }
      );

      const envelope = prdEnvelope('room.playback.update', currentRoomCode, {
        state,
        positionSeconds,
        issuedBy: sanitizeMsg(issuedBy, 100) || currentUser?.name || 'Host'
      });

      io.to(currentRoomCode).emit('room.playback.update', envelope);

      // Simple aliases for easier frontend binding
      if (state === 'play') io.to(currentRoomCode).emit('sync-play', { position: positionSeconds, serverTimestamp: Date.now() });
      if (state === 'pause') io.to(currentRoomCode).emit('sync-pause', { position: positionSeconds, serverTimestamp: Date.now() });
      if (state === 'seek') io.to(currentRoomCode).emit('sync-seek', { position: positionSeconds, serverTimestamp: Date.now() });
    });

    // Simple playback helper aliases (forward to main handler)
    socket.on('playback-play', (data) => socket.emit('room.playback.update', { state: 'play', positionSeconds: data?.position, issuedBy: currentUser?.name }));
    socket.on('playback-pause', (data) => socket.emit('room.playback.update', { state: 'pause', positionSeconds: data?.position, issuedBy: currentUser?.name }));
    socket.on('playback-seek', (data) => socket.emit('room.playback.update', { state: 'seek', positionSeconds: data?.position, issuedBy: currentUser?.name }));

    // ── 3. Drift Measurement: room.sync.ping / room.sync.pong ───────────────
    socket.on('room.sync.ping', ({ clientSentAt } = {}) => {
      if (!Number.isFinite(clientSentAt)) return;
      socket.emit('room.sync.pong', { clientSentAt, serverReceivedAt: Date.now() });
    });

    socket.on('room.sync.measurement', async ({ driftMs, latencyMs } = {}) => {
      if (!currentRoomCode || !currentUser || Date.now() - lastSyncSampleAt < 1000) return;
      if (!Number.isFinite(driftMs) || Math.abs(driftMs) > 60000) return;
      if (!Number.isFinite(latencyMs) || latencyMs < 0 || latencyMs > 60000) return;
      lastSyncSampleAt = Date.now();
      try {
        await WatchSpace.updateOne(
          {
            code: currentRoomCode,
            'participants.socketId': socket.id
          },
          {
            $push: {
              'analytics.syncSamples': {
                $each: [{
                  participantId: authenticatedUser._id,
                  driftMs,
                  latencyMs,
                  measuredAt: new Date()
                }],
                $slice: -1000
              }
            }
          }
        );
      } catch (err) {
        console.error('[Sync Measurement Error]:', err.message);
      }
    });

    // ── 4. Drift Heartbeat (Host → Viewers) ─────────────────────────────────
    socket.on('playback-heartbeat', ({ position, isPlaying, measurementId } = {}) => {
      if (!currentRoomCode) return;
      if (!Number.isFinite(position) || position < 0 || typeof isPlaying !== 'boolean') return;
      WatchSpace.findOne({ code: currentRoomCode }).lean()
        .then(space => {
          if (isRoomHost(space)) {
            socket.to(currentRoomCode).emit('sync-heartbeat', {
              position, isPlaying, serverTimestamp: Date.now(),
              measurementId: typeof measurementId === 'string' ? measurementId.slice(0, 80) : undefined
            });
          }
        })
        .catch(err => console.error('[Playback Heartbeat Error]:', err.message));
    });

    // ── 5. Lobby Readiness Toggle ────────────────────────────────────────────
    socket.on('toggle-ready', async ({ isReady } = {}) => {
      if (!currentRoomCode || !currentUser) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (space) {
        const participant = getSocketParticipant(space);
        if (participant) {
          participant.isReady = !!isReady;
          await space.save();
          io.to(currentRoomCode).emit('participants-updated', space.participants);
        }
      }
    });

    // ── 6. Chat: room.chat.message (PRD §7.3.4) ──────────────────────────────
    // ── 6. Chat: Unified send-chat-message & room.chat.message ──────────────
    let lastChatTimestamp = 0;
    let lastChatContent = '';

    const handleIncomingChatMessage = async (data = {}) => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      const participant = getSocketParticipant(space);
      if (!space || !participant) {
        return socket.emit('chat-rejected', { message: 'Join the room before sending chat messages.' });
      }
      if (participant.isMuted) {
        return socket.emit('chat-rejected', { message: 'Your chat has been muted by the Host.' });
      }

      const rawText = data.body || data.content;
      const cleanBody = sanitizeMsg(rawText, 500);
      if (!cleanBody) return;

      // In-memory instant deduplication (stops asynchronous race conditions from rapid concurrent socket events)
      const now = Date.now();
      if (cleanBody === lastChatContent && (now - lastChatTimestamp) < 1500) {
        return;
      }
      lastChatTimestamp = now;
      lastChatContent = cleanBody;

      const sender = sanitizeMsg(participant.name || 'Viewer', 100);

      const messageObj = {
        senderName: sender,
        senderAvatar: participant.avatar || currentUser?.avatar,
        content: cleanBody,
        isAi: false,
        timestamp: new Date()
      };

      const saved = await WatchSpace.updateOne({
        code: currentRoomCode,
        participants: {
          $elemMatch: {
            socketId: socket.id,
            isMuted: { $ne: true }
          }
        }
      }, { $push: { chatMessages: messageObj } });
      if (!saved.modifiedCount) {
        return socket.emit('chat-rejected', { message: 'Your chat has been muted by the Host.' });
      }

      // Broadcast single message to all in the room
      io.to(currentRoomCode).emit('new-chat-message', messageObj);
    };

    socket.on('room.chat.message', handleIncomingChatMessage);
    socket.on('send-chat-message', handleIncomingChatMessage);

    socket.on('typing-update', async ({ isTyping } = {}) => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode }).lean();
      const participant = getSocketParticipant(space);
      if (!participant || participant.isMuted) return;
      socket.to(currentRoomCode).emit('typing-update', {
        participantName: participant.name,
        isTyping: Boolean(isTyping)
      });
    });

    socket.on('send-reaction', async ({ emoji } = {}) => {
      if (!currentRoomCode || !reactionEmojis.has(emoji)) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode }).lean();
      const participant = getSocketParticipant(space);
      if (!participant) return;
      io.to(currentRoomCode).emit('new-reaction', {
        id: `${socket.id}-${Date.now()}`,
        participantName: participant.name,
        emoji
      });
    });

    // ── 7. Timeline Trivia Trigger: room.ai.trivia ───────────────────────────
    socket.on('trigger-trivia', async ({ eventId, text, tsSeconds } = {}) => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode }).lean();
      if (!isRoomHost(space)) return;
      const cleanEventId = sanitizeMsg(eventId, 50);
      if (!cleanEventId || !Number.isFinite(tsSeconds)) return;
      const event = await TimelineEvent.findOne({
        movieId: space.movie.slug,
        type: { $in: ['Trivia', 'Character', 'Glossary'] },
        timestampSeconds: { $gte: tsSeconds - 1, $lte: tsSeconds + 1 },
        $or: [{ sourceId: cleanEventId }, ...( /^[0-9a-fA-F]{24}$/.test(cleanEventId) ? [{ _id: cleanEventId }] : [])]
      }).select('sourceId content timestampSeconds type').lean();
      if (!event) return;

      const tracked = await WatchSpace.updateOne(
        { code: currentRoomCode, 'analytics.triviaShownIds': { $ne: event.sourceId } },
        {
          $addToSet: { 'analytics.triviaShownIds': event.sourceId },
          $inc: { 'analytics.triviaShownCount': 1 }
        }
      );
      if (tracked.modifiedCount) {
        io.to(currentRoomCode).emit('room.ai.trivia', prdEnvelope('room.ai.trivia', currentRoomCode, {
          eventId: event.sourceId,
          text: sanitizeMsg(text || event.content, 500),
          tsSeconds: event.timestampSeconds
        }));
      }
    });

    // ── 8. Host Moderation Controls (PRD §6.1) ───────────────────────────────

    // Mute a participant's chat
    socket.on('host-mute-participant', async ({ targetName, isMuted } = {}) => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!space) return;
      if (!isRoomHost(space)) return socket.emit('error', { message: 'Only the Host can mute participants' });

      const cleanTargetName = sanitizeMsg(targetName, 100);
      const target = space.participants.find(p => p.name.toLowerCase() === cleanTargetName.toLowerCase());
      if (!target || target.role === 'Host') return;

      target.isMuted = Boolean(isMuted);
      await space.save();
      io.to(currentRoomCode).emit('participants-updated', space.participants);
      io.to(currentRoomCode).emit('participant-muted', {
        targetName: target.name,
        isMuted: target.isMuted,
        mutedBy: currentUser?.name || 'Host'
      });
    });

    // Remove a participant from the room
    socket.on('host-remove-participant', async ({ targetName } = {}) => {
      const cleanTargetName = sanitizeMsg(targetName, 100).toLowerCase();
      if (!currentRoomCode || !cleanTargetName) return;

      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!space) return;

      if (!isRoomHost(space)) {
        return socket.emit('error', { message: 'Only the Host can remove participants' });
      }

      const target = space.participants.find(
        p => p.name && p.name.toLowerCase() === cleanTargetName
      );

      if (target && target.role !== 'Host') {
        const removedName = target.name;
        // Remove from participants list
        space.participants = space.participants.filter(p => p.name !== removedName);
        await space.save();

        // Notify the target socket to leave immediately
        if (target.socketId) {
          const targetSocket = io.sockets.sockets.get(target.socketId);
          if (targetSocket) {
            targetSocket.emit('removed-from-room', { message: 'You have been removed from the Watch Space by the Host.' });
            targetSocket.leave(currentRoomCode);
          }
        }

        // Inform all remaining participants
        io.to(currentRoomCode).emit('participants-updated', space.participants);
        io.to(currentRoomCode).emit('room.presence.update', prdEnvelope('room.presence.update', currentRoomCode, {
          action: 'removed',
          participantName: removedName,
          participantCount: space.participants.filter(p => p.isOnline).length
        }));
      }
    });

    // End Watch Space for all participants
    socket.on('host-end-space', async () => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!isRoomHost(space)) {
        return socket.emit('error', { message: 'Only the Host can end this Watch Space' });
      }

      const endedAt = new Date();
      await archiveSessionAnalytics(space, endedAt);
      space.status = 'ended';
      space.endedAt = endedAt;
      if (space.playbackState) {
        space.playbackState.isPlaying = false;
        space.playbackState.lastUpdated = endedAt;
      }
      await space.save();

      io.to(currentRoomCode).emit('space-ended-by-host', {
        message: 'The Host has ended this Watch Space and the room has been closed.',
        roomCode: currentRoomCode,
        endedAt: new Date()
      });
    });

    // Transfer Host role to another participant
    socket.on('host-transfer', async ({ newHostName } = {}) => {
      if (!currentRoomCode || !newHostName) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!space) return;
      if (!isRoomHost(space)) {
        return socket.emit('error', { message: 'Only the Host can transfer Host privileges' });
      }

      const cleanNewHostName = sanitizeMsg(newHostName, 100).toLowerCase();
      const newHostParticipant = space.participants.find(
        p => p.name.toLowerCase() === cleanNewHostName && p.isOnline && p.socketId
      );
      if (!newHostParticipant || newHostParticipant.socketId === socket.id) return;

      const previousHostName = space.host.name;
      space.participants.forEach(participant => {
        if (participant.role === 'Host') participant.role = 'Viewer';
      });
      newHostParticipant.role = 'Host';
      space.host.name = newHostParticipant.name;
      space.host.avatar = newHostParticipant.avatar;
      space.host.userId = newHostParticipant.userId || null;
      space.playbackState.hostConnected = true;

      await space.save();
      currentUser.role = 'Viewer';
      currentUser.isRoomHost = false;
      io.to(currentRoomCode).emit('host-transferred', {
        newHostName: newHostParticipant.name,
        previousHostName,
        host: space.host
      });
      io.to(currentRoomCode).emit('participants-updated', space.participants);
    });

    socket.on('host-set-room-lock', async ({ isLocked } = {}) => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!space) return;
      if (!isRoomHost(space)) {
        return socket.emit('error', { message: 'Only the Host can lock or unlock this room' });
      }

      space.isLocked = Boolean(isLocked);
      await space.save();
      io.to(currentRoomCode).emit('room-lock-updated', { isLocked: space.isLocked });
    });

    // ── 9. Variation Voting ──────────────────────────────────────────────────
    let voteCloseTimer;
    const closeVariationVote = async (code = currentRoomCode, expectedEndTime) => {
      if (!code) return;
      const space = await WatchSpace.findOne({ code });
      if (!space?.activeVariationVote?.active) return;
      if (
        expectedEndTime &&
        new Date(space.activeVariationVote.endsAt).getTime() !== expectedEndTime
      ) return;

      const counts = space.activeVariationVote.votes || new Map();
      const options = space.activeVariationVote.options || [];
      const totalVotes = [...counts.values()].reduce((sum, count) => sum + count, 0);
      const winnerIndex = totalVotes > 0 ? options.reduce((bestIndex, _, index) => {
        const key = `opt-${index + 1}`;
        const bestKey = bestIndex < 0 ? null : `opt-${bestIndex + 1}`;
        return bestIndex < 0 || (counts.get(key) || 0) > (counts.get(bestKey) || 0)
          ? index
          : bestIndex;
      }, -1) : -1;
      const winningOption = winnerIndex < 0 ? null : options[winnerIndex];
      space.activeVariationVote.active = false;
      space.activeVariationVote.winningOption = winningOption;
      space.currentVariation = winningOption
        ? {
            variationId: space.activeVariationVote.variationId,
            option: winningOption.label,
            optionId: winningOption.id,
            videoUrl: winningOption.videoUrl || '',
            audioUrl: winningOption.audioUrl || '',
            subtitleUrl: winningOption.subtitleUrl || '',
            language: winningOption.language || '',
            assetType: winningOption.assetType || '',
            youtubeCaptionLanguage: winningOption.youtubeCaptionLanguage || '',
            approved: Boolean(winningOption.approved),
            approvedBy: winningOption.approvedBy || '',
            approvedAt: winningOption.approvedAt || null
          }
        : null;
      await space.save();

      io.to(code).emit('room.variation.voteClose', {
        roomCode: code,
        closedAt: Date.now(),
        winningOption,
        votes: Object.fromEntries(counts)
      });
      if (winningOption) {
        io.to(code).emit('room.variation.applied', {
          variationId: space.activeVariationVote.variationId,
          option: winningOption.label,
          optionId: winningOption.id,
          videoUrl: winningOption.videoUrl || '',
          audioUrl: winningOption.audioUrl || '',
          subtitleUrl: winningOption.subtitleUrl || '',
          language: winningOption.language || '',
          assetType: winningOption.assetType || '',
          youtubeCaptionLanguage: winningOption.youtubeCaptionLanguage || '',
          approved: Boolean(winningOption.approved)
        });
      }
    };

    socket.on('room.variation.voteOpen', async ({ variationId, question, durationSeconds = 30 } = {}) => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!space) return;
      if (!isRoomHost(space)) return socket.emit('error', { message: 'Only the Host can open a variation vote.' });
      if (!space.sceneVotingEnabled) return socket.emit('error', { message: 'Variation voting is disabled for this room.' });

      const cleanVariationId = sanitizeMsg(variationId, 100);
      if (!cleanVariationId) return socket.emit('error', { message: 'A variation ID is required.' });
      const timelineEvent = await TimelineEvent.findOne({
        sourceId: cleanVariationId,
        type: 'Variation Point'
      }).lean();
      const roomMovieId = String(space.movie?.slug || space.movie?.id || '');
      if (!timelineEvent || (roomMovieId && timelineEvent.movieId !== roomMovieId)) {
        return socket.emit('error', { message: 'The selected variation is not configured for this movie.' });
      }
      const isSafeAssetUrl = (value, extensions) => {
        if (typeof value !== 'string' || value.length > 2000) return false;
        if (value.startsWith('/') && !value.startsWith('//')) {
          const path = value.split(/[?#]/, 1)[0].toLowerCase();
          return extensions.some(extension => path.endsWith(extension));
        }
        try {
          const parsed = new URL(value);
          return ['http:', 'https:'].includes(parsed.protocol) &&
            extensions.some(extension => parsed.pathname.toLowerCase().endsWith(extension));
        } catch (_err) {
          return false;
        }
      };
      const cleanOptions = (Array.isArray(timelineEvent.metadata?.variationOptions)
        ? timelineEvent.metadata.variationOptions
        : [])
        .slice(0, 4)
        .map((option, index) => {
          const legacy = typeof option === 'string';
          const label = sanitizeMsg(legacy ? option : option?.label, 120);
          if (!label) return null;
          const assetsApproved = !legacy && option.approved === true;
          const subtitleUrl = assetsApproved && isApprovedSubtitleUrl(option.subtitleUrl)
            ? option.subtitleUrl
            : '';
          const videoUrl = assetsApproved && isSafeAssetUrl(option.videoUrl, ['.mp4', '.webm', '.mkv', '.ogv'])
            ? option.videoUrl
            : '';
          const audioUrl = assetsApproved && isSafeAssetUrl(option.audioUrl, ['.mp3', '.m4a', '.aac', '.ogg', '.wav'])
            ? option.audioUrl
            : '';
          return {
            id: sanitizeMsg(!legacy && option.id, 80) || `opt-${index + 1}`,
            label,
            subtitleUrl,
            videoUrl,
            audioUrl,
            language: sanitizeMsg(!legacy && option.language, 20),
            assetType: sanitizeMsg(!legacy && option.assetType, 20) ||
              (option.youtubeCaptionLanguage ? 'youtube-caption' :
                subtitleUrl ? 'subtitle' : audioUrl ? 'audio' : videoUrl ? 'video' : ''),
            youtubeCaptionLanguage: assetsApproved &&
              /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(option.youtubeCaptionLanguage || '')
              ? sanitizeMsg(option.youtubeCaptionLanguage, 20)
              : '',
            approved: assetsApproved,
            approvedBy: assetsApproved ? sanitizeMsg(option.approvedBy, 100) : '',
            approvedAt: assetsApproved ? option.approvedAt || null : null
          };
        })
        .filter(Boolean);
      if (cleanOptions.length < 2) {
        return socket.emit('error', { message: 'A variation vote requires at least two options.' });
      }

      const duration = Math.min(Math.max(Number(durationSeconds) || 30, 5), 120);
      const closesAt = Date.now() + duration * 1000;
      const votes = new Map(cleanOptions.map((_, index) => [`opt-${index + 1}`, 0]));
      space.activeVariationVote = {
        active: true,
        variationId: cleanVariationId,
        question: sanitizeMsg(question, 250) || 'Which variation should the group activate?',
        options: cleanOptions,
        votes,
        votesByParticipant: new Map(),
        winningOption: null,
        endsAt: new Date(closesAt)
      };
      await space.save();

      clearTimeout(voteCloseTimer);
      const voteRoomCode = currentRoomCode;
      voteCloseTimer = setTimeout(() => {
        closeVariationVote(voteRoomCode, closesAt)
          .catch(err => console.error('[Variation Vote Close Error]:', err.message));
      }, duration * 1000);
      voteCloseTimer.unref?.();

      io.to(currentRoomCode).emit('room.variation.voteOpen', prdEnvelope('room.variation.voteOpen', currentRoomCode, {
        variationId: cleanVariationId,
        question: space.activeVariationVote.question,
        options: cleanOptions,
        votes: Object.fromEntries(votes),
        closesAt
      }));
    });

    socket.on('room.variation.voteClose', async () => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (!isRoomHost(space)) return socket.emit('error', { message: 'Only the Host can close a variation vote.' });
      clearTimeout(voteCloseTimer);
      try {
        await closeVariationVote();
      } catch (err) {
        console.error('[Variation Vote Close Error]:', err.message);
        socket.emit('error', { message: 'Unable to close the variation vote.' });
      }
    });

    socket.on('cast-variation-vote', async ({ option } = {}) => {
      if (!currentRoomCode || !currentUser?.id) return;
      const cleanOption = sanitizeMsg(option, 20);
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      const vote = space?.activeVariationVote;
      if (vote?.active && vote.endsAt && vote.endsAt.getTime() <= Date.now()) {
        await closeVariationVote(currentRoomCode, vote.endsAt.getTime());
      }
      if (!vote?.active || (vote.endsAt && vote.endsAt.getTime() <= Date.now())) {
        return socket.emit('vote-rejected', { message: 'This variation vote is closed.' });
      }
      if (!vote.votes?.has(cleanOption)) {
        return socket.emit('vote-rejected', { message: 'Choose one of the listed variation options.' });
      }
      if (!vote.votesByParticipant) vote.votesByParticipant = new Map();
      if (vote.votesByParticipant?.has(currentUser.id)) {
        return socket.emit('vote-rejected', { message: 'You have already voted in this variation poll.' });
      }

      vote.votes.set(cleanOption, (vote.votes.get(cleanOption) || 0) + 1);
      vote.votesByParticipant.set(currentUser.id, cleanOption);
      await space.save();
      io.to(currentRoomCode).emit('variation-votes-updated', {
        votes: Object.fromEntries(vote.votes),
        optionVoted: cleanOption
      });
    });

    // ── 10. Presence Heartbeat ──────────────────────────────────────────────
    socket.on('presence-ping', async () => {
      if (!currentRoomCode) return;
      const space = await WatchSpace.findOne({ code: currentRoomCode });
      if (space) {
        const p = getSocketParticipant(space);
        if (p && (!p.isOnline || p.socketId !== socket.id)) {
          p.isOnline = true;
          p.socketId = socket.id;
          await space.save();
          io.to(currentRoomCode).emit('participants-updated', space.participants);
        }
      }
    });

    // ── 11. Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] ID: ${socket.id} | User: ${currentUser?.name}`);
      if (!currentRoomCode) return;

      try {
        const space = await WatchSpace.findOne({ code: currentRoomCode });
        if (!space) return;

        const participant = space.participants.find(p => p.socketId === socket.id);
        if (!participant) return;

        // Check if user has another active socket connection in this room before marking offline
        const roomSockets = io.sockets.adapter.rooms.get(currentRoomCode);
        let stillInRoom = false;
        if (roomSockets) {
          for (const sId of roomSockets) {
            if (sId !== socket.id) {
              const activeSock = io.sockets.sockets.get(sId);
              const activeUserId = activeSock?.user?._id || activeSock?.user?.id;
              if (activeUserId && String(activeUserId) === String(participant.userId || '')) {
                stillInRoom = true;
                break;
              }
            }
          }
        }

        if (!stillInRoom) {
          participant.isOnline = false;
        }

        // Deterministic host disconnect behavior (PRD §6.1 acceptance criteria)
        const isHost = space.host.userId
          ? String(space.host.userId) === String(participant.userId || '')
          : participant.role === 'Host';
        if (isHost && !stillInRoom) {
          const now = new Date();
          if (space.playbackState?.isPlaying && space.playbackState.lastUpdated) {
            space.analytics.totalWatchSeconds = (space.analytics.totalWatchSeconds || 0) +
              Math.max(0, (now.getTime() - new Date(space.playbackState.lastUpdated).getTime()) / 1000);
          }
          space.playbackState.hostConnected = false;
          space.playbackState.isPlaying = false; // Deterministic pause on host drop
          space.playbackState.lastUpdated = now;
          await space.save();

          io.to(currentRoomCode).emit('host-disconnected', {
            message: 'Host has lost connection. Playback is paused.',
            reconnectGracePeriodSeconds: 60
          });
        } else {
          await space.save();
        }

        const onlineCount = space.participants.filter(p => p.isOnline).length;
        io.to(currentRoomCode).emit('participants-updated', space.participants);
        io.to(currentRoomCode).emit('room.presence.update', prdEnvelope('room.presence.update', currentRoomCode, {
          participantId: socket.id,
          action: 'left',
          participantCount: onlineCount
        }));
      } catch (err) {
        console.error('[Disconnect Error]:', err.message);
      }
    });
  });
}

module.exports = { initSocket };
