// Smoke-test a running local API. Set TEST_EMAIL and TEST_PASSWORD to include authenticated checks.
const assert = require('node:assert/strict');
const http = require('node:http');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const base = new URL(BASE_URL);

function request(path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      hostname: base.hostname,
      port: base.port || 80,
      path,
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, response => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: response.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  const health = await request('/api/health');
  assert.equal(health.status, 200, 'health endpoint should be available');

  const movies = await request('/api/movies');
  assert.equal(movies.status, 200, 'movie catalog should be public');

  const timeline = await request('/api/timeline/dune');
  assert.equal(timeline.status, 200, 'title timeline should be public');

  const protectedSpace = await request('/api/spaces/ABC123');
  assert.equal(protectedSpace.status, 401, 'room details should require authentication');

  const protectedAI = await request('/api/ai/ask', {
    method: 'POST',
    body: { movieId: 'dune', currentTimestamp: 0, question: 'What is shown?' }
  });
  assert.equal(protectedAI.status, 401, 'AI questions should require authentication');

  const protectedAnalytics = await request('/api/analytics/ABC123');
  assert.equal(protectedAnalytics.status, 401, 'analytics should require authentication');

  if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }
    });
    assert.equal(login.status, 200, 'configured test account should sign in');
    assert.ok(login.body.accessToken, 'login should return an access token');
    assert.ok(login.body.refreshToken, 'login should return a refresh token');

    let roomCode;
    try {
      const refreshed = await request('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: login.body.refreshToken }
      });
      assert.equal(refreshed.status, 200, 'refresh token should issue a new access token');
      assert.ok(refreshed.body.accessToken, 'refresh response should include an access token');

      const profile = await request('/api/auth/me', { token: refreshed.body.accessToken });
      assert.equal(profile.status, 200, 'access token should authorize the profile endpoint');

      const created = await request('/api/spaces/create', {
        method: 'POST',
        token: refreshed.body.accessToken,
        body: { title: `API smoke ${Date.now()}`, sceneVotingEnabled: true }
      });
      assert.equal(created.status, 201, 'authenticated user should create a Watch Space');
      roomCode = created.body.space.code;
      assert.ok(roomCode, 'created room should include an invite code');

      const joined = await request(`/api/spaces/${roomCode}/join`, {
        method: 'POST',
        token: refreshed.body.accessToken,
        body: {}
      });
      assert.equal(joined.status, 200, 'Host should be able to join the created Watch Space');

      const room = await request(`/api/spaces/${roomCode}`, { token: refreshed.body.accessToken });
      assert.equal(room.status, 200, 'room details should be available to a member');

      const ai = await request('/api/ai/ask', {
        method: 'POST',
        token: refreshed.body.accessToken,
        body: {
          roomCode,
          movieId: room.body.space.movie.slug,
          currentTimestamp: 0,
          question: 'What scene evidence is available?'
        }
      });
      assert.equal(ai.status, 200, 'room member should be able to ask the AI Co-Pilot');

      const analytics = await request(`/api/analytics/${roomCode}`, { token: refreshed.body.accessToken });
      assert.equal(analytics.status, 200, 'room member should be able to read session analytics');
      assert.equal(analytics.body.analytics.aiQuestionsCount, 1, 'AI question should be counted in session analytics');
    } finally {
      if (roomCode) {
        const cleanup = await request(`/api/spaces/${roomCode}?purge=true`, {
          method: 'DELETE',
          token: login.body.accessToken
        });
        assert.equal(cleanup.status, 200, 'smoke-test room should be purged after the run');
      }
    }
  }

  console.log(
    process.env.TEST_EMAIL && process.env.TEST_PASSWORD
      ? 'Backend authenticated API workflow checks passed.'
      : 'Backend public/protection smoke checks passed; set TEST_EMAIL and TEST_PASSWORD to run the authenticated end-to-end workflow.'
  );
}

runTests().catch(error => {
  console.error('Backend API smoke checks failed:', error.message);
  process.exitCode = 1;
});
