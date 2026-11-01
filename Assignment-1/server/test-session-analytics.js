const assert = require('node:assert/strict');

let archived;
const analyticsPath = require.resolve('./models/Analytics');
require.cache[analyticsPath] = {
  id: analyticsPath,
  filename: analyticsPath,
  loaded: true,
  exports: {
    findOneAndUpdate: async (filter, update, options) => {
      archived = { filter, values: update.$set, options };
      return archived;
    }
  }
};

async function run() {
  const { archiveSessionAnalytics } = require('./services/sessionAnalyticsService');
  const endedAt = new Date('2026-01-01T00:03:00.000Z');
  const space = {
    code: 'ABC123',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    movie: { title: 'Test title' },
    playbackState: {
      isPlaying: true,
      lastUpdated: new Date('2026-01-01T00:01:00.000Z')
    },
    participants: [{}, {}],
    chatMessages: [{ isAi: false }, { isAi: true }],
    analytics: {
      totalWatchSeconds: 60,
      peakParticipants: 2,
      aiQuestionsCount: 3,
      triviaShownCount: 1,
      syncSamples: [
        { driftMs: -120, latencyMs: 35, measuredAt: new Date('2026-01-01T00:02:00.000Z') },
        { driftMs: 300, latencyMs: 50, measuredAt: new Date('2026-01-01T00:02:30.000Z') }
      ]
    },
    sessionQuestions: [
      { question: 'Who is Ariadne?' },
      { question: 'who is ariadne?' }
    ]
  };

  await archiveSessionAnalytics(space, endedAt);
  assert.equal(archived.filter.spaceCode, 'ABC123');
  assert.equal(archived.values.totalWatchTime, '3m 0s');
  assert.equal(archived.values.peakParticipants, 2);
  assert.equal(archived.values.aiQuestionsCount, 3);
  assert.equal(archived.values.triviaShownCount, 1);
  assert.equal(archived.values.chatMessagesCount, 1);
  assert.deepEqual(archived.values.topQuestions, [{ question: 'Who is Ariadne?', count: 2 }]);
  assert.equal(archived.values.syncMeasurements.sampleCount, 2);
  assert.equal(archived.values.syncMeasurements.driftP95Ms, 300);
  assert.equal(archived.values.syncMeasurements.latencyP95Ms, 50);
  assert.equal(archived.values.syncMeasurements.targetMet, false);
  assert.equal(space.analytics.totalWatchSeconds, 180);
  console.log('Session analytics reconciliation tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
