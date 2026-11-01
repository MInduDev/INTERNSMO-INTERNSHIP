// models/Interaction.js
// PRD §7.2.1: Tracks user watch interactions for the recommendation engine
// "feeds the recommendation model training" — exact PRD words
const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    titleId: {
      // Stores the movie slug (e.g. 'dune') for easy lookup — same as Movie.slug
      type: String,
      required: true,
      index: true
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    rating: {
      // Optional explicit star rating (1–5), null if not rated
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    coWatchedWith: {
      // Array of userIds who were in the same Watch Space (for collaborative filtering)
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    watchSpaceCode: {
      // Which room this watch session came from
      type: String,
      default: null
    },
    genresWatched: {
      // Genres of the movie watched (denormalized for faster genre-affinity scoring)
      type: [String],
      default: []
    }
  },
  {
    timestamps: true  // createdAt = when this session started
  }
);

module.exports = mongoose.model('Interaction', interactionSchema);
