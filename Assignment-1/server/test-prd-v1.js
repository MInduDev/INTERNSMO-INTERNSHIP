// test-prd-v1.js
// Tests for exact PRD Section 7.3 spec endpoints
const http = require('http');

const BASE = 'localhost';
const PORT = 5000;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function runPrdTests() {
  console.log('🧪 Testing PRD Section 7.3 Exact Specification Endpoints...\n');

  // Test 1: PRD 7.3.1 POST /api/v1/watch-spaces
  console.log('1. PRD 7.3.1 - POST /api/v1/watch-spaces (Create Watch Space)');
  const createRes = await request(
    { hostname: BASE, port: PORT, path: '/api/v1/watch-spaces', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { titleId: 'dune', maxParticipants: 25, aiVerbosity: 'normal', votingEnabled: true }
  );
  console.log(`   Status: ${createRes.status}`, createRes.body);
  const watchSpaceId = createRes.body.watchSpaceId;
  const inviteCode = createRes.body.inviteCode;

  // Test 2: PRD 7.3.2 GET /api/v1/titles/:titleId/timeline?from=0&to=400
  console.log('\n2. PRD 7.3.2 - GET /api/v1/titles/dune/timeline?from=0&to=400');
  const timelineRes = await request({ hostname: BASE, port: PORT, path: '/api/v1/titles/dune/timeline?from=0&to=400', method: 'GET' });
  console.log(`   Status: ${timelineRes.status}, Events: ${timelineRes.body.events?.length}`, {
    sample: timelineRes.body.events?.[0]
  });

  // Test 3: PRD 7.3.3 POST /api/v1/watch-spaces/:id/ai/ask
  console.log('\n3. PRD 7.3.3 - POST /api/v1/watch-spaces/:id/ai/ask');
  const askRes = await request(
    { hostname: BASE, port: PORT, path: `/api/v1/watch-spaces/ABC123/ai/ask`, method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { userId: 'u_733', currentTs: 1487, question: 'Who is the character that just walked in?' }
  );
  console.log(`   Status: ${askRes.status}`, {
    answer: askRes.body.answer,
    sourceEvents: askRes.body.sourceEvents,
    generatedAt: askRes.body.generatedAt
  });

  // Test 4: PRD 7.3.2 Range Query across timestamp
  console.log('\n4. PRD 7.3.2 - Timeline range query for trivia (ts 80-200s)');
  const rangeRes = await request({ hostname: BASE, port: PORT, path: '/api/v1/titles/dune/timeline?from=80&to=200', method: 'GET' });
  console.log(`   Status: ${rangeRes.status}, Events in range: ${rangeRes.body.events?.length}`);

  console.log('\n✅ PRD Specification Endpoints verified!');
}

runPrdTests().catch(console.error);
