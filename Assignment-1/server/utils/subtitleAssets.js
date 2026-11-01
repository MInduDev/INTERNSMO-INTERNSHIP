const fs = require('fs');
const path = require('path');

const SUBTITLE_DIRECTORY = path.join(__dirname, '..', 'uploads', 'subtitles');
const SUBTITLE_URL_PREFIX = '/uploads/subtitles/';
const WEBVTT_TIMESTAMP = '(?:\\d{2,}:)?[0-5]\\d:[0-5]\\d\\.\\d{3}';

function isValidWebVtt(content) {
  if (typeof content !== 'string') return false;
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(normalized)) return false;
  const cuePattern = new RegExp(`(?:^|\\n)${WEBVTT_TIMESTAMP}\\s+-->\\s+${WEBVTT_TIMESTAMP}(?:\\s+[^\\n]*)?\\n`, 'm');
  return cuePattern.test(normalized);
}

function isApprovedSubtitleUrl(value) {
  if (typeof value !== 'string' || !value.startsWith(SUBTITLE_URL_PREFIX)) return false;
  const filename = value.slice(SUBTITLE_URL_PREFIX.length);
  if (!/^[a-f0-9-]+\.vtt$/i.test(filename) || path.basename(filename) !== filename) return false;
  return fs.existsSync(path.join(SUBTITLE_DIRECTORY, filename));
}

module.exports = {
  SUBTITLE_DIRECTORY,
  SUBTITLE_URL_PREFIX,
  isApprovedSubtitleUrl,
  isValidWebVtt
};
