const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const {
  MOVIE_ASSET_DIRECTORY,
  MOVIE_ASSET_URL_PREFIX
} = require('./utils/movieAssets');

const createdMovies = [];
const moviePath = require.resolve('./models/Movie');
require.cache[moviePath] = {
  id: moviePath,
  filename: moviePath,
  loaded: true,
  exports: {
    findOne: async () => null,
    create: async movie => {
      createdMovies.push(movie);
      return movie;
    }
  }
};

const authPath = require.resolve('./middleware/auth');
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    protect: (_req, _res, next) => next(),
    adminOnly: (_req, _res, next) => next(),
    optionalProtect: (_req, _res, next) => next()
  }
};

const movieRouter = require('./routes/movieRoutes');
const app = express();
app.use('/api/movies', movieRouter);
app.use('/uploads/movies', express.static(MOVIE_ASSET_DIRECTORY));

function createMovieForm({ poster = true, video = true, posterUrl = '' } = {}) {
  const formData = new FormData();
  formData.append('title', 'Uploaded Sample');
  formData.append('description', 'A test movie uploaded as files.');
  formData.append('genres', JSON.stringify(['Drama']));
  formData.append('cast', JSON.stringify(['Actor']));
  if (poster) {
    formData.append('poster', new Blob([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ], { type: 'image/png' }), 'poster.png');
  }
  if (video) {
    formData.append('video', new Blob([
      Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
    ], { type: 'video/mp4' }), 'movie.mp4');
  }
  if (posterUrl) formData.append('poster', posterUrl);
  return formData;
}

async function run() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const storedFiles = [];
  try {
    const response = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      body: createMovieForm()
    });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.match(result.movie.poster, new RegExp(`^${MOVIE_ASSET_URL_PREFIX}poster-[a-f0-9-]+\\.png$`));
    assert.match(result.movie.videoAssetUrl, new RegExp(`^${MOVIE_ASSET_URL_PREFIX}video-[a-f0-9-]+\\.mp4$`));
    assert.equal(result.movie.backdrop, result.movie.poster);
    assert.deepEqual(result.movie.genres, ['Drama']);

    for (const assetUrl of [result.movie.poster, result.movie.videoAssetUrl]) {
      storedFiles.push(path.basename(assetUrl));
      const assetResponse = await fetch(`${baseUrl}${assetUrl}`);
      assert.equal(assetResponse.status, 200);
      assert.ok((await assetResponse.arrayBuffer()).byteLength > 0);
    }

    const missingVideoResponse = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      body: createMovieForm({ video: false })
    });
    assert.equal(missingVideoResponse.status, 400);
    assert.match((await missingVideoResponse.json()).message, /Choose both a poster/);

    const urlResponse = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      body: createMovieForm({ posterUrl: 'https://example.com/poster.png' })
    });
    assert.equal(urlResponse.status, 400);
    assert.match((await urlResponse.json()).message, /uploaded as files, not URLs/);
    assert.equal(createdMovies.length, 1);
    console.log('Movie poster/video upload tests passed.');
  } finally {
    server.close();
    await Promise.all(storedFiles.map(filename => (
      fs.unlink(path.join(MOVIE_ASSET_DIRECTORY, filename)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      })
    )));
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
