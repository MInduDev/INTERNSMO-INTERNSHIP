// routes/aiRoutes.js
// Grounded AI Co-Pilot routes
// PRD §10.1: All user input must be validated and sanitized server-side
const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const WatchSpace = require('../models/WatchSpace');
const { protect } = require('../middleware/auth');

// Sanitize and validate question input
function sanitizeQuestion(q) {
  if (typeof q !== 'string') return '';
  return q.trim().replace(/<[^>]*>/g, '');
}

// @desc    Ask a question to AI Co-Pilot (Grounded in current timestamp)
// @route   POST /api/ai/ask
// @access  Authenticated
router.post('/ask', protect, async (req, res) => {
  try {
    const { movieId, currentTimestamp, coPilotLevel, roomCode } = req.body;

    // PRD §10.1: validate & sanitize AI question input
    const question = sanitizeQuestion(req.body.question);
    if (!question || question.length < 2) {
      return res.status(400).json({ success: false, message: 'Question must be at least 2 characters' });
    }
    if (question.length > 500) {
      return res.status(400).json({ success: false, message: 'Question must not exceed 500 characters' });
    }
    const timestamp = Number(currentTimestamp);
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      return res.status(400).json({ success: false, message: 'currentTimestamp must be a non-negative number' });
    }

    let space;
    if (roomCode) {
      space = await WatchSpace.findOne({ code: String(roomCode).toUpperCase() });
      if (!space) return res.status(404).json({ success: false, message: 'Watch Space not found' });
      const isMember = String(space.host?.userId || '') === String(req.user._id) ||
        space.participants.some(participant => String(participant.userId || '') === String(req.user._id));
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Join this Watch Space before using its AI Co-Pilot.' });
      }
    }

    const result = await aiService.askQuestion({
      movieId: sanitizeQuestion(space?.movie?.slug || movieId || 'dune').slice(0, 100),
      currentTimestamp: timestamp,
      question,
      coPilotLevel: coPilotLevel || 'Normal'
    });
    if (space) {
      await WatchSpace.updateOne(
        { _id: space._id },
        {
          $inc: { 'analytics.aiQuestionsCount': 1 },
          $push: {
            sessionQuestions: {
              $each: [{
                userId: req.user._id,
                question,
                sourceEvents: result.sourceEvents,
                askedAt: new Date()
              }],
              $slice: -500
            }
          }
        }
      );
    }

    res.json({ 
      success: true, 
      answer: result.answer,
      text: result.answer,
      source: result.sourceEvents[0] || null,
      ...result,
      data: result 
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Get quick suggested prompts for current timestamp
// @route   GET /api/ai/suggestions
// @access  Authenticated
router.get('/suggestions', (req, res) => {
  const suggestions = [
    'Who is that character on screen?',
    'What is the meaning of Spice Melange?',
    'Where was this scene filmed?',
    'Explain the political factions involved here',
    'Has this character appeared before?'
  ];
  res.json({ success: true, suggestions });
});

module.exports = router;
