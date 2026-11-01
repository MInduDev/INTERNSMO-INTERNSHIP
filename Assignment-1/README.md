# WatchSpace AI

> AI-Driven Hyper-Personalized Interactive Content & Social Watch Spaces

WatchSpace AI is a MERN full-stack social watch-party platform combining synchronized group video playback, real-time communication, timeline-grounded assistance, group voting, personalization, recommendations, and session analytics.

## 1. Project Overview

WatchSpace AI is a synchronized group viewing platform where a Host and Participants can watch a video together in near real time.

The platform connects the current playback timestamp with a title-specific metadata timeline so the AI Co-Pilot can answer scene-related questions, surface contextual trivia, identify relevant timeline information, and work with pre-approved content variations.

The system also provides a personal dashboard, recommendations, session analytics, and an authenticated admin interface for title timeline management.

## Submission documents

- [Architecture and component responsibilities](./docs/architecture.md)
- [REST and Socket.IO API reference](./docs/api-reference.md)
- [MongoDB data model and seed data](./docs/data-model.md)
- [Test results, evidence status, and remaining gaps](./docs/testing-report.md)
- [PRD requirement mapping](./docs/PRD-requirement-mapping.md)
- [PRD final submission checklist](./docs/PRD-final-submission-checklist.md)
- [Performance & Evaluation Report](./docs/performance-report.md)
- [Demo and evidence capture runbook](./docs/demo-evidence.md)
- [Engineering retrospective](./docs/retrospective.md)
- [Screenshot evidence status](./evidence/README.md)

The evidence report distinguishes automated checks run locally from live,
multi-client, provider, and performance evidence that still requires a
configured environment.

## 2. Project Goals

- Real-time multi-client video synchronization.
- Playback drift correction and reconnect handling.
- Real-time chat, presence, typing indicators, and reactions.
- Retrieval-grounded AI instead of unrestricted chatbot behavior.
- Timeline-driven trivia and contextual information.
- Pre-approved subtitle/localization and minor narrative variations.
- Synchronized group voting.
- Personalized recommendations based on generated interaction data.
- JWT authentication and server-enforced RBAC.
- REST API and WebSocket event contracts.
- Automated testing, security validation, and performance measurement.

## 3. Technology Stack

### Frontend
- React
- JavaScript (not TypeScript)
- HTML5 Video
- Responsive Web UI

### Backend
- Node.js
- Express.js
- Socket.io
- JWT Authentication
- Mongoose

### Database
- MongoDB

### AI
- Timeline retrieval and lexical matching using title metadata
- Optional OpenAI-compatible chat-completions provider, configured by environment

### Development & Testing
- Node.js and npm
- MongoDB
- Scripted Socket.io, AI-grounding, recommendation, analytics, and API workflow checks

The backend checks include `npm run test:auth`, `npm run test:socket`,
`npm run test:playback`, `npm run test:ai`, `npm run test:ai-provider`,
`npm run test:analytics`, and `npm run test:recommendation` from the `server`
directory.
`npm run test:api` checks a running local API; set `TEST_API_URL`,
`TEST_EMAIL`, and `TEST_PASSWORD` to include the authenticated room-create,
refresh, AI, analytics, and cleanup workflow. The full workflow needs a running
MongoDB with a valid test account.
The frontend production build runs with `npm run build` from `client`.

### Local Setup
1. Install dependencies with `npm install` in both `server` and `client`.
2. Copy `server/.env.example` to `server/.env`, set `MONGO_URI`, and replace
   both signing-secret placeholders with different values generated using
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
   The server refuses to start when either signing secret is missing.
3. Start MongoDB, then run `npm run dev` from `server`.
4. In another terminal, run `npm run dev` from `client`.
5. Register or sign in, create a Watch Space, and join with another
   authenticated account to exercise realtime behavior.

### Optional demo seed

The seed script clears all six application collections before inserting demo
records. Only run it against a disposable database. Before running it, set
different private `DEMO_HOST_PASSWORD` and `DEMO_ADMIN_PASSWORD` values of at
least 12 characters in `server/.env`. The script creates
`rajat@watchspace.tv` and `admin@watchspace.tv`; it does not print their
passwords. The actual passwords remain only in your local environment file.
If you do not want to seed the database, register accounts through the app.

The access token expires after one hour. The client refreshes it with the
seven-day refresh token for REST requests and reconnects the socket with the
renewed access token. A bad or expired refresh token ends the local session.

To enable grounded generative answers, configure `LLM_API_URL` (an
OpenAI-compatible chat-completions endpoint), `LLM_API_KEY`, and `LLM_MODEL`.
The service sends only up to three timeline events at or before the current
playback timestamp, limits each evidence item, and rejects citations to source
IDs outside that evidence. Without a configured provider, it retains the
timeline-extraction response. Provider errors are surfaced rather than
silently replaced with a success-shaped fallback.

### API & Socket Access
REST access tokens are sent as `Authorization: Bearer <access-token>`.
Sockets authenticate at handshake with `auth: { token }`; query-string tokens
are not accepted.

| Endpoint | Access |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Public |
| `POST /api/auth/refresh` | Valid refresh token required |
| `GET /api/auth/me` | Authenticated |
| `POST /api/spaces/create`, `POST /api/spaces/:code/join` | Authenticated |
| `GET /api/spaces/:code`, `GET /api/spaces/user/my-spaces` | Authenticated |
| `DELETE /api/spaces/:code` | Room Host or Admin |
| `GET /api/spaces` | Admin |
| `POST /api/ai/ask` | Authenticated; room membership required when `roomCode` is supplied |
| `GET /api/analytics/:spaceCode` | Room member or Admin |
| `POST /api/v1/watch-spaces`, `POST /api/v1/watch-spaces/:id/ai/ask` | Authenticated; AI asks also require room membership |
| `GET /api/v1/titles/:titleId/timeline` | Public |

Playback, room locking, mute/remove, Host transfer, variation voting, trivia
telemetry, chat, reactions, and presence are handled over Socket.IO. Playback
and moderation events are authorized against the persisted room Host, not a
client-supplied role or display name.

### PRD Implementation Status
- Server-enforced room ownership, lock/mute controls, participant capacity,
  authenticated sockets, typing, chat reactions, and persisted chat history
  are implemented.
- Playback heartbeats correct viewer drift. Connected viewers submit bounded
  sync-drift and ping RTT samples; session analytics reports measured p95
  values and whether the observed drift sample set is below 250 ms. This
  instrumentation alone does not prove a cross-network SLA.
- Hosts can vote on admin-authored variation options. Variation metadata may
  include `id`, `label`, `videoUrl` (direct MP4/WebM/MKV/OGV), `audioUrl`
  (MP3/M4A/AAC/OGG/WAV), `subtitleUrl` (WebVTT), and `language`. Winning
  options are persisted and broadcast; supported assets are applied by the
  HTML5 player. Alternate audio and subtitle tracks require a direct HTML5
  video source. Legacy string options remain voteable but do not switch assets.
- AI questions and source event IDs are retained for analytics (up to 500
  questions per room). Sync measurements are capped at 1,000 per room.
- `npm run evaluate:recommendations -- <judgments.json>` from `server`
  evaluates the live recommendation service with labeled judgments shaped as
  `[{"userId":"<MongoDB user id>","relevantMovieSlugs":["title-a"]}]`.
  The evaluator reports Precision@5; no score is claimed without a real,
  representative labeled dataset.
- `npm run test:sync-performance` from `client` measures local Socket.IO
  heartbeat delivery using existing room members and tokens. It requires
  `TEST_ROOM_CODE`, `TEST_HOST_TOKEN`, and comma-separated
  `TEST_VIEWER_TOKENS`. It is a same-process benchmark, not representative
  browser/network SLA evidence.
- A limited sequential API latency run against local MongoDB is recorded in
  the Performance & Evaluation Report. It used sparse data and does not
  establish a production or concurrent-load result. AI latency, multi-client
  drift, and live fan-out remain unmeasured.
- The scripts include a disposable-room authenticated API workflow, but it
  must be run against a live server and MongoDB before claiming full
  end-to-end integration evidence.

## 4. High-Level Architecture

```text
                 ┌──────────────────────────────┐
                 │        React Client          │
                 │ Video Player / Watch Room    │
                 │ Chat / Presence / AI Panel   │
                 │ Dashboard / Recommendations │
                 └──────────────┬───────────────┘
                                │
                 ┌──────────────┴───────────────┐
                 │                              │
              REST API                      WebSocket
                 │                              │
                 ▼                              ▼
       ┌──────────────────┐          ┌──────────────────┐
       │ Express API      │          │ Socket.io        │
       │ Auth / Catalog   │          │ Playback Sync    │
       │ Rooms / Analytics│          │ Chat / Presence  │
       └────────┬─────────┘          │ Voting           │
                │                    └────────┬─────────┘
                └──────────────┬─────────────┘
                               ▼
                     ┌───────────────────┐
                     │ MongoDB / Mongoose│
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │ AI Content Engine │
                     │ Timeline Retrieval│
                     │ Q&A / Trivia      │
                     │ Variations        │
                     └───────────────────┘
```

## 5. Core Features

### Authentication & Authorization
- Registration and login.
- JWT access-token authentication.
- Refresh-token flow.
- Password hashing.
- Protected REST endpoints.
- Authenticated WebSocket handshake.
- Server-side RBAC.

Minimum roles:
- `viewer`
- `host`
- `admin`

Admin and Host permissions must be enforced on the server.

### Content Catalog
- Browse titles.
- Search titles.
- Genre filtering.
- Title/movie details.
- Duration and metadata.
- Poster/video asset references.
- Title-specific timeline data.

The project uses self-created/sample content.

### Watch Space
A Watch Space is a synchronized group viewing room.

Host capabilities:
- Select a title.
- Create a Watch Space.
- Configure room name/privacy.
- Set participant capacity.
- Configure AI Co-Pilot verbosity.
- Enable/disable voting.
- Share invite code/link.
- Control playback.
- Moderate participants.
- End the session.

Participant capabilities:
- Join using code/link.
- Watch synchronized playback.
- Chat and react.
- Ask the AI Co-Pilot questions.
- Vote when enabled.
- Leave and rejoin.

### Real-Time Playback
The Host owns the authoritative playback state.

Supported actions:
- Play
- Pause
- Seek
- Buffering
- Playback position updates

The server distributes authoritative state over Socket.io. Clients report local positions and use gentle drift correction rather than unnecessary hard seeks.

New participants must synchronize with the current room position.

Host-disconnect behavior must be deterministic and tested.

### Chat & Presence
- Live chat.
- Typing indicators and transient emoji reactions.
- Participant presence.
- Connection status.
- Recent chat history.
- Reconnect and resynchronization.

### Host Moderation
- Mute or unmute a participant's chat.
- Remove participant.
- Lock the room to prevent new participants from joining; existing participants can reconnect.
- Transfer Host role.
- Control master playback.

## 6. AI Content Engine

The AI Co-Pilot is grounded in a title-specific JSON/YAML timeline containing:
- Scene markers.
- Character appearance windows.
- Trivia.
- Glossary terms.
- Contextual information.
- Variation points.

Example:

```json
{
  "ts": 812,
  "type": "trivia",
  "text": "Contextual information for this scene."
}
```

### AI Q&A Flow

```text
Current Video Timestamp
          ↓
Retrieve Relevant Timeline Events
          ↓
Build Grounded Context
          ↓
LLM / AI Model
          ↓
Answer + Source Events
          ↓
AI Co-Pilot UI
```

The AI must not invent title-specific facts that are absent from the available metadata. Answers should identify the timeline entries used as sources.

## 7. Timeline-Triggered Trivia

When playback crosses an authored timeline marker:

1. Detect the current timestamp.
2. Retrieve the relevant timeline event.
3. Send the event to the Watch Space.
4. Display the trivia/context card.
5. Respect the Host's trivia setting.

Target: trivia should appear within approximately 1 second of the authored marker for at least 95% of markers in the test title.

## 8. Content Variations & Voting

All variations are:
- Pre-authored.
- Pre-approved.
- Stored as project data.

Examples:
- Alternate subtitle/localization phrasing.
- Regional asset variation.
- Minor optional narrative branch.

The AI does not generate new video, audio, or plot branches during playback.

### Voting Flow

```text
Variation Point
      ↓
Host Opens Vote
      ↓
Participants Vote
      ↓
Server Validates / Tallies
      ↓
Winner Determined
      ↓
Winner Broadcast
      ↓
All Clients Apply Same Variation
```

## 9. Dashboard & Recommendations

Dashboard features:
- Recently watched titles.
- Upcoming Watch Spaces.
- Quick rejoin for active rooms.
- Personalized recommendations.
- Watch history.
- Session analytics.

Recommendation signals may include:
- Watched seconds.
- Completion.
- Ratings.
- Genre affinity.
- Co-watch patterns.

The requirement calls for a hybrid content-based + collaborative recommendation approach when sufficient interaction data exists.

## 10. Session Analytics

For completed Watch Spaces:
- Session duration.
- Peak concurrent participants.
- Number of AI questions.
- Number of trivia cards.
- Chat activity volume.

Analytics should reconcile with underlying event data for a verified test session.

## 11. Admin Timeline Management

An authenticated Admin can:
1. Select a title.
2. Upload or paste JSON/YAML timeline data.
3. Validate the schema.
4. Display clear errors.
5. Save valid metadata.

Non-admin users must be rejected server-side.


## 15. Security Requirements

- JWT authentication.
- Access tokens no longer than 1 hour.
- Refresh-token flow.
- RBAC: viewer, host, admin.
- Authenticated WebSocket handshake.
- Server-side authorization.
- Input validation and sanitization.
- Protection against injection and stored XSS.
- Password hashing.
- Environment variables for secrets.
- No credentials committed to Git.


## 22. Out of Scope

- Real Netflix integration.
- Netflix accounts/catalog.
- Public production-scale deployment.
- CDN video delivery.
- DRM.
- Multi-tenant production service.
- Native mobile app.
- Payments/billing/subscriptions.
- Generative rewriting of video/audio.
- AI-generated new narrative branches.
- Training a custom large language model.

A responsive web client is sufficient.



## 25. Suggested Repository Structure

```text
watchspace-ai/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── utils/
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   ├── tests/
│   └── package.json
│
├── data/
│   ├── timelines/
│   └── seed/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── testing/
│
├── .env.example
├── .gitignore
└── README.md
```
## 28. Known Limitations

This is a focused engineering internship/portfolio system rather than a production streaming platform.

Expected limitations:
- Local/private demonstration deployment.
- Sample/self-created video assets.
- Limited test concurrency compared with real streaming platforms.
- Recommendation quality depends on available interaction data.
- AI quality depends on the selected model/API and timeline metadata quality.

All additional limitations or deviations should be documented honestly.

---

## Requirement Reference

This README is based on the supplied **AI-Driven Hyper-Personalized Interactive Content & Social Watch Spaces — Product Requirements Document (v1.0)**. The PRD defines the project as a four-week full-stack engineering assignment and specifies real-time synchronized playback, the AI Content Engine, dashboard/recommendations/analytics, security, testing, performance, and documentation requirements.
