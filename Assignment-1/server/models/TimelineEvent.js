// models/TimelineEvent.js
// Timeline Metadata Schema used for Grounded AI Co-Pilot & In-Video Overlays
const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    movieId: {
      type: String, // Matches movie slug, e.g. 'dune'
      required: true,
      index: true
    },
    sourceId: {
      type: String,
      unique: true,
      default: () => `evt_${Math.random().toString(36).substring(2, 9)}`
    },
    timestampSeconds: {
      type: Number,
      required: true,
      index: true
    },
    timeFormatted: {
      type: String,
      default: function() {
        if (typeof this.timestampSeconds === 'number') {
          const h = Math.floor(this.timestampSeconds / 3600);
          const m = Math.floor((this.timestampSeconds % 3600) / 60);
          const s = Math.floor(this.timestampSeconds % 60);
          if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          }
          return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return '00:00:00';
      }
    },
    type: {
      type: String,
      enum: ['Trivia', 'Character', 'Glossary', 'Variation Point'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    metadata: {
      characterName: String,
      actorName: String,
      term: String,
      variationOptions: [mongoose.Schema.Types.Mixed],
      tags: [String]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
