function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(percentileValue * sorted.length) - 1] * 100) / 100;
}

function summarizeSyncMeasurements(samples = []) {
  const driftMs = samples.map(sample => Math.abs(sample.driftMs)).filter(Number.isFinite);
  const latencyMs = samples.map(sample => sample.latencyMs).filter(Number.isFinite);
  return {
    sampleCount: samples.length,
    driftP95Ms: percentile(driftMs, 0.95),
    latencyP95Ms: percentile(latencyMs, 0.95),
    driftTargetMs: 250,
    targetMet: driftMs.length > 0 && percentile(driftMs, 0.95) < 250,
    samples: samples.slice(-100).map(sample => ({
      driftMs: sample.driftMs,
      latencyMs: sample.latencyMs,
      measuredAt: sample.measuredAt
    }))
  };
}

function summarizeQuestions(entries = []) {
  const questionCounts = new Map();
  for (const entry of entries) {
    const question = String(entry.question || '').trim();
    const key = question.toLowerCase();
    if (!key) continue;
    const current = questionCounts.get(key) || { question, count: 0 };
    current.count += 1;
    questionCounts.set(key, current);
  }
  return [...questionCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

module.exports = { summarizeSyncMeasurements, summarizeQuestions };
