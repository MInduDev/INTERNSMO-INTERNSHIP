// models/WatchSpace.js
// Watch Space schema for synchronized viewing
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['Host', 'Viewer', 'Invited'],
    default: 'Viewer'
  },
  isReady: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const watchSpaceSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    movie: {
      slug: { type: String, required: true },
      title: { type: String, required: true },
      poster: String,
      duration: String,
      durationSeconds: Number
    },
    host: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      avatar: String
    },
    participants: [participantSchema],
    visibility: {
      type: String,
      enum: ['Public', 'Private'],
      default: 'Private'
    },
    maxParticipants: {
      type: Number,
      min: 2,
      max: 50,
      default: 50
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    aiCoPilotLevel: {
      type: String,
      enum: ['Minimal', 'Normal', 'Chatty'],
      default: 'Normal'
    },
    sceneVotingEnabled: {
      type: Boolean,
      default: true
    },
    playbackState: {
      isPlaying: {
        type: Boolean,
        default: false
      },
      currentTime: {
        type: Number,
        default: 0
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      hostConnected: {
        type: Boolean,
        default: true
      }
    },
    activeVariationVote: {
      active: {
        type: Boolean,
        default: false
      },
      variationId: String,
      question: String,
      options: [mongoose.Schema.Types.Mixed],
      votesByParticipant: {
        type: Map,
        of: String,
        default: {}
      },
      winningOption: mongoose.Schema.Types.Mixed,
      votes: {
        type: Map,
        of: Number,
        default: {}
      },
      endsAt: Date
    },
    currentVariation: {
      variationId: String,
      option: String,
      optionId: String,
      videoUrl: String,
      audioUrl: String,
      subtitleUrl: String,
      language: String,
      assetType: String,
      youtubeCaptionLanguage: String,
      approved: Boolean,
      approvedBy: String,
      approvedAt: Date
    },
    chatMessages: [
      {
        senderName: String,
        senderAvatar: String,
        isAi: { type: Boolean, default: false },
        content: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],
    sessionQuestions: {
      type: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        question: { type: String, required: true, maxlength: 500 },
        sourceEvents: { type: [String], default: [] },
        askedAt: { type: Date, default: Date.now }
      }],
      default: []
    },
    status: {
      type: String,
      enum: ['lobby', 'active', 'ended'],
      default: 'lobby'
    },
    startedAt: Date,
    endedAt: Date,
    analytics: {
      peakParticipants: { type: Number, default: 1 },
      aiQuestionsCount: { type: Number, default: 0 },
      triviaShownCount: { type: Number, default: 0 },
      triviaShownIds: { type: [String], default: [] },
      totalWatchSeconds: { type: Number, default: 0 },
      syncSamples: {
        type: [{
          participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          driftMs: Number,
          latencyMs: Number,
          measuredAt: { type: Date, default: Date.now }
        }],
        default: []
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WatchSpace', watchSpaceSchema);
