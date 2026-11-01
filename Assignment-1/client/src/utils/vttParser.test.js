import test from 'node:test';
import assert from 'node:assert/strict';
import { findVttCue, parseVtt, parseVttTime } from './vttParser.js';

test('parses WebVTT timestamps with and without hours', () => {
  assert.equal(parseVttTime('01:02.500'), 62.5);
  assert.equal(parseVttTime('01:02:03.250'), 3723.25);
  assert.equal(parseVttTime('invalid'), null);
});

test('parses multiline cues and ignores cue identifiers', () => {
  const cues = parseVtt([
    'WEBVTT',
    '',
    'first-cue',
    '00:01.000 --> 00:03.500',
    'First line',
    'Second line',
    '',
    '00:04.000 --> 00:06.000',
    'Last cue'
  ].join('\n'));

  assert.deepEqual(cues, [
    { start: 1, end: 3.5, text: 'First line\nSecond line' },
    { start: 4, end: 6, text: 'Last cue' }
  ]);
});

test('rejects subtitle text without a WebVTT header', () => {
  assert.throws(() => parseVtt('00:01.000 --> 00:02.000\nCaption'), /WEBVTT header/);
});

test('selects cues using fractional playback seconds and an exclusive end time', () => {
  const cues = [
    { start: 1.25, end: 2.5, text: 'First' },
    { start: 2.5, end: 4, text: 'Second' }
  ];
  assert.equal(findVttCue(cues, 1.75).text, 'First');
  assert.equal(findVttCue(cues, 2.5).text, 'Second');
  assert.equal(findVttCue(cues, 4), null);
});
