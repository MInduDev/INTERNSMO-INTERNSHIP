const assert = require('node:assert/strict');

const events = [
  {
    movieId: 'inception',
    sourceId: 'evt-current',
    timestampSeconds: 100,
    timeFormatted: '01:40',
    type: 'Character',
    content: 'Ariadne studies the architecture of the dream.',
    metadata: { characterName: 'Ariadne' }
  },
  {
    movieId: 'inception',
    sourceId: 'evt-future',
    timestampSeconds: 150,
    timeFormatted: '02:30',
    type: 'Trivia',
    content: 'A future scene reveals a new location.',
    metadata: {}
  }
];

const timelinePath = require.resolve('./models/TimelineEvent');
require.cache[timelinePath] = {
  id: timelinePath,
  filename: timelinePath,
  loaded: true,
  exports: {
    find: filter => ({
      sort: async () => events.filter(event =>
        event.movieId === filter.movieId &&
        event.timestampSeconds >= filter.timestampSeconds.$gte &&
        event.timestampSeconds <= filter.timestampSeconds.$lte
      )
    })
  }
};

async function run() {
  const aiService = require('./services/aiService');
  const grounded = await aiService.askQuestion({
    movieId: 'inception',
    currentTimestamp: 110,
    question: 'Who is Ariadne?'
  });
  assert.deepEqual(grounded.sourceEvents, ['evt-current']);
  assert.match(grounded.answer, /Ariadne studies the architecture/);
  assert.equal(grounded.sourceEvents.includes('evt-future'), false);

  const unsupported = await aiService.askQuestion({
    movieId: 'inception',
    currentTimestamp: 10,
    question: 'What is the hidden answer?'
  });
  assert.deepEqual(unsupported.sourceEvents, []);
  assert.equal(unsupported.confidence, 0);
  assert.match(unsupported.answer, /cannot answer it reliably/);
  console.log('AI timeline grounding tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
