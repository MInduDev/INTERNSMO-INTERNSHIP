const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { SUBTITLE_DIRECTORY, SUBTITLE_URL_PREFIX, isValidWebVtt } = require('./utils/subtitleAssets');
const subtitleFilename = `${crypto.randomUUID()}.vtt`;
fs.mkdirSync(SUBTITLE_DIRECTORY, { recursive: true });
fs.writeFileSync(path.join(SUBTITLE_DIRECTORY, subtitleFilename), [
  'WEBVTT',
  '',
  '00:00:01.000 --> 00:00:02.500',
  'A sample subtitle cue.',
  ''
].join('\n'));
const authPath = require.resolve('./middleware/auth');
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: { protect: (_req, _res, next) => next(), adminOnly: (_req, _res, next) => next() }
};
const timelineRouter = require('./routes/timelineRoutes');

const normalizeMetadata = timelineRouter.normalizeMetadata;

const metadata = normalizeMetadata('Variation Point', {
  variationOptions: [
    {
      id: 'english',
      label: 'English subtitles',
      subtitleUrl: `${SUBTITLE_URL_PREFIX}${subtitleFilename}`,
      language: 'en',
      approved: false,
      approvedBy: 'viewer'
    },
    {
      id: 'youtube-spanish',
      label: 'Spanish YouTube captions',
      youtubeCaptionLanguage: 'es'
    }
  ]
}, { _id: 'admin-123' });

const approvedOption = metadata.variationOptions[0];
assert.equal(approvedOption.approved, true);
assert.equal(approvedOption.approvedBy, 'admin-123');
assert.ok(approvedOption.approvedAt instanceof Date);
assert.equal(approvedOption.assetType, 'subtitle');
assert.equal(approvedOption.subtitleUrl, `${SUBTITLE_URL_PREFIX}${subtitleFilename}`);
assert.equal(metadata.variationOptions[1].approved, undefined);
assert.equal(metadata.variationOptions[1].assetType, 'youtube-caption');
assert.equal(metadata.variationOptions[1].youtubeCaptionLanguage, 'es');
assert.equal(metadata.variationOptions[1].approvedBy, undefined);

assert.throws(
  () => normalizeMetadata('Variation Point', {
    variationOptions: [
      { label: 'Option A', subtitleUrl: 'https://cdn.example/arbitrary.vtt' },
      { label: 'Option B' }
    ]
  }, { _id: 'admin-123' }),
  /valid VTT uploaded by an admin/
);

assert.equal(isValidWebVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n'), true);
assert.equal(isValidWebVtt('not a subtitle file'), false);

assert.throws(
  () => normalizeMetadata('Variation Point', {
    variationOptions: [
      { label: 'Bad language', youtubeCaptionLanguage: 'english' },
      { label: 'Option B' }
    ]
  }, { _id: 'admin-123' }),
  /language code/
);

console.log('Timeline variation approval tests passed.');
fs.unlinkSync(path.join(SUBTITLE_DIRECTORY, subtitleFilename));
