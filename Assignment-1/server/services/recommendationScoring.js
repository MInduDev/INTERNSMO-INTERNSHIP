function buildUserSignals(interactions) {
  const genreAffinityMap = {};
  const alreadyWatched = new Set();

  for (const interaction of interactions) {
    alreadyWatched.add(interaction.titleId);
    for (const genre of interaction.genresWatched || []) {
      if (!genreAffinityMap[genre]) genreAffinityMap[genre] = 0;
      const completionScore = interaction.watchedSeconds > 0
        ? Math.min(interaction.watchedSeconds / 7200, 1)
        : 0;
      const ratingBoost = interaction.rating ? interaction.rating / 5 : 0.5;
      genreAffinityMap[genre] += completionScore + ratingBoost;
    }
  }
  return { genreAffinityMap, alreadyWatched };
}

function scoreCandidate(movie, interactions, genreAffinityMap, collaborativeMovieSlugs) {
  if (interactions.some(item => item.titleId === movie.slug && item.completed)) return null;
  let score = 0;
  for (const genre of movie.genres || []) {
    if (genreAffinityMap[genre]) score += genreAffinityMap[genre] * 2;
  }
  if (collaborativeMovieSlugs.has(movie.slug)) score += 3;
  score += ((Number(movie.rating) || 0) / 10) * 2;
  if (interactions.some(item => item.titleId === movie.slug && !item.completed)) score += 1.5;
  return { movie, score: Math.round(score * 100) / 100 };
}

function precisionAtK(recommendedSlugs, relevantSlugs, k = 5) {
  if (!Number.isInteger(k) || k < 1) throw new Error('k must be a positive integer.');
  const relevant = new Set(relevantSlugs);
  const hits = recommendedSlugs.slice(0, k).filter(slug => relevant.has(slug)).length;
  return hits / k;
}

module.exports = { buildUserSignals, scoreCandidate, precisionAtK };
