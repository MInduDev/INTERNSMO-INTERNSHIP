// routes/timelineRoutes.js
// Timeline Metadata & Admin Management Routes (Screen 17)
const express = require('express');
const router = express.Router();
const TimelineEvent = require('../models/TimelineEvent');
const { protect, adminOnly } = require('../middleware/auth');

function validateAssetUrl(value, extensions) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > 2000) {
    throw new Error('Variation asset URLs must be strings under 2000 characters.');
  }
  if (value.startsWith('/') && !value.startsWith('//')) {
    const path = value.split(/[?#]/, 1)[0].toLowerCase();
    if (extensions.some(extension => path.endsWith(extension))) return value;
    throw new Error(`Variation asset URL must end with ${extensions.join(' or ')}.`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch (_err) {
    throw new Error('Variation assets must use a valid HTTP(S) URL or a local absolute path.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) ||
      !extensions.some(extension => parsed.pathname.toLowerCase().endsWith(extension))) {
    throw new Error(`Variation asset URL must use HTTP(S) and end with ${extensions.join(' or ')}.`);
  }
  return value;
}

function normalizeMetadata(type, metadata) {
  const cleanMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : {};
  if (type !== 'Variation Point') return cleanMetadata;
  if (!Array.isArray(cleanMetadata.variationOptions) ||
      cleanMetadata.variationOptions.length < 2 ||
      cleanMetadata.variationOptions.length > 4) {
    throw new Error('Variation Points require between 2 and 4 pre-authored options.');
  }
  cleanMetadata.variationOptions = cleanMetadata.variationOptions.map((option, index) => {
    if (typeof option === 'string') {
      const label = option.trim().slice(0, 120);
      if (!label) throw new Error('Variation option labels cannot be empty.');
      return label;
    }
    if (!option || typeof option !== 'object' || Array.isArray(option)) {
      throw new Error('Variation options must be labels or asset configuration objects.');
    }
    const label = typeof option.label === 'string' ? option.label.trim().slice(0, 120) : '';
    if (!label) throw new Error('Each variation option requires a label.');
    return {
      id: typeof option.id === 'string' ? option.id.trim().slice(0, 80) || `opt-${index + 1}` : `opt-${index + 1}`,
      label,
      videoUrl: validateAssetUrl(option.videoUrl, ['.mp4', '.webm', '.mkv', '.ogv']),
      audioUrl: validateAssetUrl(option.audioUrl, ['.mp3', '.m4a', '.aac', '.ogg', '.wav']),
      subtitleUrl: validateAssetUrl(option.subtitleUrl, ['.vtt']),
      language: typeof option.language === 'string' ? option.language.trim().slice(0, 20) : ''
    };
  });
  return cleanMetadata;
}

// @desc    Get all timeline events for a movie
// @route   GET /api/timeline/:movieId
// @access  Public
router.get('/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const events = await TimelineEvent.find({ movieId }).sort({ timestampSeconds: 1 });
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Add a single timeline event
// @route   POST /api/timeline
// @access  Private / Admin
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { movieId, timestampSeconds, timeFormatted, type, content, metadata } = req.body;

    if (!movieId || timestampSeconds === undefined || !content || !type) {
      return res.status(400).json({ success: false, message: 'Please provide movieId, timestampSeconds, type, and content' });
    }

    // Auto-calculate timeFormatted if not provided
    const mins = Math.floor(timestampSeconds / 60);
    const secs = Math.floor(timestampSeconds % 60);
    const formatted = timeFormatted || `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const newEvent = await TimelineEvent.create({
      movieId,
      timestampSeconds,
      timeFormatted: formatted,
      type,
      content,
      metadata: normalizeMetadata(type, metadata)
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('timeline-events-updated', { movieId, event: newEvent, action: 'create' });
    }

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Delete a timeline event
// @route   DELETE /api/timeline/:id
// @access  Private / Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await TimelineEvent.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Timeline event not found' });
    }
    const io = req.app.get('io');
    if (io) {
      io.emit('timeline-events-updated', { movieId: event.movieId, eventId: req.params.id, action: 'delete' });
    }
    res.json({ success: true, message: 'Timeline event removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Bulk upload timeline events via JSON
// @route   POST /api/timeline/upload-json
// @access  Private / Admin
router.post('/upload-json', protect, adminOnly, async (req, res) => {
  try {
    const { movieId, events } = req.body;

    if (!movieId || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide movieId and an array of events' });
    }

    const formattedEvents = events.map(e => ({
      movieId,
      timestampSeconds: e.timestampSeconds || 0,
      timeFormatted: e.timeFormatted || '00:00:00',
      type: e.type || 'Trivia',
      content: e.content,
      metadata: normalizeMetadata(e.type || 'Trivia', e.metadata)
    }));

    const inserted = await TimelineEvent.insertMany(formattedEvents);

    const io = req.app.get('io');
    if (io) {
      io.emit('timeline-events-updated', { movieId, count: inserted.length, action: 'bulk-import' });
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} timeline events`,
      count: inserted.length,
      events: inserted
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
