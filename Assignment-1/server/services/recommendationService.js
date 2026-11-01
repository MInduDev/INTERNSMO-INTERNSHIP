// services/recommendationService.js
// PRD §6.3: Hybrid recommendation engine — content-based + collaborative filtering
// Trained on the Interaction collection that users generate through normal use & testing
const Interaction = require('../models/Interaction');
const Movie = require('../models/Movie');
const { buildUserSignals, scoreCandidate } = require('./recommendationScoring');

class RecommendationService {
  /**
   * Generate a ranked "Recommended for You" rail for a given user.
   * Uses a hybrid scoring approach:
   *   1. Content-based: genre affinity scores from the user's watch history
   *   2. Collaborative: what movies other users who co-watched with this user have rated highly
   *   3. Completion boost: titles with high completion rate are scored higher
   *
   * @param {string} userId  - MongoDB ObjectId of the user
   * @param {number} limit   - How many recommendations to return (default 5)
   */
  async getRecommendationsForUser(userId, limit = 5) {
    // --- STEP 1: Get user's full watch interaction history ---
    const userInteractions = await Interaction.find({ userId }).lean();

    // If user has no history at all, return top-rated movies as a cold-start fallback
    if (!userInteractions || userInteractions.length === 0) {
      const topRated = await Movie.find({}).sort({ rating: -1 }).limit(limit);
      return { recommendations: topRated, method: 'cold-start-top-rated', source: 'No interaction history' };
    }

    // --- STEP 2: Build genre affinity map from watch history ---
    // e.g. { 'Sci-Fi': 8.5, 'Action': 3.0, 'Drama': 2.0 }
    const { genreAffinityMap, alreadyWatched } = buildUserSignals(userInteractions);

    // --- STEP 3: Collaborative filtering — find co-watchers & their high-rated titles ---
    const coWatcherUserIds = userInteractions
      .flatMap(i => i.coWatchedWith || [])
      .filter(Boolean);

    const collaborativeMovieSlugs = new Set();

    if (coWatcherUserIds.length > 0) {
      // Find movies that co-watchers rated 4+ stars (but this user hasn't watched)
      const coWatcherInteractions = await Interaction.find({
        userId: { $in: coWatcherUserIds },
        rating: { $gte: 4 },
        titleId: { $nin: Array.from(alreadyWatched) }
      }).lean();

      for (const ci of coWatcherInteractions) {
        collaborativeMovieSlugs.add(ci.titleId);
      }
    }

    // --- STEP 4: Score all available movies ---
    const allMovies = await Movie.find({}).lean();
    const scoredMovies = allMovies
      .map(movie => scoreCandidate(movie, userInteractions, genreAffinityMap, collaborativeMovieSlugs))
      .filter(Boolean);

    // --- STEP 5: Sort by final score descending ---
    scoredMovies.sort((a, b) => b.score - a.score);

    const topMovies = scoredMovies.slice(0, limit).map(s => ({ ...s.movie, _recommendationScore: s.score }));

    return {
      recommendations: topMovies,
      method: 'hybrid-content-collaborative',
      genreAffinityUsed: genreAffinityMap,
      collaborativeSignals: collaborativeMovieSlugs.size
    };
  }

  /**
   * "More Like This" rail — content-based only, using current movie's genres
   * @param {string} movieSlug - slug of movie to find similar titles for
   * @param {number} limit     - how many results to return
   */
  async getMoreLikeThis(movieSlug, limit = 5) {
    const movie = await Movie.findOne({ slug: movieSlug }).lean();
    if (!movie) return [];

    // Find movies sharing at least 1 genre, exclude the source movie
    const similar = await Movie.find({
      slug: { $ne: movieSlug },
      genres: { $in: movie.genres }
    }).sort({ rating: -1 }).limit(limit).lean();

    return similar;
  }
}

module.exports = new RecommendationService();
