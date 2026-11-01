// models/Analytics.js
// Session Analytics and Telemetry Schema
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    spaceCode: {
      type: String,
      required: true,
      index: true
    },
    movieTitle: {
      type: String,
      default: ''
    },
    totalWatchTime: {
      type: String,
      default: '0m 0s'
    },
    peakParticipants: {
      type: Number,
      default: 0
    },
    aiQuestionsCount: {
      type: Number,
      default: 0
    },
    triviaShownCount: {
      type: Number,
      default: 0
    },
    chatMessagesCount: {
      type: Number,
      default: 0
    },
    startedAt: Date,
    endedAt: Date,
    topQuestions: [
      {
        question: String,
        count: Number
      }
    ],
    syncMeasurements: {
      sampleCount: { type: Number, default: 0 },
      driftP95Ms: { type: Number, default: null },
      latencyP95Ms: { type: Number, default: null },
      driftTargetMs: { type: Number, default: 250 },
      targetMet: { type: Boolean, default: false },
      samples: [{
        driftMs: Number,
        latencyMs: Number,
        measuredAt: Date
      }]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Analytics', analyticsSchema);
