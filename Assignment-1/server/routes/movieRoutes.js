// routes/movieRoutes.js
// Movie catalog routes
const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const crypto = require('crypto');
const path = require('path');
const router = express.Router();
const Movie = require('../models/Movie');
const recommendationService = require('../services/recommendationService');
const { protect, optionalProtect, adminOnly } = require('../middleware/auth');
const {
  MOVIE_ASSET_DIRECTORY,
  MOVIE_ASSET_URL_PREFIX,
  POSTER_LIMIT_BYTES,
  VIDEO_LIMIT_BYTES,
  hasValidFileSignature,
  isAllowedMovieUpload
} = require('../utils/movieAssets');

const movieUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(MOVIE_ASSET_DIRECTORY, { recursive: true })
        .then(() => callback(null, MOVIE_ASSET_DIRECTORY))
        .catch(callback);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${file.fieldname}-${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: {
    fileSize: VIDEO_LIMIT_BYTES,
    files: 2
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedMovieUpload(file)) {
      return callback(new Error(file.fieldname === 'poster'
        ? 'Poster must be a JPEG, PNG, or WebP image.'
        : 'Movie file must be an MP4 or WebM video.'));
    }
    callback(null, true);
  }
});

async function removeUploadedFiles(files = []) {
  await Promise.all(files.map(file => fs.unlink(file.path).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  })));
}

function respondUploadError(res, error) {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Poster images are limited to 10 MB and movie videos to 2 GB.'
      : error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Upload one poster image and one movie video file.'
        : error.message;
    return res.status(400).json({ success: false, message });
  }
  return res.status(400).json({ success: false, message: error.message });
}

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
router.post('/', protect, adminOnly, (req, res) => {
  movieUpload.fields([{ name: 'poster', maxCount: 1 }, { name: 'video', maxCount: 1 }])(
    req,
    res,
    async uploadError => {
      const files = Object.values(req.files || {}).flat();
      if (uploadError) {
        await removeUploadedFiles(files);
        return respondUploadError(res, uploadError);
      }

      try {
        const poster = req.files?.poster?.[0];
        const video = req.files?.video?.[0];
        if (!poster || !video) {
          await removeUploadedFiles(files);
          return res.status(400).json({
            success: false,
            message: 'Choose both a poster image and an MP4 or WebM movie file.'
          });
        }
        if (poster.size > POSTER_LIMIT_BYTES) {
          await removeUploadedFiles(files);
          return res.status(400).json({ success: false, message: 'Poster images must be 10 MB or smaller.' });
        }
        if (req.body.poster || req.body.videoAssetUrl) {
          await removeUploadedFiles(files);
          return res.status(400).json({ success: false, message: 'Poster and movie must be uploaded as files, not URLs.' });
        }
        if (!(await hasValidFileSignature(poster)) || !(await hasValidFileSignature(video))) {
          await removeUploadedFiles(files);
          return res.status(400).json({ success: false, message: 'One or more uploaded files do not match their file type.' });
        }

        const data = { ...req.body };
        data.genres = typeof data.genres === 'string' ? JSON.parse(data.genres) : data.genres;
        data.cast = typeof data.cast === 'string' ? JSON.parse(data.cast) : data.cast;
        data.poster = `${MOVIE_ASSET_URL_PREFIX}${path.basename(poster.path)}`;
        data.backdrop = data.poster;
        data.videoAssetUrl = `${MOVIE_ASSET_URL_PREFIX}${path.basename(video.path)}`;
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
        if (!data.category && Array.isArray(data.genres) && data.genres.length > 0) {
          data.category = data.genres[0];
        }
        if (data.rating !== undefined) data.rating = Number(data.rating);
        const movie = await Movie.create(data);
        return res.status(201).json({ success: true, movie });
      } catch (error) {
        await removeUploadedFiles(files);
        return res.status(400).json({ success: false, message: error.message });
      }
    }
  );
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

    const assetNames = [movie.poster, movie.videoAssetUrl]
      .filter(value => typeof value === 'string' && value.startsWith(MOVIE_ASSET_URL_PREFIX))
      .map(value => path.basename(value));
    await Promise.all(assetNames.map(filename => (
      /^[a-z]+-[a-f0-9-]+\.(?:jpg|jpeg|png|webp|mp4|webm)$/i.test(filename)
        ? fs.unlink(path.join(MOVIE_ASSET_DIRECTORY, filename)).catch(error => {
            if (error.code !== 'ENOENT') throw error;
          })
        : Promise.resolve()
    )));

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
