// routes/v1Routes.js
// Exact PRD Section 7.3 Specification Route Endpoints
const express = require('express');
const router = express.Router();
const WatchSpace = require('../models/WatchSpace');
const Movie = require('../models/Movie');
const TimelineEvent = require('../models/TimelineEvent');
const aiService = require('../services/aiService');
const { protect } = require('../middleware/auth');

// Helper to generate 6-character invite code (e.g. 'NX-4Q7K' or 'ABC123')
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// @desc    PRD Section 7.3.1: Create Watch Space
// @route   POST /api/v1/watch-spaces
router.post('/watch-spaces', protect, async (req, res) => {
  try {
    const { titleId, maxParticipants = 25, aiVerbosity = 'normal', votingEnabled = true } = req.body;
    if (typeof titleId !== 'string' || !titleId.trim()) {
      return res.status(400).json({ success: false, message: 'titleId is required' });
    }
    if (typeof votingEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'votingEnabled must be a boolean' });
    }
    const capacity = Number(maxParticipants);
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 50) {
      return res.status(400).json({ success: false, message: 'maxParticipants must be between 2 and 50' });
    }
    const normalizedVerbosity = String(aiVerbosity).toLowerCase();
    if (!['minimal', 'normal', 'chatty'].includes(normalizedVerbosity)) {
      return res.status(400).json({ success: false, message: 'Invalid AI verbosity level' });
    }

    // Lookup movie by titleId or default to dune
    const movie = await Movie.findOne({
      $or: [{ slug: titleId }, { _id: titleId?.match(/^[0-9a-fA-F]{24}$/) ? titleId : null }]
    });
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Title not found' });
    }

    const inviteCode = generateInviteCode();
    const newSpace = await WatchSpace.create({
      code: inviteCode,
      title: `${movie.title} Watch Space`,
      movie: {
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster,
        duration: movie.duration,
        durationSeconds: movie.durationSeconds
      },
      host: {
        userId: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar
      },
      participants: [
        {
          userId: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
          role: 'Host',
          isReady: true,
          isOnline: true
        }
      ],
      maxParticipants: capacity,
      aiCoPilotLevel: normalizedVerbosity.charAt(0).toUpperCase() + normalizedVerbosity.slice(1),
      sceneVotingEnabled: votingEnabled,
      status: 'lobby'
    });

    res.status(201).json({
      watchSpaceId: newSpace._id.toString(),
      inviteCode: newSpace.code,
      status: 'scheduled',
      hostUserId: req.user._id.toString(),
      createdAt: newSpace.createdAt.toISOString()
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    PRD Section 7.3.2: Get Timeline by Timestamp Range (?from={sec}&to={sec})
// @route   GET /api/v1/titles/:titleId/timeline
router.get('/titles/:titleId/timeline', async (req, res) => {
  try {
    const { titleId } = req.params;
    const fromSec = req.query.from === undefined ? 0 : Number(req.query.from);
    const toSec = req.query.to === undefined ? 999999 : Number(req.query.to);
    if (
      !Number.isFinite(fromSec) ||
      !Number.isFinite(toSec) ||
      fromSec < 0 ||
      toSec < fromSec ||
      toSec - fromSec > 86400
    ) {
      return res.status(400).json({ success: false, message: 'Provide a valid timeline range of at most 24 hours.' });
    }

    const query = {
      movieId: titleId,
      timestampSeconds: { $gte: fromSec, $lte: toSec }
    };

    const events = await TimelineEvent.find(query).sort({ timestampSeconds: 1 }).limit(1000);

    const formattedEvents = events.map(e => ({
      id: e._id,
      sourceId: e.sourceId,
      ts: e.timestampSeconds,
      timeFormatted: e.timeFormatted,
      type: e.type,
      text: e.content,
      metadata: e.metadata
    }));

    res.json({
      titleId,
      from: fromSec,
      to: toSec,
      events: formattedEvents
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    PRD Section 7.3.3: Submit natural-language question to AI Co-Pilot
// @route   POST /api/v1/watch-spaces/:id/ai/ask
router.post('/watch-spaces/:id/ai/ask', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentTs = 0, question } = req.body;

    if (typeof question !== 'string' || !question.trim() || question.length > 500) {
      return res.status(400).json({ success: false, message: 'Question must be between 1 and 500 characters' });
    }

    // Find watch space to know the movie being watched
    const space = await WatchSpace.findOne({
      $or: [{ code: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Watch Space not found' });
    }
    const isMember = String(space.host?.userId || '') === String(req.user._id) ||
      space.participants.some(participant => String(participant.userId || '') === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Join this Watch Space before using its AI Co-Pilot.' });
    }

    const movieId = space.movie.slug;
    const timestamp = Number(currentTs);
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      return res.status(400).json({ success: false, message: 'currentTs must be a non-negative number' });
    }

    const result = await aiService.askQuestion({
      movieId,
      currentTimestamp: timestamp,
      question: question.trim(),
      coPilotLevel: space.aiCoPilotLevel || 'Normal'
    });
    await WatchSpace.updateOne(
      { _id: space._id },
      {
        $inc: { 'analytics.aiQuestionsCount': 1 },
        $push: {
          sessionQuestions: {
            $each: [{
              userId: req.user._id,
              question: question.trim(),
              sourceEvents: result.sourceEvents,
              askedAt: new Date()
            }],
            $slice: -500
          }
        }
      }
    );

    res.json({
      answer: result.answer,
      sourceEvents: result.sourceEvents,
      generatedAt: new Date().toISOString(),
      confidence: result.confidence
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
