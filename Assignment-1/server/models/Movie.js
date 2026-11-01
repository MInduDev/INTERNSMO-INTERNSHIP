// models/Movie.js
// Movie catalog schema
const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Please add a movie title'],
      trim: true
    },
    year: {
      type: String,
      trim: true
    },
    genres: {
      type: [String],
      default: []
    },
    duration: {
      type: String,
      trim: true
    },
    durationSeconds: {
      type: Number
    },
    rating: {
      type: Number
    },
    votes: {
      type: String
    },
    director: {
      type: String,
      trim: true
    },
    cast: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      required: [true, 'Please add a movie synopsis/description']
    },
    poster: {
      type: String,
      required: true
    },
    backdrop: {
      type: String,
      required: true
    },
    category: {
      type: String,
      trim: true
    },
    videoAssetUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Movie', movieSchema);
