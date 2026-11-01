const assert = require('node:assert/strict');

process.env.LLM_API_KEY = 'test-key';
process.env.LLM_API_URL = 'https://provider.test/v1/chat/completions';
process.env.LLM_MODEL = 'test-model';

const event = {
  movieId: 'inception',
  sourceId: 'timeline-1',
  timestampSeconds: 100,
  timeFormatted: '01:40',
  type: 'Character',
  content: 'Ariadne studies dream architecture.'
};

const timelinePath = require.resolve('./models/TimelineEvent');
require.cache[timelinePath] = {
  id: timelinePath,
  filename: timelinePath,
  loaded: true,
  exports: {
    find: () => ({ sort: async () => [event] })
  }
};

async function run() {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Ariadne studies the dream architecture [timeline-1].' } }]
      })
    };
  };

  try {
    const aiService = require('./services/aiService');
    const result = await aiService.askQuestion({
      movieId: 'inception',
      currentTimestamp: 110,
      question: 'Who is Ariadne?'
    });
    assert.equal(result.provider, 'llm');
    assert.equal(result.sourceEvents[0], 'timeline-1');
    assert.match(result.answer, /\[timeline-1\]/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, process.env.LLM_API_URL);
    assert.equal(JSON.parse(requests[0].options.body).model, process.env.LLM_MODEL);

    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Invented fact [unknown-source].' } }]
      })
    });
    await assert.rejects(
      aiService.askQuestion({
        movieId: 'inception',
        currentTimestamp: 110,
        question: 'Who is Ariadne?'
      }),
      /not supplied/
    );
    console.log('Configured AI provider tests passed.');
  } finally {
    global.fetch = originalFetch;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
