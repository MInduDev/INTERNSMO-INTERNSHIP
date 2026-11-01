// routes/interactionRoutes.js
// PRD §7.2.1 & §6.3: Record, rate, and retrieve user watch interactions
// This is the data source that feeds the recommendation engine
const express = require('express');
const router = express.Router();
const Interaction = require('../models/Interaction');
const Movie = require('../models/Movie');
const { protect } = require('../middleware/auth');
const recommendationService = require('../services/recommendationService');

// Input sanitizer helper - prevent XSS / injection in string fields
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
}

// @desc    Record or update a watch interaction (PRD §7.2.1)
// @route   POST /api/interactions
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      titleId,
      watchedSeconds,
      completed,
      rating,
      coWatchedWith,
      watchSpaceCode
    } = req.body;

    // Validate inputs
    if (!titleId || typeof titleId !== 'string') {
      return res.status(400).json({ success: false, message: 'titleId is required' });
    }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Look up movie genres for genre-affinity scoring
    const movie = await Movie.findOne({ slug: sanitizeString(titleId, 100) }).lean();
    const genresWatched = movie ? movie.genres : [];

    // Upsert interaction — update if same user already has a record for this title
    const interaction = await Interaction.findOneAndUpdate(
      { userId: req.user._id, titleId: sanitizeString(titleId, 100) },
      {
        $set: {
          watchedSeconds: Number(watchedSeconds) || 0,
          completed: !!completed,
          genresWatched,
          watchSpaceCode: watchSpaceCode ? sanitizeString(watchSpaceCode, 20) : null
        },
        // Only update rating if explicitly provided
        ...(rating !== undefined ? { $set: { rating: Number(rating) } } : {}),
        // Merge co-watchers without duplicates
        $addToSet: {
          coWatchedWith: { $each: Array.isArray(coWatchedWith) ? coWatchedWith : [] }
        }
      },
      { upsert: true, new: true }
    );

    // Update user stats (watch time)
    const totalWatchedSeconds = await Interaction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$watchedSeconds' } } }
    ]);
    const totalSecs = totalWatchedSeconds[0]?.total || 0;
    const totalHrs = Math.floor(totalSecs / 3600);
    const totalMins = Math.floor((totalSecs % 3600) / 60);

    await require('../models/User').findByIdAndUpdate(req.user._id, {
      'stats.watchTime': `${totalHrs}h ${totalMins.toString().padStart(2, '0')}m`,
      $inc: { 'stats.watchSpaces': completed ? 1 : 0 }
    });

    res.status(201).json({
      success: true,
      message: 'Interaction recorded',
      interaction
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Rate a movie explicitly (1-5 stars)
// @route   POST /api/interactions/rate
// @access  Private
router.post('/rate', protect, async (req, res) => {
  try {
    const { titleId, rating } = req.body;

    if (!titleId) return res.status(400).json({ success: false, message: 'titleId is required' });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const interaction = await Interaction.findOneAndUpdate(
      { userId: req.user._id, titleId: sanitizeString(titleId, 100) },
      { $set: { rating: Number(rating) } },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Rating saved', interaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get personalized recommendations for the current user (PRD §6.3)
// @route   GET /api/interactions/recommendations
// @access  Private
router.get('/recommendations', protect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const result = await recommendationService.getRecommendationsForUser(req.user._id, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get "More Like This" rail for a given movie (content-based)
// @route   GET /api/interactions/more-like-this/:slug
// @access  Public
router.get('/more-like-this/:slug', async (req, res) => {
  try {
    const similar = await recommendationService.getMoreLikeThis(req.params.slug, 5);
    res.json({ success: true, movies: similar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get the current user's full interaction history
// @route   GET /api/interactions/my-history
// @access  Private
router.get('/my-history', protect, async (req, res) => {
  try {
    const history = await Interaction.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, count: history.length, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
