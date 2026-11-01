# Test results and submission evidence

This report records checks run in the current workspace and evidence still
needed for a complete PRD demonstration. Automated mock/unit tests are not
represented as live integration or multi-browser proof.

## Checks run

| Check | Result | Scope / limitation |
|---|---|---|
| `npm run test:auth --prefix server` | PASS | Auth middleware, access/refresh token behavior, and viewer/admin RBAC checks with mocked user data. |
| `npm run test:socket --prefix server` | PASS | Socket moderation/chat behavior with fake room/model data, including an assertion that Viewer playback control is rejected without state mutation or broadcast; not live evidence or a multi-network performance test. |
| `npm run test:playback --prefix server` | PASS | Dedicated deterministic playback transition tests for play, pause, seek, resume, elapsed playback accounting, stale clocks, and invalid input. Does not demonstrate cross-browser playback drift. |
| `npm run test:ai --prefix server` | PASS | Timeline retrieval grounding and unsupported-question behavior with fixture events. |
| `npm run test:ai-provider --prefix server` | PASS | Compatible-provider request/citation contract using a mocked fetch; no external provider call. |
| `npm run test:analytics --prefix server` | PASS | Session summary reconciliation and p95 metrics using mocked persistence. |
| `npm run test:recommendation --prefix server` | PASS | Scoring, completed-title exclusion, and a fixture Precision@K calculation. |
| `npm run test:api --prefix server` | PASS (public/protection smoke checks) | Temporary local API + MongoDB: health, public catalogue/timeline, and unauthenticated route rejection. The authenticated workflow was skipped because `TEST_EMAIL` and `TEST_PASSWORD` were unavailable. |
| Local API latency rerun | PASS (local threshold only) | 10 warm-ups + 100 sequential samples per endpoint; P95: health 2.75 ms, movies 5.89 ms, Dune timeline 5.52 ms. All 300 were HTTP 200. Local sparse data; not production/load evidence. Raw JSON: [rerun results](./performance-results-local-2026-10-30-rerun.json). |
| Local API concurrency benchmark | PASS (local only) | Concurrency 1/5/10; 100 requests per endpoint per level; all 900 HTTP 200. At concurrency 10, P95: health 11.19 ms, movies 15.87 ms, Interstellar timeline 24.49 ms. Raw JSON: [concurrency results](./performance-results-api-concurrency-local-2026-10-30.json). |
| Timeline-only AI service latency | PASS (local fallback only) | 10 warm-ups + 100 grounded responses; P95 3.03 ms. Excludes HTTP/auth and external provider; not LLM latency. Raw JSON: [timeline AI results](./performance-results-timeline-ai-local-2026-10-30.json). |
| Playback drift UI claim | Corrected | Removed the unmeasured `< 50ms` login badge; no actual browser `video.currentTime` drift result is claimed. |
| Local Socket.IO heartbeat delivery | PASS (small local topology) | One temporary host, two viewers, one room; 40 heartbeats yielded 80 deliveries; P95 7.46 ms. Measures event delivery only, not video drift or design capacity. Raw JSON: [socket results](./performance-results-socket-local-2026-10-30.json). |
| Concurrent-room Socket.IO smoke | PASS (2 rooms, 4 clients) | Two rooms measured simultaneously; each received all 20 test heartbeats. P95 7.98 ms and 7.13 ms. Small local functional/load smoke, not design capacity. Raw JSON: [multi-room results](./performance-results-multiroom-local-2026-10-30.json). |
| Live AI latency attempt | BLOCKED | First real-provider request returned HTTP 429 for insufficient credits; stopped before further calls. No successful sample/P95. See [attempt record](./performance-results-ai-local-2026-10-30.json). |
| Local demo seed and cleanup | PASS | The configured local `watchspace_db` was empty before capture. Temporary fixtures were seeded to exercise the UI, then removed; the database is empty again. |
| Responsive viewport sweep | PASS (prior work) | Screens were checked at widths 280, 320, 375, 430, 768, 900/1024, and 1440 px with simulated API data; no page-level horizontal overflow was observed in checked screens. |
| `npm run build --prefix client` | PASS | Production Vite build after responsive changes; rerun during this verification. |

The viewport sweep used mocked API responses because the backend was not
running. Browser/device diversity and assistive-technology testing were not
established by that check.

## Evidence status against the PRD

| PRD evidence / deliverable | Current status | What is needed to close it |
|---|---|---|
| README and setup guide | Prepared | Use `server/.env.example`; follow the local demo runbook. |
| PRD final submission checklist | Prepared | [Checklist](./PRD-final-submission-checklist.md) marks deliverables and evidence as complete, partial, or outstanding based on this workspace. |
| Architecture overview | Prepared | Review against any final deployment-specific changes. |
| Full API reference | Prepared from current route/socket handlers | Revisit whenever route payloads or event contracts change. |
| Database schema / ER overview | Prepared from Mongoose models | A rendered ER image is optional; the relationship diagram is included in the data-model document. |
| Performance & Evaluation Report | Prepared; API latency rerun recorded, remaining PRD metrics unmeasured or blocked | See [report](./performance-report.md); local sequential API values are not production/load evidence. |
| Seed/sample data including authored timeline | Present, but title/video alignment, completeness, and factual review are outstanding | Dune has four events across the first five minutes and inherits a Big Buck Bunny video URL from the Movie model. It is not a valid synchronized Dune timeline demo. See [seed notes](./data-model.md). |
| Automated playback state-machine, AI retrieval, RBAC tests | Partial | Dedicated deterministic playback transition, auth/RBAC, and AI retrieval tests pass. Cross-client drift remains unmeasured. |
| Retrospective | Draft prepared | The project owner must personalize first-person statements and add their own challenge and scope rationale. |
| Two-client synchronized room screenshot | Local UI capture only | Captured two app clients in tabs of one browser profile at the same playback timestamp. The separate-profile recording, cross-network test, and measured playback-drift result remain outstanding. See [`evidence/README.md`](../evidence/README.md). |
| Grounded AI answer with source timeline | Timeline-only retrieval-grounded Q&A is the declared submission scope; local API response captured | HTTP 200 response at 01:40 cites `evt_trivia_01`; the formatted response capture is not an in-app screenshot or provider-backed result. The configured provider attempt returned HTTP 429 for insufficient credits. |
| Subtitle/localization swap plus variation vote | Vote captured; asset switching not demonstrated | The active seeded vote is shown in [`evidence/07-variation-vote.png`](../evidence/07-variation-vote.png). Seeded choices have no reachable subtitle/video assets; add approved assets and verify the applied track in two clients. |
| Recommendations with interaction data | Local recommendation screen captured; quality evidence outstanding | The screenshot is a seeded catalogue/cold-start view, not a representative interaction-based evaluation. Do not claim quality without held-out relevance labels. |
| Passing automated test report | Seven focused backend suites passed in this verification; the existing capture predates the new playback suite | A formatted summary of six earlier suites is in [`evidence/12-tests.png`](../evidence/12-tests.png); it is not a terminal screenshot. |
| Measured synchronization/API/AI latency | API, local fallback AI, socket delivery, and two-room smoke measured; actual playback drift unmeasured; provider AI blocked | Sequential API P95: 2.75/5.89/5.52 ms; concurrency-10 API P95: 11.19/15.87/24.49 ms. Local timeline-only AI P95: 3.03 ms (not provider-backed). Socket delivery P95: 7.46 ms in one room; two-room P95: 7.98/7.13 ms. These are local-only and not playback drift/design capacity. Provider attempt received HTTP 429; no provider P95. See [Performance & Evaluation Report](./performance-report.md). |
| Server-side RBAC rejection | Unit-tested for HTTP and socket; local HTTP 403 captured | Host-role token received HTTP 403 from admin-only `POST /api/timeline`; socket regression test verifies a Viewer playback update is rejected with no state change or broadcast. See [`evidence/11-rbac.png`](../evidence/11-rbac.png); the socket assertion is automated, not a live client capture. |
| Git repository with incremental commits | Local repository created from an explicitly labeled source snapshot, followed by a separate fix commit | This establishes genuine local history from 2026-10-31 only. Prior project history was unavailable and has not been reconstructed; no GitHub remote was provided or configured. |

## Reproducibility and environment gaps

- The authenticated portion of `npm run test:api --prefix server` requires a
  running API, MongoDB, and a valid test account. Only the public/protection
  smoke checks were run because test credentials were unavailable.
- The seed script is destructive and requires private `DEMO_HOST_PASSWORD`
  and `DEMO_ADMIN_PASSWORD` values in `server/.env`; do not commit or share
  that file. The local database was empty at the start of this verification;
  no demo data was inserted during this work. Seeded timeline facts and
  selected-video alignment still need human editorial review.
- `npm run test:sync-performance --prefix client` was run using a temporary
  local room and generated test identities. It measures heartbeat delivery,
  not real media playback drift; the temporary records were removed afterward.
- A provider-backed latency result requires successful live calls to the
  configured LLM provider. The attempted live request was rejected with HTTP
  429 for insufficient credits; the provider contract test mocks the HTTP
  response and measures no real service.
- No production deployment URL, real multi-browser recording, or benchmark
  output is included in this package.
- The Dune seed does not override the `Movie.videoAssetUrl` default, which is
  the Big Buck Bunny sample. Until an approved Dune clip is supplied and the
  timeline is aligned against it, the seeded Dune playback/timeline pairing
  must not be presented as a completed demo.

## Acceptance discipline

Save evidence in a dated folder outside the source of truth only after capture.
For each claim, preserve the command or scenario, environment, number of
clients, sample count, and raw result. Do not report a latency percentile,
cross-browser outcome, or recommendation metric unless the corresponding live
measurement and dataset are available.
