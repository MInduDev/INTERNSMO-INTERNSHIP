require('dotenv').config();
const fs = require('node:fs');
const mongoose = require('mongoose');
const recommendationService = require('./services/recommendationService');
const { precisionAtK } = require('./services/recommendationScoring');

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('Usage: node evaluate-recommendations.js <judgments.json>');
  }
  const judgments = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(judgments) || judgments.length === 0) {
    throw new Error('Judgments must be a non-empty JSON array.');
  }
  for (const judgment of judgments) {
    if (
      typeof judgment.userId !== 'string' ||
      !Array.isArray(judgment.relevantMovieSlugs) ||
      judgment.relevantMovieSlugs.some(slug => typeof slug !== 'string')
    ) {
      throw new Error('Each judgment requires userId and relevantMovieSlugs string array.');
    }
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to evaluate live recommendations.');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const k = 5;
    const results = [];
    for (const judgment of judgments) {
      const result = await recommendationService.getRecommendationsForUser(judgment.userId, k);
      const recommendedSlugs = result.recommendations.map(movie => movie.slug);
      results.push({
        userId: judgment.userId,
        precisionAt5: precisionAtK(recommendedSlugs, judgment.relevantMovieSlugs, k),
        recommendedCount: recommendedSlugs.length,
        relevantCount: judgment.relevantMovieSlugs.length
      });
    }
    const meanPrecisionAt5 = results.reduce((sum, item) => sum + item.precisionAt5, 0) / results.length;
    console.log(JSON.stringify({ evaluation: 'Precision@5', caseCount: results.length, meanPrecisionAt5, results }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(`Recommendation evaluation failed: ${error.message}`);
  process.exitCode = 1;
});
