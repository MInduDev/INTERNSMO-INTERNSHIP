const Analytics = require('../models/Analytics');
const { summarizeSyncMeasurements, summarizeQuestions } = require('./analyticsMetrics');

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m ${remainingSeconds}s`;
}

async function archiveSessionAnalytics(space, endedAt = new Date()) {
  const playback = space.playbackState || {};
  const inProgressSeconds = playback.isPlaying && playback.lastUpdated
    ? Math.max(0, (endedAt.getTime() - new Date(playback.lastUpdated).getTime()) / 1000)
    : 0;
  const totalWatchSeconds = (space.analytics?.totalWatchSeconds || 0) + inProgressSeconds;
  space.analytics = space.analytics || {};
  space.analytics.totalWatchSeconds = totalWatchSeconds;

  return Analytics.findOneAndUpdate(
    { spaceCode: space.code },
    {
      $set: {
        spaceCode: space.code,
        movieTitle: space.movie?.title || '',
        totalWatchTime: formatDuration(totalWatchSeconds),
        peakParticipants: space.analytics?.peakParticipants || 0,
        aiQuestionsCount: space.analytics?.aiQuestionsCount || 0,
        triviaShownCount: space.analytics?.triviaShownCount || 0,
        chatMessagesCount: (space.chatMessages || []).filter(message => !message.isAi).length,
        topQuestions: summarizeQuestions(space.sessionQuestions || []),
        syncMeasurements: summarizeSyncMeasurements(space.analytics?.syncSamples || []),
        startedAt: space.startedAt || space.createdAt,
        endedAt
      }
    },
    { upsert: true, new: true }
  );
}

module.exports = { archiveSessionAnalytics };
