const assert = require('node:assert/strict');
const { transitionPlaybackState } = require('./services/playbackStateMachine');

const start = new Date('2026-10-31T00:00:00.000Z');
const afterTenSeconds = new Date('2026-10-31T00:00:10.000Z');

const initialPlay = transitionPlaybackState(
  { isPlaying: false, currentTime: 0 },
  'play',
  12,
  start
);
assert.deepEqual(initialPlay, {
  playbackState: { isPlaying: true, currentTime: 12, lastUpdated: start },
  elapsedPlaybackSeconds: 0
});

const seekWhilePlaying = transitionPlaybackState(
  { isPlaying: true, currentTime: 12, lastUpdated: start },
  'seek',
  90,
  afterTenSeconds
);
assert.deepEqual(seekWhilePlaying, {
  playbackState: { isPlaying: true, currentTime: 90, lastUpdated: afterTenSeconds },
  elapsedPlaybackSeconds: 10
});

const pause = transitionPlaybackState(
  seekWhilePlaying.playbackState,
  'pause',
  95,
  new Date('2026-10-31T00:00:15.000Z')
);
assert.deepEqual(pause, {
  playbackState: {
    isPlaying: false,
    currentTime: 95,
    lastUpdated: new Date('2026-10-31T00:00:15.000Z')
  },
  elapsedPlaybackSeconds: 5
});

const seekWhilePaused = transitionPlaybackState(
  pause.playbackState,
  'seek',
  120,
  new Date('2026-10-31T00:00:20.000Z')
);
assert.equal(seekWhilePaused.playbackState.isPlaying, false);
assert.equal(seekWhilePaused.playbackState.currentTime, 120);
assert.equal(seekWhilePaused.elapsedPlaybackSeconds, 0);

const resume = transitionPlaybackState(
  seekWhilePaused.playbackState,
  'play',
  120,
  new Date('2026-10-31T00:00:25.000Z')
);
assert.equal(resume.playbackState.isPlaying, true);
assert.equal(resume.playbackState.currentTime, 120);
assert.equal(resume.elapsedPlaybackSeconds, 0);

const staleClock = transitionPlaybackState(
  { isPlaying: true, currentTime: 120, lastUpdated: afterTenSeconds },
  'pause',
  120,
  start
);
assert.equal(staleClock.elapsedPlaybackSeconds, 0);

for (const [state, position] of [
  ['stop', 0],
  ['play', -1],
  ['seek', NaN],
  ['pause', Infinity]
]) {
  assert.equal(transitionPlaybackState(initialPlay.playbackState, state, position, start), null);
}
assert.equal(transitionPlaybackState(initialPlay.playbackState, 'play', 0, new Date(NaN)), null);

console.log('Playback state-machine tests passed.');
