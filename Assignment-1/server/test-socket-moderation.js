const assert = require('node:assert/strict');

const space = {
  code: 'ROOM1',
  host: { name: 'Host', userId: 'host-id' },
  participants: [
    { _id: 'host-id', userId: 'host-id', name: 'Host', role: 'Host', isOnline: true, isMuted: false, socketId: null },
    { _id: 'viewer-id', userId: 'viewer-id', name: 'Viewer', role: 'Viewer', isOnline: true, isMuted: false, socketId: null }
  ],
  playbackState: { isPlaying: false, currentTime: 0, hostConnected: true },
  chatMessages: [],
  isLocked: false,
  maxParticipants: 2,
  sceneVotingEnabled: true,
  activeVariationVote: {},
  save: async function save() { return this; }
};

class FakeQuery {
  constructor(value) {
    this.value = value;
  }

  lean() {
    return Promise.resolve(this.value);
  }

  then(resolve, reject) {
    return Promise.resolve(this.value).then(resolve, reject);
  }
}

const fakeWatchSpace = {
  findOne: ({ code }) => new FakeQuery(code === space.code ? space : null),
  updateOne: async (filter, update) => {
    if (filter.code !== space.code) return { modifiedCount: 0 };
    if (filter.participants?.$elemMatch) {
      const { socketId, isMuted } = filter.participants.$elemMatch;
      const participant = space.participants.find(item => item.socketId === socketId);
      if (!participant || (isMuted?.$ne === true && participant.isMuted === true)) {
        return { modifiedCount: 0 };
      }
    }

    if (update.$push?.chatMessages) {
      space.chatMessages.push(update.$push.chatMessages);
    }
    if (update.$push?.['analytics.syncSamples']) {
      space.analytics = space.analytics || {};
      space.analytics.syncSamples = [...(space.analytics.syncSamples || []), ...update.$push['analytics.syncSamples'].$each];
    }
    for (const [path, value] of Object.entries(update.$set || update)) {
      if (!path.includes('.')) continue;
      const [parent, child] = path.split('.');
      space[parent][child] = value;
    }
    return { modifiedCount: 1 };
  },
  deleteOne: async () => ({ deletedCount: 1 })
};

const modelPath = require.resolve('./models/WatchSpace');
require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: fakeWatchSpace
};

const authPath = require.resolve('./middleware/auth');
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: { socketAuthMiddleware: (_socket, next) => next() }
};

const timelinePath = require.resolve('./models/TimelineEvent');
require.cache[timelinePath] = {
  id: timelinePath,
  filename: timelinePath,
  loaded: true,
  exports: {
    findOne: ({ sourceId }) => ({
      lean: async () => sourceId === 'variation-1'
        ? {
            movieId: 'test-movie',
            metadata: {
              variationOptions: [
                { id: 'director', label: 'Option A', videoUrl: 'https://cdn.example/a.mp4' },
                { id: 'alternate', label: 'Option B', subtitleUrl: 'https://cdn.example/b.vtt', language: 'en' }
              ]
            }
          }
        : null
    })
  }
};

class FakeSocket {
  constructor(id, name) {
    this.id = id;
    const userId = name === 'Host' ? 'host-id' : name === 'Viewer' ? 'viewer-id' : `${id}-user`;
    this.user = { _id: userId, name, authenticated: true };
    this.handlers = new Map();
    this.outgoing = [];
    this.rooms = new Set();
  }

  on(event, handler) {
    const listeners = this.handlers.get(event) || [];
    listeners.push(handler);
    this.handlers.set(event, listeners);
  }

  emit(event, payload) {
    this.outgoing.push({ event, payload });
  }

  async clientEmit(event, payload) {
    const listeners = this.handlers.get(event) || [];
    for (const listener of listeners) await listener(payload);
  }

  join(room) {
    this.rooms.add(room);
    global.io.addToRoom(room, this.id);
  }

  leave(room) {
    this.rooms.delete(room);
    global.io.removeFromRoom(room, this.id);
  }

  to(room) {
    return { emit: (event, payload) => global.io.broadcast(room, event, payload, this.id) };
  }
}

class FakeIO {
  constructor() {
    this.connectionHandler = null;
    this.roomMembers = new Map();
    this.sockets = { sockets: new Map(), adapter: { rooms: this.roomMembers } };
  }

  use() {}

  on(event, handler) {
    if (event === 'connection') this.connectionHandler = handler;
  }

  connect(socket) {
    this.sockets.sockets.set(socket.id, socket);
    this.connectionHandler(socket);
  }

  addToRoom(room, socketId) {
    const members = this.roomMembers.get(room) || new Set();
    members.add(socketId);
    this.roomMembers.set(room, members);
  }

  removeFromRoom(room, socketId) {
    this.roomMembers.get(room)?.delete(socketId);
  }

  broadcast(room, event, payload, excludedId) {
    for (const socketId of this.roomMembers.get(room) || []) {
      if (socketId !== excludedId) {
        this.sockets.sockets.get(socketId)?.emit(event, payload);
      }
    }
  }

  to(room) {
    return { emit: (event, payload) => this.broadcast(room, event, payload) };
  }
}

async function run() {
  const { initSocket } = require('./services/socketService');
  global.io = new FakeIO();
  initSocket(global.io);

  const host = new FakeSocket('host-socket', 'Host');
  const viewer = new FakeSocket('viewer-socket', 'Viewer');
  global.io.connect(host);
  global.io.connect(viewer);

  await host.clientEmit('join-room', { roomCode: space.code, user: { name: 'Host' } });
  await viewer.clientEmit('join-room', { roomCode: space.code, user: { name: 'Viewer' } });

  const playbackBeforeViewerRequest = { ...space.playbackState };
  await viewer.clientEmit('room.playback.update', {
    state: 'play',
    positionSeconds: 30,
    issuedBy: 'Viewer'
  });
  assert.deepEqual(space.playbackState, playbackBeforeViewerRequest);
  assert.equal(viewer.outgoing.some(event =>
    event.event === 'error' && event.payload.message === 'Only the Host can control playback'
  ), true);
  assert.equal(host.outgoing.some(event => event.event === 'room.playback.update'), false);

  await host.clientEmit('host-set-room-lock', { isLocked: true });
  assert.equal(space.isLocked, true);
  const rejectedJoin = new FakeSocket('new-socket', 'New Viewer');
  global.io.connect(rejectedJoin);
  await rejectedJoin.clientEmit('join-room', { roomCode: space.code, user: { name: 'New Viewer' } });
  assert.equal(rejectedJoin.outgoing.some(event => event.event === 'room-join-error'), true);
  assert.equal(rejectedJoin.rooms.has(space.code), false);

  await host.clientEmit('host-set-room-lock', { isLocked: false });
  const fullRoomJoin = new FakeSocket('full-room-socket', 'Full Room Viewer');
  global.io.connect(fullRoomJoin);
  await fullRoomJoin.clientEmit('join-room', { roomCode: space.code });
  assert.equal(fullRoomJoin.outgoing.some(event =>
    event.event === 'room-join-error' && /participant limit/.test(event.payload.message)
  ), true);
  assert.equal(space.participants.length, 2);

  await host.clientEmit('host-mute-participant', { targetName: 'Viewer', isMuted: true });
  assert.equal(space.participants.find(item => item.name === 'Viewer').isMuted, true);
  const historyCount = space.chatMessages.length;
  await viewer.clientEmit('send-chat-message', { content: 'blocked message' });
  assert.equal(space.chatMessages.length, historyCount);
  assert.equal(viewer.outgoing.some(event => event.event === 'chat-rejected'), true);

  await host.clientEmit('host-mute-participant', { targetName: 'Viewer', isMuted: false });
  await viewer.clientEmit('send-chat-message', { content: 'hello', senderName: 'spoofed name' });
  assert.equal(space.chatMessages.at(-1).senderName, 'Viewer');
  await viewer.clientEmit('typing-update', { isTyping: true });
  assert.equal(host.outgoing.some(event => event.event === 'typing-update'), true);
  await viewer.clientEmit('send-reaction', { emoji: '👏' });
  assert.equal(host.outgoing.some(event => event.event === 'new-reaction'), true);
  const reactionCount = host.outgoing.filter(event => event.event === 'new-reaction').length;
  await viewer.clientEmit('send-reaction', { emoji: 'not-an-emoji' });
  assert.equal(host.outgoing.filter(event => event.event === 'new-reaction').length, reactionCount);

  await host.clientEmit('host-transfer', { newHostName: 'Viewer' });
  assert.equal(space.host.name, 'Viewer');
  await host.clientEmit('host-set-room-lock', { isLocked: true });
  assert.equal(space.isLocked, false);
  await viewer.clientEmit('host-set-room-lock', { isLocked: true });
  assert.equal(space.isLocked, true);

  await host.clientEmit('room.variation.voteOpen', {
    variationId: 'variation-1',
    question: 'Choose a variation',
    options: ['Option A', 'Option B'],
    durationSeconds: 30
  });
  assert.equal(host.outgoing.some(event => event.event === 'error'), true);
  await viewer.clientEmit('room.variation.voteOpen', {
    variationId: 'variation-1',
    question: 'Choose a variation',
    durationSeconds: 30
  });
  await viewer.clientEmit('cast-variation-vote', { option: 'opt-2' });
  await viewer.clientEmit('cast-variation-vote', { option: 'opt-1' });
  assert.equal(viewer.outgoing.some(event => event.event === 'vote-rejected'), true);
  await host.clientEmit('cast-variation-vote', { option: 'opt-2' });
  await viewer.clientEmit('room.variation.voteClose');
  assert.equal(space.currentVariation.option, 'Option B');
  assert.equal(space.currentVariation.subtitleUrl, 'https://cdn.example/b.vtt');
  assert.equal(viewer.outgoing.some(event => event.event === 'room.variation.applied'), true);

  await viewer.clientEmit('room.sync.measurement', { driftMs: 120, latencyMs: 30 });
  assert.equal(space.analytics.syncSamples.length, 1);
  assert.equal(space.analytics.syncSamples[0].driftMs, 120);

  await viewer.clientEmit('room.playback.update', { state: 'play', positionSeconds: 30 });
  assert.equal(space.playbackState.isPlaying, true);
  assert.equal(space.playbackState.currentTime, 30);
  await viewer.clientEmit('room.playback.update', { state: 'seek', positionSeconds: 45 });
  assert.equal(space.playbackState.isPlaying, true);
  assert.equal(space.playbackState.currentTime, 45);
  await viewer.clientEmit('room.playback.update', { state: 'pause', positionSeconds: 45 });
  assert.equal(space.playbackState.isPlaying, false);
  await viewer.clientEmit('host-remove-participant', { targetName: 'Host' });
  assert.equal(space.participants.some(item => item.name === 'Host'), false);
  assert.equal(host.rooms.has(space.code), false);

  console.log('Socket moderation/chat tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
