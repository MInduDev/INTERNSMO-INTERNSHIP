// Timeline-grounded Co-Pilot responses
const TimelineEvent = require('../models/TimelineEvent');
const LLM_API_KEY = process.env.LLM_API_KEY;

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'are', 'but', 'can', 'did', 'does', 'for', 'from',
  'has', 'have', 'how', 'into', 'its', 'not', 'that', 'the', 'their', 'then',
  'there', 'this', 'what', 'when', 'where', 'which', 'who', 'why', 'with'
]);

function tokenize(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g) || []
  );
}

class AIService {
  async askQuestion({ movieId, currentTimestamp = 0, question, coPilotLevel = 'Normal' }) {
    if (typeof question !== 'string' || !question.trim()) {
      throw new Error('Question is required');
    }
    if (!Number.isFinite(currentTimestamp) || currentTimestamp < 0) {
      throw new Error('A valid current timestamp is required');
    }
    if (typeof movieId !== 'string' || !movieId.trim()) {
      throw new Error('A movie ID is required');
    }

    const cleanQuestion = question.trim().slice(0, 500);
    const queryTerms = [...tokenize(cleanQuestion)].filter(term => !STOP_WORDS.has(term));
    const relevantEvents = await TimelineEvent.find({
      movieId: movieId.trim(),
      timestampSeconds: {
        $gte: Math.max(0, currentTimestamp - 180),
        $lte: currentTimestamp
      }
    }).sort({ timestampSeconds: 1 });

    const scoredEvents = relevantEvents.map(event => {
      const eventTerms = tokenize([
        event.content,
        event.metadata?.term,
        event.metadata?.characterName,
        event.metadata?.actorName,
        ...(event.metadata?.tags || [])
      ].join(' '));
      const matches = queryTerms.filter(term => eventTerms.has(term));
      return { event, matches: matches.length };
    });

    let selected = scoredEvents
      .filter(item => item.matches > 0)
      .sort((a, b) => b.matches - a.matches ||
        Math.abs(a.event.timestampSeconds - currentTimestamp) -
        Math.abs(b.event.timestampSeconds - currentTimestamp))
      .slice(0, 3);

    if (selected.length === 0) {
      const nearest = scoredEvents
        .filter(item => Math.abs(item.event.timestampSeconds - currentTimestamp) <= 30)
        .sort((a, b) => Math.abs(a.event.timestampSeconds - currentTimestamp) -
          Math.abs(b.event.timestampSeconds - currentTimestamp))[0];
      if (nearest) selected = [nearest];
    }

    const sourceEvents = selected.map(({ event }) => event.sourceId).filter(Boolean);
    const evidence = selected.map(({ event }) => ({
      sourceId: event.sourceId,
      timestamp: event.timeFormatted || formatTime(event.timestampSeconds),
      type: event.type,
      content: String(event.content || '').slice(0, 1200)
    }));
    let answer;
    let provider = 'timeline-extract';
    if (evidence.length && process.env.LLM_API_KEY && process.env.LLM_API_URL && process.env.LLM_MODEL) {
      answer = await this.generateGroundedAnswer(cleanQuestion, evidence);
      provider = 'llm';
    } else if (evidence.length) {
      answer = evidence
        .map(event => `[${event.timestamp}] ${event.type}: ${event.content}`)
        .join('\n');
    } else {
      answer = 'I do not have timeline evidence for this question in the current scene, so I cannot answer it reliably.';
    }

    const hasKeywordMatch = selected.some(item => item.matches > 0);
    return {
      question: cleanQuestion,
      answer,
      timestamp: currentTimestamp,
      timeFormatted: formatTime(currentTimestamp),
      sourceEvents,
      confidence: hasKeywordMatch ? (provider === 'llm' ? 0.9 : 0.8) : selected.length ? 0.4 : 0,
      coPilotLevel,
      provider
    };
  }

  async generateGroundedAnswer(question, evidence) {
    const endpoint = new URL(process.env.LLM_API_URL);
    if (!['http:', 'https:'].includes(endpoint.protocol)) {
      throw new Error('LLM_API_URL must use HTTP or HTTPS.');
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'Answer using only the supplied timeline evidence. If it does not support an answer, say so. Avoid spoilers after the latest supplied timestamp. Cite evidence with [sourceId]. Do not invent source IDs.'
          },
          {
            role: 'user',
            content: JSON.stringify({ question, evidence })
          }
        ]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM provider request failed (${response.status}): ${errorText.slice(0, 300)}`);
    }
    const payload = await response.json();
    const answer = payload.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error('LLM provider returned an empty answer.');
    }
    const cleanAnswer = answer.trim().slice(0, 4000);
    const allowedSources = new Set(evidence.map(event => event.sourceId));
    const citations = [...cleanAnswer.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
    if (citations.some(sourceId => !allowedSources.has(sourceId))) {
      throw new Error('LLM provider cited a timeline source that was not supplied.');
    }
    return cleanAnswer;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

module.exports = new AIService();
