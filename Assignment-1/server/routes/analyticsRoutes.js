// Session & Viewer Analytics Routes
const express = require('express');
const router = express.Router();
const WatchSpace = require('../models/WatchSpace');
const { protect } = require('../middleware/auth');
const { summarizeSyncMeasurements, summarizeQuestions } = require('../services/analyticsMetrics');

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m ${remainingSeconds}s`;
}

function sessionDurationSeconds(space) {
  const playback = space.playbackState || {};
  const activePlaybackSeconds = playback.isPlaying && playback.lastUpdated
    ? Math.max(0, (Date.now() - new Date(playback.lastUpdated).getTime()) / 1000)
    : 0;
  return Math.max(0, (space.analytics?.totalWatchSeconds || 0) + activePlaybackSeconds);
}

// @desc Get analytics for a Watch Space the requester belongs to
// @route GET /api/analytics/:spaceCode
router.get('/:spaceCode', protect, async (req, res) => {
  try {
    const cleanCode = (req.params.spaceCode || '').trim().toUpperCase();
    const space = await WatchSpace.findOne({ code: cleanCode });
    if (!space) {
      return res.status(404).json({ success: false, message: 'Watch Space not found' });
    }

    const isMember = req.user.role === 'admin' ||
      String(space.host?.userId || '') === String(req.user._id) ||
      space.participants.some(participant => String(participant.userId || '') === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied for this Watch Space analytics.' });
    }

    const chatMessagesCount = (space.chatMessages || []).filter(message => !message.isAi).length;
    const topQuestions = summarizeQuestions(space.sessionQuestions || []);
    const analytics = {
      spaceCode: cleanCode,
      movieTitle: space.movie?.title || '',
      totalWatchTime: formatDuration(sessionDurationSeconds(space)),
      peakParticipants: space.analytics?.peakParticipants || 0,
      aiQuestionsCount: space.analytics?.aiQuestionsCount || 0,
      triviaShownCount: space.analytics?.triviaShownCount || 0,
      chatMessagesCount,
      topQuestions,
      syncMeasurements: summarizeSyncMeasurements(space.analytics?.syncSamples || []),
      startedAt: space.startedAt || null,
      endedAt: space.endedAt || null
    };

    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc Get analytics summary for the authenticated viewer
// @route GET /api/analytics/dashboard/summary
router.get('/dashboard/summary', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? {}
      : { $or: [{ 'host.userId': req.user._id }, { 'participants.userId': req.user._id }] };
    const spaces = await WatchSpace.find(query)
      .select('startedAt endedAt analytics movie playbackState')
      .lean();
    const totalSeconds = spaces.reduce((total, space) => total + sessionDurationSeconds(space), 0);
    const aiQuestionsAsked = spaces.reduce((total, space) => (
      total + (space.analytics?.aiQuestionsCount || 0)
    ), 0);

    res.json({
      success: true,
      summary: {
        totalWatchTime: formatDuration(totalSeconds),
        spacesJoined: spaces.length,
        aiQuestionsAsked,
        favoriteGenre: req.user.genres?.[0] || 'Not enough data'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
