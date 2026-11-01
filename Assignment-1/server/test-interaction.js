// test-interaction.js
// Quick sanity check for the new Interaction API & recommendation engine
const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({status: res.statusCode, body: JSON.parse(data)}); }
        catch(e) { resolve({status: res.statusCode, body: data}); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('🧪 Starting Interaction API tests...');
  // 1. Log in to get token
  const loginRes = await request({hostname:'localhost',port:5000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json'}}, {email:'rajat@watchspace.tv', password:'password123'});
  const token = loginRes.body.accessToken || loginRes.body.token;
  console.log('Login token received');

  // 2. Record a new interaction (simulate watching a new title)
  const interactRes = await request({hostname:'localhost',port:5000,path:'/api/interactions',method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}}, {
    titleId: 'inception',
    watchedSeconds: 3600,
    completed: false,
    rating: 4,
    coWatchedWith: [],
    watchSpaceCode: null
  });
  console.log('Interaction record status:', interactRes.status);

  // 3. Get personalized recommendations
  const recRes = await request({hostname:'localhost',port:5000,path:'/api/interactions/recommendations',method:'GET',headers:{'Authorization':`Bearer ${token}`}});
  console.log('Recommendations status:', recRes.status);
  console.log('Top recommendation titles:', recRes.body.recommendations.map(m=>m.title));
})();
