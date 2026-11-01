# Architecture overview

## System context

WatchSpace AI is a browser-based React application with an Express/Socket.IO
backend and MongoDB persistence. REST endpoints handle authentication,
catalogue and timeline access, room lifecycle, AI questions, interactions, and
analytics. Socket.IO carries authenticated room presence and live events.

```text
Browser (React + HTML5 video)
  ├─ HTTP/JSON + JWT ───────────────> Express routes ──> Mongoose ──> MongoDB
  └─ Socket.IO + access JWT ────────> socketService ───> WatchSpace state
                                       ├─ aiService ───> TimelineEvent
                                       │                 └─ optional compatible LLM
                                       └─ analytics / recommendation services
```

## Runtime components

| Component | Responsibility |
|---|---|
| `client/src` | React screens, responsive presentation, authentication/session state, player controls, and Socket.IO client interactions. |
| `server/server.js` | Loads environment, connects MongoDB, configures Express and Socket.IO, mounts `/api` routes, health check, and error middleware. |
| `server/routes` | HTTP validation, authentication/authorization gates, persistence, and response formatting. |
| `server/services/socketService.js` | Socket authentication, room membership, playback broadcasts, presence, chat, reactions, moderation, trivia, and variation voting. |
| `server/services/aiService.js` | Retrieves timeline evidence at or before the playback timestamp; optionally calls an OpenAI-compatible chat-completions API and validates citations. |
| `server/services/recommendationService.js` and `recommendationScoring.js` | Builds recommendation rails from user interaction history and scores content candidates; cold-start paths use top-rated/content-based results. |
| `server/services/sessionAnalyticsService.js` and `analyticsMetrics.js` | Archives session summaries and derives question and synchronization metrics from retained samples. |
| `server/models` | Mongoose schemas for users, titles, watch spaces, timeline events, interactions, and archived analytics. |

## Main request flows

### Authentication and authorization

Register/login issues a one-hour access token and seven-day refresh token.
Private HTTP routes use `Authorization: Bearer <access-token>`. Socket clients
authenticate at connection with `auth: { token: <access-token> }`. The server
looks up the authenticated user and checks persisted room ownership or
membership for privileged actions; client-provided role or display name is not
an authorization grant.

### Watch Space synchronization

The client joins a room by code after authenticating. The server checks that
the room exists, is not ended or locked against new members, and has capacity;
then it sends `initial-sync-state` to that client. The Host's play, pause, or
seek update is validated and persisted before it is broadcast to the room.
Viewer heartbeat reports support drift correction and bounded measurement
sampling. Reconnection rejoins and receives the latest persisted room state.

### Grounded AI

The question endpoint resolves the title from the room (when supplied),
retrieves timeline records for that title at or before the requested timestamp,
and returns the answer with source event IDs. When all LLM configuration values
are set, the service may use the configured compatible provider; otherwise it
uses the timeline-only response. Provider failure is an error, not a fabricated
successful response.

### Interaction and recommendation

Authenticated interactions upsert per-user/per-title watch activity and can
include completion, rating, and co-watch information. Recommendation routes
use that stored history when available and expose a top-rated or content-based
cold-start path when it is not. Quality depends on representative interaction
and evaluation data; the repository does not establish a production-quality
recommendation score.

## Persistence

See [the data model](./data-model.md) for collection responsibilities and
relationships. Watch Space documents hold current playback, participants,
recent chat, active variation vote, question references, and bounded sync
samples. Completed sessions can also be summarized into the `Analytics`
collection.

## Operational configuration

Copy `server/.env.example` to `server/.env`; set two distinct random signing
secrets and the MongoDB URI. The optional LLM settings are only needed for
provider-backed answers. `server/.env` is ignored by Git. Never place secrets
in documentation, screenshots, browser recordings, or committed source.

## Boundaries and limitations

- This is a local/demo application, not a production streaming or CDN service.
- The seed script deletes all documents from its configured collections before
  inserting demo data. Only run it against a disposable database.
- The default sample video is a remote Big Buck Bunny URL. No movie files are
  bundled under `client/public/movies`; verify media terms and availability
  before a public demonstration.
- Socket heartbeat instrumentation and local benchmark scripts are not proof
  of a cross-network synchronization SLA.
- LLM output, recommendation quality, and latency depend on external provider,
  configuration, timeline quality, and test data.
- CORS is currently configured permissively in the server entry point; this
  project setup is not a production deployment security configuration.
