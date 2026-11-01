function transitionPlaybackState(playbackState, state, positionSeconds, now = new Date()) {
  if (
    !['play', 'pause', 'seek'].includes(state) ||
    !Number.isFinite(positionSeconds) ||
    positionSeconds < 0 ||
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    return null;
  }

  const isPlaying = state === 'play'
    ? true
    : state === 'pause'
      ? false
      : Boolean(playbackState?.isPlaying);
  const lastUpdated = playbackState?.lastUpdated
    ? new Date(playbackState.lastUpdated).getTime()
    : NaN;
  const elapsedPlaybackSeconds = playbackState?.isPlaying && Number.isFinite(lastUpdated)
    ? Math.max(0, (now.getTime() - lastUpdated) / 1000)
    : 0;

  return {
    playbackState: {
      isPlaying,
      currentTime: positionSeconds,
      lastUpdated: now
    },
    elapsedPlaybackSeconds
  };
}

module.exports = { transitionPlaybackState };
