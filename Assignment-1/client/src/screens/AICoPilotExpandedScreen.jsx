import React, { useState } from 'react';
import { Sparkles, Send, ArrowLeft, MessageSquare, BookOpen, Film, HelpCircle } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { aiAPI, spacesAPI } from '../services/api';

export default function AICoPilotExpandedScreen({ onNavigate, movie, roomCode }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const { data: spaceData } = useFetch(
    () => roomCode ? spacesAPI.getByCode(roomCode) : Promise.resolve(null),
    [roomCode]
  );
  const currentMovie = movie || spaceData?.space?.movie;

  const quickQuestions = [
    'What is this place?',
    'Who is that person?',
    'What happened earlier?',
    'Explain this scene',
    'Show me trivia'
  ];

  const handleSend = async (textToSend) => {
    const q = textToSend || inputVal;
    if (!q.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setRequestError('');
    setIsLoading(true);

    try {
      const movieId = currentMovie?.slug || currentMovie?.id || currentMovie?._id;
      if (!movieId) throw new Error('Select a catalog title before asking a title-specific question.');
      const currentTimestamp = spaceData?.space?.playbackState?.currentTime;
      const response = await aiAPI.ask({
        movieId,
        question: q,
        roomCode,
        currentTimestamp: Number.isFinite(currentTimestamp) ? currentTimestamp : 0
      });
      if (response?.success === false) throw new Error(response.message || 'The AI service could not answer this question.');
      const answer = response?.answer || response?.text || response?.data?.answer || response?.data?.text;
      if (!answer) throw new Error('The AI service returned no answer.');
      const reply = {
        id: Date.now() + 1,
        sender: 'ai',
        text: answer,
        source: response?.source || response?.data?.source || ''
      };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      setRequestError(err.message || 'AI request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-copilot-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="ai-copilot-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => onNavigate('watch-room')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to Player
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>AI Co-Pilot</h2>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {currentMovie?.title || 'No title selected'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chat History (Left) + Quick Questions (Right) */}
      <div className="ai-copilot-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', height: '620px' }}>
        {/* Left: Chat Container */}
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden'
        }}>
          {/* Messages List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingRight: '6px'
          }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {m.sender === 'user' ? (
                  <div style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    padding: '12px 18px',
                    borderRadius: '16px 16px 2px 16px',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {m.text}
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '16px 16px 16px 2px',
                    padding: '16px 20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Sparkles size={16} color="#a855f7" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>
                        AI Co-Pilot • Grounded Retrieval
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#f1f5f9', lineHeight: 1.55 }}>
                      {m.text}
                    </div>

                    {m.source && (
                      <div style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '0.75rem',
                        color: '#94a3b8'
                      }}>
                        Source: <span style={{ color: '#38bdf8' }}>{m.source}</span>
                      </div>
                    )}

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => handleSend('Explain this in more depth')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      >
                        Explain
                      </button>
                      <button
                        onClick={() => handleSend('Show me related trivia for this moment')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      >
                        Trivia
                      </button>
                      <button
                        onClick={() => handleSend('Tell me more without spoilers')}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      >
                        More
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && <p style={{ color: '#c084fc' }}>Waiting for the AI service…</p>}
            {requestError && <p role="alert" style={{ color: '#fca5a5' }}>{requestError}</p>}
          </div>

          {/* Prompt Input Form */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Ask a question about characters, lore, scene..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{ fontSize: '0.9rem', padding: '12px 16px' }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              className="btn btn-ai"
              style={{ padding: '0 20px' }}
              disabled={isLoading}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Right: Quick Questions & Grounded Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} color="#38bdf8" />
              Quick Questions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontSize: '0.82rem'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="#a855f7" />
              Knowledge Grounding
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 }}>
              All responses are strictly constrained to pre-authored timeline metadata for this title to avoid hallucinations and spoilers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
