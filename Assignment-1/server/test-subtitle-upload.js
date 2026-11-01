const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const { SUBTITLE_DIRECTORY } = require('./utils/subtitleAssets');

const authPath = require.resolve('./middleware/auth');
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    protect: (_req, _res, next) => next(),
    adminOnly: (_req, _res, next) => next()
  }
};

const timelineRouter = require('./routes/timelineRoutes');
const app = express();
app.use('/api/timeline', timelineRouter);
app.use('/uploads/subtitles', express.static(SUBTITLE_DIRECTORY, {
  setHeaders: (res) => res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
}));

async function run() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let uploadedUrl = '';
  try {
    const formData = new FormData();
    formData.append('subtitle', new Blob([
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nनमूना उपशीर्षक\n'
    ], { type: 'text/vtt' }), 'hindi.vtt');
    formData.append('language', 'hi');

    const uploadResponse = await fetch(`${baseUrl}/api/timeline/subtitle-assets`, {
      method: 'POST',
      body: formData
    });
    const uploadResult = await uploadResponse.json();
    assert.equal(uploadResponse.status, 201);
    assert.equal(uploadResult.success, true);
    assert.equal(uploadResult.asset.language, 'hi');
    uploadedUrl = uploadResult.asset.url;

    const assetResponse = await fetch(`${baseUrl}${uploadedUrl}`);
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get('content-type'), /text\/vtt/);
    assert.match(await assetResponse.text(), /नमूना उपशीर्षक/);

    const invalidFormData = new FormData();
    invalidFormData.append('subtitle', new Blob(['not WebVTT']), 'invalid.vtt');
    invalidFormData.append('language', 'hi');
    const invalidResponse = await fetch(`${baseUrl}/api/timeline/subtitle-assets`, {
      method: 'POST',
      body: invalidFormData
    });
    assert.equal(invalidResponse.status, 400);
    assert.match((await invalidResponse.json()).message, /valid WebVTT/);
    console.log('Subtitle upload and static-serving tests passed.');
  } finally {
    server.close();
    if (uploadedUrl) {
      await fs.unlink(path.join(SUBTITLE_DIRECTORY, path.basename(uploadedUrl)));
    }
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
