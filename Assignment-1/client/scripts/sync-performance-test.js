import { io } from 'socket.io-client';
import { performance } from 'node:perf_hooks';

const socketUrl = process.env.TEST_SOCKET_URL || 'http://localhost:5000';
const roomCode = process.env.TEST_ROOM_CODE;
const hostToken = process.env.TEST_HOST_TOKEN;
const viewerTokens = (process.env.TEST_VIEWER_TOKENS || '').split(',').map(token => token.trim()).filter(Boolean);
const sampleCount = Math.min(Math.max(Number(process.env.SYNC_SAMPLE_COUNT) || 40, 5), 500);
const targetMs = Number(process.env.SYNC_TARGET_MS) || 250;

if (!roomCode || !hostToken || viewerTokens.length === 0) {
  throw new Error('Set TEST_ROOM_CODE, TEST_HOST_TOKEN, and comma-separated TEST_VIEWER_TOKENS for existing room members.');
}

function waitFor(event, socket, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for socket ${event}.`)), timeoutMs);
    socket.once(event, value => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function percentile(samples, value) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(value * sorted.length) - 1] * 100) / 100;
}

async function connectMember(token) {
  const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
  await waitFor('connect', socket);
  const joined = waitFor('initial-sync-state', socket);
  socket.emit('join-room', { roomCode });
  await joined;
  return socket;
}

async function run() {
  const sockets = [];
  try {
    const host = await connectMember(hostToken);
    sockets.push(host);
    const viewers = [];
    for (const token of viewerTokens) {
      const viewer = await connectMember(token);
      sockets.push(viewer);
      viewers.push(viewer);
    }

    const pending = new Map();
    const samples = [];
    for (const viewer of viewers) {
      viewer.on('sync-heartbeat', ({ measurementId } = {}) => {
        const startedAt = pending.get(measurementId);
        if (startedAt !== undefined) samples.push(performance.now() - startedAt);
      });
    }

    for (let index = 0; index < sampleCount; index += 1) {
      const measurementId = `perf-${index}-${Date.now()}`;
      pending.set(measurementId, performance.now());
      host.emit('playback-heartbeat', {
        position: index,
        isPlaying: true,
        measurementId
      });
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    const p95Ms = percentile(samples, 0.95);
    console.log(JSON.stringify({
      test: 'Socket host-heartbeat to viewer delivery latency',
      roomCode,
      viewerCount: viewers.length,
      requestedHeartbeats: sampleCount,
      deliveredSamples: samples.length,
      p50Ms: percentile(samples, 0.5),
      p95Ms,
      maxMs: samples.length ? Math.round(Math.max(...samples) * 100) / 100 : null,
      targetMs,
      targetMet: p95Ms !== null && p95Ms < targetMs,
      limitation: 'Same-process Socket.IO client benchmark; not a representative browser or cross-network SLA test.'
    }, null, 2));
    if (!samples.length) throw new Error('No heartbeat samples reached the connected viewer clients.');
  } finally {
    sockets.forEach(socket => socket.disconnect());
  }
}

run().catch(error => {
  console.error(`Socket performance test failed: ${error.message}`);
  process.exitCode = 1;
});
