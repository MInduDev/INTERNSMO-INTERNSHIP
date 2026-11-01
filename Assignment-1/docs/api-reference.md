# API reference

Base URL for local development: `http://localhost:5000`. The health check is
`GET /api/health`. JSON request bodies are used unless noted. Private REST
routes require `Authorization: Bearer <access-token>`; admin routes additionally
require the `admin` role. Errors generally use `{ "success": false, "message":
"..." }`, with status codes noted below. This reference describes the current
route handlers rather than a separate generated OpenAPI contract.

## Authentication

| Method and path | Access | Request | Result |
|---|---|---|---|
| `POST /api/auth/register` | Public | `{ name, email, password }` | `201`; access/refresh tokens and user profile. |
| `POST /api/auth/login` | Public | `{ email, password }` | Access/refresh tokens, `token` compatibility alias, and user profile. |
| `POST /api/auth/refresh` | Refresh token | `{ refreshToken }` | New access token and `token` alias. |
| `GET /api/auth/me` | User | — | Current authenticated user. |
| `PUT /api/auth/profile` | User | Any supported subset of `name`, `email`, `password`, `avatar`, `genres`, `subtitleLanguage` | Updated public profile. |
| `GET /api/auth/users` | Admin | — | User list with password fields excluded. |
| `PUT /api/auth/users/:id/role` | Admin | `{ role: "viewer" \| "host" \| "admin" }` | Updated user; prevents demoting the only remaining admin. |

Passwords must be 6–256 characters for registration. Access tokens last one
hour; refresh tokens last seven days.

## Catalogue and timeline

| Method and path | Access | Request | Result |
|---|---|---|---|
| `GET /api/movies` | Public | Optional `category`, `search` query | `{ success, count, movies }`, sorted by rating. |
| `GET /api/movies/recommendations/rail` | Public; optional access token | — | `{ success, recommendations, moreLikeThis, method }`. |
| `GET /api/movies/:id` | Public | Movie slug or Mongo ID | `{ success, movie }`; `404` when absent. |
| `POST /api/movies` | Admin | Movie fields from `Movie` schema | `201` `{ success, movie }`. Slug/backdrop/category have defaults when omitted where possible. |
| `DELETE /api/movies/:id` | Admin | Movie slug or Mongo ID | Deletes title and attempts timeline cleanup. |
| `GET /api/timeline/:movieId` | Public | Movie slug | `{ success, count, events }`, ascending by timestamp. |
| `POST /api/timeline` | Admin | `{ movieId, timestampSeconds, timeFormatted?, type, content, metadata? }` | `201` event; variation points require 2–4 valid pre-authored options. |
| `DELETE /api/timeline/:id` | Admin | Timeline document ID | Deletes event and notifies connected clients. |
| `POST /api/timeline/upload-json` | Admin | `{ movieId, events: [{ timestampSeconds?, timeFormatted?, type?, content, metadata? }] }` | `201` with inserted events/count. |

Timeline event types are `Trivia`, `Character`, `Glossary`, and
`Variation Point`. Variation options may be strings for label-only polls, or
objects such as `{ "id": "en", "label": "English subtitles",
"subtitleUrl": "<authorized VTT URL>", "language": "en" }`, or a YouTube
caption option such as `{ "id": "en", "label": "English captions",
"assetType": "youtube-caption", "youtubeCaptionLanguage": "en" }`. Asset suffixes are
restricted to `.mp4`, `.webm`, `.mkv`, or `.ogv` for video; `.mp3`, `.m4a`,
`.aac`, `.ogg`, or `.wav` for audio; and `.vtt` for subtitles. URLs must be
HTTP(S) URLs or local absolute paths. On the admin-protected create and bulk
upload routes, options with assets are stamped with server-side approval
metadata (`approved`, `approvedBy`, `approvedAt`); client-supplied approval
fields are ignored. The socket service does not distribute unapproved assets.
YouTube caption options represent a viewer preference for a language already
offered by that video. Clients do not programmatically change YouTube's native
caption selection; each viewer selects the poll winner from the embedded
player's CC menu. Options do not inject external VTT files or change the
video's native caption catalog.

## Watch Spaces

| Method and path | Access | Request | Result |
|---|---|---|---|
| `POST /api/spaces/create` | User | `{ title, movieSlug?, movieTitle?, visibility?, aiCoPilotLevel?, sceneVotingEnabled?, maxParticipants? }` | `201` with created `space`. Capacity is 2–50; visibility `Private`/`Public`; AI level `Minimal`/`Normal`/`Chatty`. |
| `GET /api/spaces` | Admin | — | All spaces, newest-updated first. |
| `GET /api/spaces/user/my-spaces` | User | — | Spaces the user hosts or joined; admins can see all. |
| `GET /api/spaces/my-spaces` | User | — | Alias for the user's space list. |
| `GET /api/spaces/:code` | User | Room code | Space details; chat history is omitted from this HTTP response. |
| `POST /api/spaces/:code/join` | User | Optional `{ avatar }` | Adds/reconnects the authenticated user; rejects ended, locked, or full rooms. |
| `DELETE /api/spaces/:code` | Room Host or Admin | Optional `?purge=true` | Archives session analytics and ends the space; `purge=true` deletes the room document. |

Room creation fields use title string, optional catalogue slug/title, visibility
`Private` or `Public`, AI level `Minimal`/`Normal`/`Chatty`, boolean
`sceneVotingEnabled`, and `maxParticipants` from 2 through 50.

## AI and analytics

| Method and path | Access | Request | Result |
|---|---|---|---|
| `POST /api/ai/ask` | User; membership required if `roomCode` is supplied | `{ question, currentTimestamp, movieId?, coPilotLevel?, roomCode? }` | Grounded answer, source event IDs, confidence and compatibility response fields. Question max 500 characters. |
| `GET /api/ai/suggestions` | Public in current handler | — | `{ success, suggestions }`. |
| `GET /api/analytics/:spaceCode` | Space member or Admin | Room code | `{ success, analytics }`, including watch time, participants, AI/trivia/chat counts, top questions, and sync summary. |
| `GET /api/analytics/dashboard/summary` | User | — | User's space count, watch time, AI question count, and first preferred genre. Admins see aggregate spaces. |

PRD-compatible `/api/v1` routes:

| Method and path | Access | Request | Result |
|---|---|---|---|
| `POST /api/v1/watch-spaces` | User | `{ titleId, maxParticipants?, aiVerbosity?, votingEnabled? }` | `201` `{ watchSpaceId, inviteCode, status, hostUserId, createdAt }`. `titleId` is slug or Movie ID; verbosity is `minimal`, `normal`, or `chatty`. |
| `GET /api/v1/titles/:titleId/timeline?from=&to=` | Public | Optional range in seconds; max 24 hours | `{ titleId, from, to, events }`; at most 1,000 sorted events. |
| `POST /api/v1/watch-spaces/:id/ai/ask` | Space member | `{ currentTs?, question }` | `{ answer, sourceEvents, generatedAt, confidence }`; id accepts room code or WatchSpace ID. |

## Interactions and recommendations

| Method and path | Access | Request | Result |
|---|---|---|---|
| `POST /api/interactions` | User | `{ titleId, watchedSeconds?, completed?, rating?, coWatchedWith?, watchSpaceCode? }` | Upserts a title interaction and updates user watch-time stats. |
| `POST /api/interactions/rate` | User | `{ titleId, rating }` | Upserts a 1–5 star rating. |
| `GET /api/interactions/recommendations?limit=` | User | Optional limit, capped at 20 | Recommendation result with method/metadata. |
| `GET /api/interactions/more-like-this/:slug` | Public | Title slug | `{ success, movies }`. |
| `GET /api/interactions/my-history` | User | — | Up to 20 recent interactions. |

## Socket.IO

Connect to the same host/port as the API, using Socket.IO's default path and
handshake `auth: { token: "<access-token>" }`. Query-string tokens are not
accepted. Join a room with `join-room` and `{ roomCode }` before room actions.
Room playback and moderation commands are authorized against the persisted
Host. The PRD-style event envelope is
`{ event, watchSpaceId, payload, ts }`, where `ts` is epoch milliseconds.

| Client emits | Typical payload | Server effects / responses |
|---|---|---|
| `join-room` | `{ roomCode }` | `initial-sync-state`, `participants-updated`, presence update; failures use `room-join-error`. |
| `room.playback.update` | `{ state: "play"\|"pause"\|"seek", positionSeconds, issuedBy? }` | Persists state; broadcasts event envelope and legacy `sync-play`, `sync-pause`, or `sync-seek`. Host only. |
| `playback-play`, `playback-pause`, `playback-seek` | `{ position }` | Compatibility aliases for playback controls. |
| `room.sync.ping` | `{ clientSentAt }` | Replies `room.sync.pong` with client and server timestamps. |
| `room.sync.measurement` | `{ driftMs, latencyMs }` | Stores bounded measurements for the current participant. |
| `playback-heartbeat` | `{ position, isPlaying, measurementId? }` | Reports client playback position for drift correction/measurement. |
| `toggle-ready` | `{ isReady }` | Updates room participants. |
| `room.chat.message`, `send-chat-message` | `{ body }` or `{ content }` | Persists and broadcasts `new-chat-message`; muted/unjoined senders receive `chat-rejected`. |
| `typing-update` | `{ isTyping }` | Other room members receive participant name and typing state. |
| `send-reaction` | `{ emoji }` | Broadcasts `new-reaction` for supported emoji. |
| `trigger-trivia` | `{ eventId, text?, tsSeconds }` | Host-only; validates the timeline marker and emits `room.ai.trivia` once per marker. |
| `host-mute-participant` | `{ targetName, isMuted }` | Host-only; broadcasts participant state and `participant-muted`. |
| `host-remove-participant` | `{ targetName }` | Host-only; removes target and emits presence/participant updates. |
| `host-end-space` | — | Host-only; archives analytics and emits `space-ended-by-host`. |
| `host-transfer` | `{ newHostName }` | Host-only; transfers persisted Host status and emits `host-transferred`. |
| `host-set-room-lock` | `{ isLocked }` | Host-only; emits `room-lock-updated`. |
| `room.variation.voteOpen` | `{ variationId, question?, durationSeconds? }` | Host-only; broadcasts options/close time. Duration is constrained to 5–120 seconds. |
| `cast-variation-vote` | `{ option }` | One vote per authenticated participant; broadcasts tallies or `vote-rejected`. |
| `room.variation.voteClose` | — | Host-only; closes early; server also closes at the configured deadline. |
| `presence-ping` | — | Refreshes online state and emits participant updates. |

## Server-to-client event payloads

The following are application events emitted by the current server handlers.
Object shapes below show the payload fields; timestamps, IDs, and database
documents are generated at runtime. “Room” means room members receive the
event; “socket” means it is sent only to the requesting/affected connection.

| Event | Audience | Example payload |
|---|---|---|
| `room-join-error` | Socket | `{ "message": "This Watch Space is locked by the Host." }` |
| `initial-sync-state` | Joining socket | `{ "playbackState": { "isPlaying": false, "currentTime": 0 }, "participants": [], "movie": {}, "host": {}, "isLocked": false, "chatMessages": [], "activeVariationVote": {}, "currentVariation": null }` |
| `participants-updated` | Room | `[ { "name": "Viewer", "role": "Viewer", "isOnline": true, "isMuted": false } ]` |
| `host-reconnected` | Room | `{ "message": "Host has reconnected", "hostName": "Host" }` |
| `host-disconnected` | Room | `{ "message": "Host has lost connection. Playback is paused.", "reconnectGracePeriodSeconds": 60 }` |
| `room.presence.update` | Room; PRD envelope | `{ "event": "room.presence.update", "watchSpaceId": "ABC123", "payload": { "participantId": "socket-id", "action": "joined", "participantCount": 2 }, "ts": 1700000000000 }` |
| `room.playback.update` | Room; PRD envelope | `{ "event": "room.playback.update", "watchSpaceId": "ABC123", "payload": { "state": "seek", "positionSeconds": 45, "issuedBy": "Host" }, "ts": 1700000000000 }` |
| `sync-play`, `sync-pause`, `sync-seek` | Room; compatibility events | `{ "position": 45, "serverTimestamp": 1700000000000 }` |
| `room.sync.pong` | Requesting socket | `{ "clientSentAt": 1234.5, "serverReceivedAt": 1700000000000 }` |
| `sync-heartbeat` | Other room sockets | `{ "position": 45, "isPlaying": true, "serverTimestamp": 1700000000000, "measurementId": "sample-1" }` |
| `chat-rejected` | Sending socket | `{ "message": "Your chat has been muted by the Host." }` |
| `new-chat-message` | Room | `{ "senderName": "Viewer", "content": "Hello!", "isAi": false, "timestamp": "ISO date" }` |
| `typing-update` | Other room sockets | `{ "participantName": "Viewer", "isTyping": true }` |
| `new-reaction` | Room | `{ "id": "socket-id-1700000000000", "participantName": "Viewer", "emoji": "👏" }` |
| `room.ai.trivia` | Room; PRD envelope | `{ "event": "room.ai.trivia", "watchSpaceId": "ABC123", "payload": { "eventId": "evt_trivia_01", "text": "Authored timeline text", "tsSeconds": 90 }, "ts": 1700000000000 }` |
| `participant-muted` | Room | `{ "targetName": "Viewer", "isMuted": true, "mutedBy": "Host" }` |
| `removed-from-room` | Removed socket | `{ "message": "You have been removed from the Watch Space by the Host." }` |
| `space-ended-by-host` | Room | `{ "message": "The Host has ended this Watch Space and the room has been closed.", "roomCode": "ABC123", "endedAt": "ISO date" }` |
| `host-transferred` | Room | `{ "newHostName": "Viewer", "previousHostName": "Host", "host": {} }` |
| `room-lock-updated` | Room | `{ "isLocked": true }` |
| `room.variation.voteOpen` | Room; PRD envelope | `{ "event": "room.variation.voteOpen", "watchSpaceId": "ABC123", "payload": { "variationId": "evt_var_01", "question": "Choose an option", "options": [], "votes": {}, "closesAt": 1700000030000 }, "ts": 1700000000000 }` |
| `variation-votes-updated` | Room | `{ "votes": { "opt-1": 1, "opt-2": 0 }, "optionVoted": "opt-1" }` |
| `room.variation.voteClose` | Room | `{ "roomCode": "ABC123", "closedAt": 1700000030000, "winningOption": {}, "votes": { "opt-1": 1 } }` |
| `room.variation.applied` | Room, when there is a winner | `{ "variationId": "evt_var_01", "option": "English captions", "optionId": "en", "videoUrl": "", "audioUrl": "", "subtitleUrl": "", "youtubeCaptionLanguage": "en", "language": "en" }` |
| `vote-rejected` | Requesting socket | `{ "message": "This variation vote is closed." }` |
| `error` | Requesting socket | `{ "message": "Only the Host can control playback" }` |
| `timeline-events-updated` | All connected sockets (admin timeline REST routes) | `{ "movieId": "dune", "event": {}, "action": "create" }`; delete uses `{ "movieId": "dune", "eventId": "event-id", "action": "delete" }`; bulk import uses `{ "movieId": "dune", "count": 2, "action": "bulk-import" }`. |

`room.presence.update`, `room.playback.update`, `room.ai.trivia`, and
`room.variation.voteOpen` use the PRD envelope; other events use the payload
shapes shown above. The envelope's current `watchSpaceId` value is the room
code, not the MongoDB WatchSpace `_id`. Transport lifecycle notifications
such as `connect`, `disconnect`, and `connect_error` are Socket.IO client
events, not application payloads defined by this server.
