const assert = require('node:assert/strict');
const {
  buildUserSignals,
  scoreCandidate,
  precisionAtK
} = require('./services/recommendationScoring');

const history = [{
  titleId: 'watched',
  watchedSeconds: 3600,
  completed: false,
  rating: 4,
  genresWatched: ['Sci-Fi']
}];
const { genreAffinityMap } = buildUserSignals(history);
assert.equal(genreAffinityMap['Sci-Fi'], 1.3);
assert.equal(
  scoreCandidate({ slug: 'next', genres: ['Sci-Fi'], rating: 8 }, history, genreAffinityMap, new Set()).score,
  4.2
);
assert.equal(
  scoreCandidate({ slug: 'watched', genres: ['Sci-Fi'], rating: 8 }, [{ ...history[0], completed: true }], genreAffinityMap, new Set()),
  null
);
assert.equal(precisionAtK(['a', 'b', 'c', 'd', 'e'], ['a', 'c', 'f'], 5), 0.4);
console.log('Recommendation scoring and Precision@K tests passed.');
