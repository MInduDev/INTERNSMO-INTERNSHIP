import React, { useState } from 'react';
import { Clock, Users, HelpCircle, Sparkles, MessageSquare, ArrowLeft, Activity } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { analyticsAPI } from '../services/api';

export default function AnalyticsScreen({ onNavigate, roomCode, movie }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const code = roomCode || '';
  
  const { data: rawData, loading: analyticsLoading } = useFetch(
    () => code ? analyticsAPI.getSessionAnalytics(code) : Promise.resolve(null),
    [code]
  );

  const stats = rawData?.analytics || {};
  const hasAnalytics = Boolean(rawData?.success && rawData.analytics);
  const movieTitle = movie?.title || stats.movieTitle || 'Not available';
  const watchTime = hasAnalytics ? (stats.totalWatchTime || '0m 0s') : '—';
  const totalRuntime = movie?.duration || 'Not available';
  const peakParticipants = hasAnalytics ? (stats.peakParticipants || 0) : '—';
  const aiQuestionsCount = hasAnalytics ? (stats.aiQuestionsCount ?? 0) : '—';
  const triviaShownCount = hasAnalytics ? (stats.triviaShownCount ?? 0) : '—';
  const chatMessagesCount = hasAnalytics ? (stats.chatMessagesCount ?? 0) : '—';
  const topQuestions = Array.isArray(stats.topQuestions) ? stats.topQuestions : [];
  const syncMeasurements = stats.syncMeasurements || {};
  const syncSamples = Array.isArray(syncMeasurements.samples) ? syncMeasurements.samples : [];
  const maxDrift = Math.max(250, ...syncSamples.map(sample => Math.abs(sample.driftMs || 0)));
  const driftChartPoints = syncSamples.map((sample, index) => {
    const x = syncSamples.length < 2 ? 300 : (index / (syncSamples.length - 1)) * 600;
    const y = 80 - ((sample.driftMs || 0) / maxDrift) * 60;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="analytics-screen" style={{ padding: '24px 36px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => onNavigate('my-spaces')}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to My Spaces
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-secondary btn-sm"
          >
            Return to Dashboard
          </button>
        </div>

        {(!code || (!analyticsLoading && !hasAnalytics)) && (
          <div role="status" style={{ marginBottom: '18px', color: '#fbbf24' }}>
            {code ? (rawData?.message || 'Session analytics are unavailable.') : 'Select a Watch Space to view its analytics.'}
          </div>
        )}

        <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Session Analytics & Telemetry</h2>
              <span className="badge badge-pill" style={{ fontFamily: 'var(--font-mono)' }}>Room: {code}</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
              Movie: <strong style={{ color: '#fff' }}>{movieTitle}</strong> • Total Runtime: {totalRuntime} • Peak Audience: {peakParticipants} Participants
            </div>
          </div>
          <span className="badge badge-ai" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <Sparkles size={13} /> Session telemetry
          </span>
        </div>
      </div>

      {/* 5 Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#38bdf8" /> Watch Time
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{watchTime}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Synchronized playback duration</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="#ff2a54" /> Peak Participants
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff2a54' }}>{peakParticipants}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Connected participants at session peak</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} color="#a855f7" /> AI Questions Asked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7' }}>{aiQuestionsCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Questions counted for this session</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#facc15" /> Trivia Triggers Shown
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#facc15' }}>{triviaShownCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Unique timeline events shown</div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} color="#34d399" /> Chat Messages Sent
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{chatMessagesCount}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Messages persisted for this session</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
        {['Overview', 'Audience Sync', 'Top AI Inquiries', 'Engagement Logs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === tab ? '#ffffff' : '#94a3b8',
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: '0.95rem',
              paddingBottom: '10px',
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Analytics Content: Chart (Left) + Top Questions (Right) */}
      <div className="analytics-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)', gap: '24px' }}>
        {/* Watch Time Trend Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#8b5cf6" /> Watch Time & Sync Stability Timeline
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {analyticsLoading ? 'Loading session metrics…' : `${syncMeasurements.sampleCount || 0} viewer samples`}
            </span>
          </div>

          <div role="status" style={{
            minHeight: '240px',
            padding: '24px',
            color: '#94a3b8',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '10px'
          }}>
            {syncSamples.length ? (
              <>
                <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                  Absolute drift p95: <strong>{syncMeasurements.driftP95Ms ?? '—'} ms</strong>
                  {' · '}Ping RTT p95: <strong>{syncMeasurements.latencyP95Ms ?? '—'} ms</strong>
                  {' · '}{syncMeasurements.targetMet ? 'Observed drift p95 is below 250 ms.' : 'Observed drift p95 is not below 250 ms.'}
                </div>
                <svg
                  viewBox="0 0 600 160"
                  role="img"
                  aria-label="Recent signed playback drift measurements in milliseconds"
                  style={{ display: 'block', width: '100%', maxHeight: '180px' }}
                >
                  <line x1="0" x2="600" y1="80" y2="80" stroke="rgba(148,163,184,0.4)" strokeDasharray="4 4" />
                  <polyline points={driftChartPoints} fill="none" stroke="#38bdf8" strokeWidth="2" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '8px' }}>
                  <span>{new Date(syncSamples[0].measuredAt).toLocaleTimeString()}</span>
                  <span>Signed playback drift (ms) · latest {syncSamples.length} samples</span>
                  <span>{new Date(syncSamples.at(-1).measuredAt).toLocaleTimeString()}</span>
                </div>
              </>
            ) : (
              <div style={{ minHeight: '192px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                No viewer sync samples have been collected for this session yet. Keep the Watch Space open with viewers connected to collect measurements.
              </div>
            )}
          </div>
        </div>

        {/* Top Questions List */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={16} color="#a855f7" />
            Top AI Co-Pilot Inquiries
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topQuestions.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                No AI questions have been recorded for this session yet.
              </p>
            )}
            {topQuestions.map((q, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ color: '#a855f7', fontWeight: 700 }}>{idx + 1}.</span>
                  <span style={{ lineHeight: 1.4 }}>{q.question}</span>
                </div>
                <span className="badge badge-pill" style={{ fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                  {q.count} times
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
