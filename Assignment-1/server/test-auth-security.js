const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-access-secret-for-unit-test-only';
process.env.REFRESH_SECRET = 'test-refresh-secret-for-unit-test-only';

const user = { _id: 'user-1', name: 'Tester', role: 'viewer' };
const userModelPath = require.resolve('./models/User');
require.cache[userModelPath] = {
  id: userModelPath,
  filename: userModelPath,
  loaded: true,
  exports: {
    findById: () => ({
      select: () => ({
        lean: async () => user,
        then: (resolve, reject) => Promise.resolve(user).then(resolve, reject)
      })
    })
  }
};

const { protect, adminOnly, socketAuthMiddleware } = require('./middleware/auth');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function run() {
  const missingResponse = responseRecorder();
  await protect({ headers: {} }, missingResponse, () => {});
  assert.equal(missingResponse.statusCode, 401);

  const expiredResponse = responseRecorder();
  await protect({
    headers: {
      authorization: `Bearer ${jwt.sign({ id: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: -1 })}`
    }
  }, expiredResponse, () => {});
  assert.equal(expiredResponse.statusCode, 401);

  const refreshAsAccessResponse = responseRecorder();
  await protect({
    headers: {
      authorization: `Bearer ${jwt.sign({ id: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`
    }
  }, refreshAsAccessResponse, () => {});
  assert.equal(refreshAsAccessResponse.statusCode, 401);

  const viewerResponse = responseRecorder();
  let viewerNextCalled = false;
  adminOnly({ user }, viewerResponse, () => { viewerNextCalled = true; });
  assert.equal(viewerNextCalled, false);
  assert.equal(viewerResponse.statusCode, 403);

  let socketError;
  await socketAuthMiddleware({ handshake: { auth: {} } }, error => { socketError = error; });
  assert.match(socketError.message, /Authentication required/);

  const accessToken = jwt.sign({ id: user._id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  let authorizedSocket;
  await socketAuthMiddleware({ handshake: { auth: { token: accessToken } } }, error => { authorizedSocket = error; });
  assert.equal(authorizedSocket, undefined);
  console.log('Authentication and RBAC tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
