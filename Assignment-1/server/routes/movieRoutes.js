// routes/movieRoutes.js
// Movie catalog routes
const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const recommendationService = require('../services/recommendationService');
const { protect, optionalProtect, adminOnly } = require('../middleware/auth');

// @desc    Get all movies with optional search and category filters
// @route   GET /api/movies
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.genres = { $in: [new RegExp(category, 'i')] };
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const movies = await Movie.find(query).sort({ rating: -1 });
    res.json({ success: true, count: movies.length, movies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get recommendation rails — personalized when authenticated, else top-rated
//          Uses the hybrid recommendation engine (content-based + collaborative)
// @route   GET /api/movies/recommendations/rail
// @access  Public, with optional authentication
router.get('/recommendations/rail', optionalProtect, async (req, res) => {
  try {
    let recommendations = [];
    let method = 'top-rated-fallback';

    // Try to read token from header for personalized recommendations
    if (req.user) {
      const result = await recommendationService.getRecommendationsForUser(req.user._id, 5);
      recommendations = result.recommendations;
      method = result.method;
    }

    // Fallback: top-rated if no auth or no interactions yet
    if (recommendations.length === 0) {
      recommendations = await Movie.find({}).sort({ rating: -1 }).limit(5).lean();
      method = 'cold-start-top-rated';
    }

    // "More Like This" is always the top Sci-Fi/Action list for the front page
    const moreLikeThis = await Movie.find({ genres: { $in: ['Sci-Fi', 'Action'] } })
      .sort({ rating: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      recommendations,
      moreLikeThis,
      method
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get single movie by slug or ID
// @route   GET /api/movies/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const movie = await Movie.findOne({
      $or: [{ slug: param }, { _id: param.match(/^[0-9a-fA-F]{24}$/) ? param : null }]
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    res.json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Add new movie (Catalog Management) — Admin recommended
// @route   POST /api/movies
// @access  Admin
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.slug && data.title) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const existing = await Movie.findOne({ slug: data.slug });
      if (existing) {
        data.slug = `${data.slug}-${Date.now().toString().slice(-4)}`;
      }
    }
    if (!data.backdrop && data.poster) {
      data.backdrop = data.poster;
    }
    if (!data.category && Array.isArray(data.genres) && data.genres.length > 0) {
      data.category = data.genres[0];
    }
    const movie = await Movie.create(data);
    res.status(201).json({ success: true, movie });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Delete movie by slug or ID (Catalog Management)
// @route   DELETE /api/movies/:id
// @access  Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const param = req.params.id;
    const isObjectId = param.match(/^[0-9a-fA-F]{24}$/);
    const movie = await Movie.findOneAndDelete({
      $or: [{ slug: param }, { _id: isObjectId ? param : null }]
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    try {
      const TimelineEvent = require('../models/TimelineEvent');
      await TimelineEvent.deleteMany({ movieId: movie.slug });
    } catch {
      // Ignore if timeline events cleanup fails
    }

    res.json({ success: true, message: `Movie "${movie.title}" successfully deleted`, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
