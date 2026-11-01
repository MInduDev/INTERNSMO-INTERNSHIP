// routes/spaceRoutes.js
// Watch Space routes
const express = require('express');
const router = express.Router();
const WatchSpace = require('../models/WatchSpace');
const Movie = require('../models/Movie');
const { protect, adminOnly } = require('../middleware/auth');
const { archiveSessionAnalytics } = require('../services/sessionAnalyticsService');

// Helper to generate a friendly 6-character room code (e.g. 'ABC123')
function generateRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let code = '';
  for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
}

// @desc    Create a new Watch Space
// @route   POST /api/spaces/create
// @access  Authenticated
router.post('/create', protect, async (req, res) => {
  try {
    const {
      title,
      movieSlug,
      movieTitle,
      visibility = 'Private',
      aiCoPilotLevel = 'Normal',
      sceneVotingEnabled = true,
      hostAvatar,
      maxParticipants = 50
    } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Room name is required' });
    }
    if (!Number.isInteger(Number(maxParticipants)) || Number(maxParticipants) < 2 || Number(maxParticipants) > 50) {
      return res.status(400).json({ success: false, message: 'maxParticipants must be between 2 and 50' });
    }
    if (!['Private', 'Public'].includes(visibility)) {
      return res.status(400).json({ success: false, message: 'visibility must be Private or Public' });
    }
    if (!['Minimal', 'Normal', 'Chatty'].includes(aiCoPilotLevel)) {
      return res.status(400).json({ success: false, message: 'Invalid AI Co-Pilot level' });
    }
    if (typeof sceneVotingEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'sceneVotingEnabled must be a boolean' });
    }

    const resolvedHostName = req.user.name;
    const resolvedHostAvatar = req.user.avatar || hostAvatar;
    const resolvedHostUserId = req.user._id;

    // Lookup movie if slug provided
    let movieData = {
      slug: movieSlug || 'dune',
      title: movieTitle || 'Dune',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      duration: '2h 35m',
      durationSeconds: 9300
    };

    if (movieSlug) {
      const foundMovie = await Movie.findOne({ slug: movieSlug });
      if (!foundMovie) {
        return res.status(404).json({ success: false, message: 'Selected title not found' });
      }
      movieData = {
        slug: foundMovie.slug,
        title: foundMovie.title,
        poster: foundMovie.poster,
        duration: foundMovie.duration,
        durationSeconds: foundMovie.durationSeconds
      };
    }

    const roomCode = generateRoomCode();

    const newSpace = await WatchSpace.create({
      code: roomCode,
      title: title.trim().slice(0, 100),
      movie: movieData,
      host: {
        userId: resolvedHostUserId,
        name: resolvedHostName,
        avatar: resolvedHostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
      },
      participants: [
        {
          userId: resolvedHostUserId,
          name: resolvedHostName,
          avatar: resolvedHostAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          role: 'Host',
          isReady: true,
          isOnline: true
        }
      ],
      visibility,
      maxParticipants: Number(maxParticipants),
      aiCoPilotLevel,
      sceneVotingEnabled,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        hostConnected: true
      },
      status: 'lobby'
    });

    res.status(201).json({
      success: true,
      message: 'Watch Space created successfully',
      space: newSpace
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get all Watch Spaces (for Admin Dashboard monitoring)
// @route   GET /api/spaces
// @access  Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const spaces = await WatchSpace.find({}).sort({ updatedAt: -1 });
    res.json({ success: true, count: spaces.length, spaces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get user's Watch Spaces (active, upcoming, past)
// @route   GET /api/spaces/user/my-spaces
// @access  Authenticated
router.get('/user/my-spaces', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? {}
      : { $or: [{ 'host.userId': req.user._id }, { 'participants.userId': req.user._id }] };

    const spaces = await WatchSpace.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, count: spaces.length, spaces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Alias for my-spaces
// @route   GET /api/spaces/my-spaces
// @access  Authenticated
router.get('/my-spaces', protect, async (req, res) => {
  try {
    const spaces = await WatchSpace.find(
      req.user.role === 'admin'
        ? {}
        : { $or: [{ 'host.userId': req.user._id }, { 'participants.userId': req.user._id }] }
    ).sort({ updatedAt: -1 });
    res.json({ success: true, count: spaces.length, spaces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get Watch Space details by code
// @route   GET /api/spaces/:code
// @access  Authenticated
router.get('/:code', protect, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const space = await WatchSpace.findOne({ code });

    if (!space) {
      return res.status(404).json({ success: false, message: `No Watch Space found with code: ${code}` });
    }

    const responseSpace = space.toObject();
    responseSpace.chatMessages = [];
    res.json({ success: true, space: responseSpace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Join a Watch Space by code
// @route   POST /api/spaces/:code/join
// @access  Authenticated
router.post('/:code/join', protect, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const avatar = req.user.avatar || req.body.avatar;

    const space = await WatchSpace.findOne({ code });
    if (!space) {
      return res.status(404).json({ success: false, message: 'Invalid room code' });
    }

    if (space.status === 'ended') {
      return res.status(400).json({ 
        success: false, 
        message: 'This Watch Space has already concluded. You can review its Session Summary in My Spaces.',
        isEnded: true
      });
    }

    const participantName = req.user.name;
    const existing = space.participants.find(
      p => String(p.userId || '') === String(req.user._id)
    );

    if (space.isLocked && !existing) {
      return res.status(403).json({
        success: false,
        message: 'This Watch Space is locked by the Host.'
      });
    }

    if (!existing && space.participants.filter(p => p.isOnline).length >= space.maxParticipants) {
      return res.status(409).json({ success: false, message: 'This Watch Space has reached its participant limit.' });
    }

    if (existing) {
      existing.userId = req.user._id;
      existing.name = participantName;
      existing.isOnline = true;
    } else {
      space.participants.push({
        userId: req.user._id,
        name: participantName,
        avatar: avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        role: 'Viewer',
        isReady: false,
        isOnline: true
      });
    }
    space.analytics = space.analytics || {};
    space.analytics.peakParticipants = Math.max(
      space.analytics.peakParticipants || 0,
      space.participants.filter(participant => participant.isOnline).length
    );
    await space.save();

    res.json({
      success: true,
      message: `Joined space ${code}`,
      space
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Delete / End Watch Space and its chat messages
// @route   DELETE /api/spaces/:code
// @access  Room Host or Admin
router.delete('/:code', protect, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const space = await WatchSpace.findOne({ code });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Watch Space not found.' });
    }

    const isHost = String(space.host.userId || '') === String(req.user._id);
    if (!isHost && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the Host can end this Watch Space.' });
    }

    const endedAt = new Date();
    await archiveSessionAnalytics(space, endedAt);
    if (req.query.purge === 'true') {
      await WatchSpace.deleteOne({ code });
    } else {
      space.status = 'ended';
      space.endedAt = endedAt;
      if (space.playbackState) {
        space.playbackState.isPlaying = false;
        space.playbackState.lastUpdated = endedAt;
      }
      await space.save();
    }

    res.json({
      success: true,
      message: `Watch Space ${code} concluded and archived to Past Spaces`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
