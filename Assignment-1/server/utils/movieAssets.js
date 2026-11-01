const fs = require('fs/promises');
const path = require('path');

const MOVIE_ASSET_DIRECTORY = path.join(__dirname, '..', 'uploads', 'movies');
const MOVIE_ASSET_URL_PREFIX = '/uploads/movies/';
const POSTER_LIMIT_BYTES = 10 * 1024 * 1024;
const VIDEO_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

const IMAGE_FORMATS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};
const VIDEO_FORMATS = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function isAllowedMovieUpload(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMime = file.fieldname === 'poster'
    ? IMAGE_FORMATS[extension]
    : file.fieldname === 'video'
      ? VIDEO_FORMATS[extension]
      : null;
  return Boolean(expectedMime && file.mimetype.toLowerCase() === expectedMime);
}

async function hasValidFileSignature(file) {
  const handle = await fs.open(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    const extension = path.extname(file.originalname).toLowerCase();

    if (['.jpg', '.jpeg'].includes(extension)) {
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (extension === '.png') {
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (extension === '.webp') {
      return bytes.length >= 12 &&
        bytes.toString('ascii', 0, 4) === 'RIFF' &&
        bytes.toString('ascii', 8, 12) === 'WEBP';
    }
    if (extension === '.mp4') {
      return bytes.length >= 8 && bytes.toString('ascii', 4, 8) === 'ftyp';
    }
    if (extension === '.webm') {
      return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    }
    return false;
  } finally {
    await handle.close();
  }
}

module.exports = {
  IMAGE_FORMATS,
  MOVIE_ASSET_DIRECTORY,
  MOVIE_ASSET_URL_PREFIX,
  POSTER_LIMIT_BYTES,
  VIDEO_FORMATS,
  VIDEO_LIMIT_BYTES,
  hasValidFileSignature,
  isAllowedMovieUpload
};
