                        # Performance & Evaluation Report

                        ## 1. Purpose and status

                        This report maps the project to the performance and evaluation requirements in
                        the supplied Product Requirements Document (PRD), Section 10.2, and records
                        what has and has not been measured.

                        **Current evaluation status: local API, local timeline-only AI, and small
                        local Socket.IO delivery benchmarks were run on 2026-10-30. A live playback
                        drift monitor snapshot was also recorded on 2026-10-31.** The provider-backed
                        AI attempt was blocked by HTTP 429 for insufficient credits. Controlled
                        cross-browser playback drift, design-capacity fan-out, large-scale multi-room
                        load, provider-backed AI latency, editorially verified trivia timing, and
                        representative recommendation quality remain unmeasured. A single-title
                        recommendation smoke-test score is recorded below. The playback snapshot
                        lacks documented client count and network conditions, so it is limited
                        evidence and does not establish a general or production result.

                        The login screen's former `< 50ms` drift badge was removed because it was not
                        supported by a measurement of real `video.currentTime` positions. The current
                        UI does not claim that threshold has been met.

                        ## 2. PRD targets and current evidence

                        | PRD dimension | Target | Current measured result | Status and limitations |
                        |---|---:|---:|---|
                        | Non-AI API latency | P95 < 200 ms | **Latest local sequential run:** health 2.75 ms; movies 5.89 ms; Dune timeline 5.52 ms | Below the threshold in this local run only. One local machine, concurrency 1, one movie returned, and zero Dune timeline events; not representative of populated or production workload. |
                        | AI Co-Pilot answer latency | P95 < 3 seconds | Timeline-only mode: P95 3.03 ms over 100 grounded responses. Provider-backed mode: no successful sample; first live request returned HTTP 429 (insufficient provider credits). | The timeline-only measurement excludes an external model and does not establish the provider-backed target. The authorized 30-sample provider run stopped after its first rejection; provider P50/P95 cannot be calculated. |
                        | Playback synchronization drift | Target < 100 ms; acceptable ceiling < 250 ms under good network conditions | Live UI snapshot (2026-10-31): 108 samples; P50 230.7 ms, P95 385.53 ms, max 435.6 ms; 17/108 below 100 ms and 62/108 below 250 ms | P95 exceeds the 250 ms ceiling. The monitor displayed “Playback paused • monitoring paused” after pausing. Client count and network conditions were not recorded, and this single UI snapshot is not a controlled cross-browser evaluation. |
                        | WebSocket fan-out | < 500 ms from server receipt to last client delivery at design capacity | Local one-room heartbeat test: P95 7.46 ms, maximum 37.32 ms; 40 heartbeats reached both viewers (80 deliveries). | Below 500 ms in this small same-machine test only. Does not represent browser clients, remote networks, design-capacity fan-out, or playback drift. |
                        | Concurrent rooms | Architecture must support multiple rooms; no single-room assumption | Two simultaneous local rooms: 20 heartbeats each, 40/40 deliveries; P95 7.98 ms and 7.13 ms by room. | Two-room/four-client smoke test passed, but this is not a large-scale capacity result. Room state is addressed by room code. |
                        | Trivia marker timing | Within 1 second for at least 95% of markers in the test title | Not measured against media playback | Local Interstellar timeline contains 13 events, but no live title playback/browser timing run or editorially verified marker set is available. The Dune timeline endpoint returned zero events. |
                        | Recommendation quality | Precision@5 against a held-out interaction set generated for evaluation | **0.20 (20%)** on the current single-title evaluation dataset; one held-out relevance judgment for `The Signal` | Smoke-test measurement only. The demo catalog contains one title, so this is not representative of production-scale recommendation quality. |

                        ### Results interpretation

                        - The instrumentation code, tests, and an evaluation script are not evidence
                          that a target was achieved.
                        - In particular, stored sync samples are collected from connected room
                          participants; the current analytics target checks the P95 absolute drift
                          against 250 ms. The live UI snapshot below is a measured monitor result, but
                          it does not establish the target under controlled or documented conditions.
                        - The sync benchmark's `p95Ms` is heartbeat-to-viewer notification delivery
                          time for its local socket clients. It does **not** measure actual video
                          playback drift and is not equivalent to the PRD's cross-client drift target
                          or a production fan-out guarantee.
                        - The local Socket.IO delivery result below 500 ms is only for one host and
                          two viewer clients on loopback. It does not satisfy the design-capacity
                          condition in the PRD target.
                        - The UI responsive viewport sweep used simulated API data and is unrelated
                          to runtime API, AI, or playback performance.

                        ### Local non-AI API latency benchmark (rerun 2026-10-30)

                        Measured after starting the local backend and using its configured local
                        MongoDB. A Node.js HTTP client ran 10 warm-up requests, followed by 100
                        sequential measured requests per endpoint (concurrency 1). Elapsed time was
                        measured with `performance.now()` from request start through complete response
                        body read. All 300 measured requests returned HTTP 200. This is a new run,
                        not a direct repeatability comparison under controlled machine load.

                        | Endpoint | Warm-up | Measured requests | P50 | P95 | Maximum | PRD P95 < 200 ms |
                        |---|---:|---:|---:|---:|---:|---|
                        | `GET /api/health` | 10 | 100 | 0.86 ms | **2.75 ms** | 5.68 ms | Met locally |
                        | `GET /api/movies` | 10 | 100 | 3.29 ms | **5.89 ms** | 7.47 ms | Met locally |
                        | `GET /api/timeline/dune` | 10 | 100 | 2.72 ms | **5.52 ms** | 9.44 ms | Met locally |

                        At measurement time, `/api/movies` returned one title and
                        `/api/timeline/dune` returned zero events. Each response was 200 for all
                        samples. These low-data, loopback results only characterize this local smoke
                        benchmark. They do not establish latency under realistic data volume,
                        concurrent load, a remote network, or deployment conditions. In particular,
                        do not use these results to claim the API target is met generally. Raw run
                        details are saved in
                        [performance-results-local-2026-10-30-rerun.json](./performance-results-local-2026-10-30-rerun.json).

                        ### Local API concurrency benchmark (2026-10-30)

                        A separate temporary local backend was measured at concurrency 1, 5, and 10
                        using 100 requests per endpoint per concurrency level. Each endpoint received
                        10 sequential warm-ups. All 900 measured responses returned HTTP 200. The
                        timeline endpoint used Interstellar, which returned 13 events. P95 results:

                        | Endpoint | P95 at concurrency 1 | P95 at concurrency 5 | P95 at concurrency 10 | Maximum P95 |
                        |---|---:|---:|---:|---:|
                        | `GET /api/health` | 1.82 ms | 5.63 ms | 11.19 ms | 11.19 ms |
                        | `GET /api/movies` | 4.62 ms | 13.24 ms | 15.87 ms | 15.87 ms |
                        | `GET /api/timeline/interstellar` | 4.52 ms | 13.34 ms | 24.49 ms | 24.49 ms |

                        These are local loopback concurrency checks against one backend process and a
                        sparse local database, not production capacity or a controlled load test. Raw
                        results are in
                        [performance-results-api-concurrency-local-2026-10-30.json](./performance-results-api-concurrency-local-2026-10-30.json).

                        ### Local timeline-only AI benchmark (2026-10-30)

                        With external provider settings disabled in the benchmark process, 10 warm-up
                        and 100 measured direct AI service calls used local Interstellar timeline
                        evidence. All 100 returned grounded timeline-extract responses with source
                        events. P50 was 1.17 ms, P95 3.03 ms, and maximum 3.75 ms. This measures local
                        database retrieval and deterministic answer formatting only; it is not an
                        LLM/provider latency measurement and excludes HTTP and authentication. Raw
                        results are in
                        [performance-results-timeline-ai-local-2026-10-30.json](./performance-results-timeline-ai-local-2026-10-30.json).

                        ### Local Socket.IO heartbeat delivery (2026-10-30)

                        The existing Socket.IO benchmark ran against a temporary local room with one
                        host and two viewers. Forty host heartbeats produced 80 viewer deliveries.
                        Measured P50 was 5.11 ms, P95 7.46 ms, and maximum 37.32 ms. This is a
                        same-machine loopback event-delivery measurement, not actual playback drift,
                        cross-network fan-out, or design-capacity evidence. The test identities and
                        room were removed after the run. Raw results are in
                        [performance-results-socket-local-2026-10-30.json](./performance-results-socket-local-2026-10-30.json).

                        ### Live playback drift monitor snapshot (2026-10-31)

                        The Watch Room UI reported 108 playback-drift samples: P50 230.7 ms, P95
                        385.53 ms, and maximum 435.6 ms. Seventeen of 108 samples were below 100 ms;
                        62 of 108 were below 250 ms. The P95 is above the PRD's 250 ms acceptable
                        ceiling, and only 57.4% of samples were below that ceiling. After playback was
                        paused, the monitor displayed “Playback paused • monitoring paused,” indicating
                        that it stopped collecting new drift samples while paused.

                        The browser/client count, room size, network conditions, and raw timestamped
                        playback positions were not recorded with this snapshot. Treat it as a live
                        UI observation, not a controlled cross-browser result or evidence that the
                        target is met. A documented play/pause/seek/reconnect test with at least two
                        real clients is still needed. The monitor values were supplied from the
                        session; no separate raw output file is available.

                        ### Concurrent-room Socket.IO smoke test (2026-10-30)

                        Two temporary rooms were active simultaneously, each with one host and one
                        viewer. Each host sent 20 heartbeats while both room benchmarks ran at the
                        same time. All 40 heartbeat deliveries arrived in the intended clients:
                        room 1 P95 7.98 ms (maximum 8.55 ms) and room 2 P95 7.13 ms (maximum 8.50
                        ms). This verifies only a small local two-room scenario; it does not establish
                        design capacity, high-load behavior, or cross-room behavior at scale. All
                        temporary users and rooms were deleted after the test. Raw results are in
                        [performance-results-multiroom-local-2026-10-30.json](./performance-results-multiroom-local-2026-10-30.json).

                        ## 3. Evaluation code available in the repository

                        ### 3.1 Socket heartbeat delivery benchmark

                        From `client`, run:

                        ```powershell
                        npm run test:sync-performance
                        ```

                        Configure these environment variables for an existing disposable room:

                        - `TEST_SOCKET_URL` (optional; defaults to `http://localhost:5000`)
                        - `TEST_ROOM_CODE`
                        - `TEST_HOST_TOKEN`
                        - `TEST_VIEWER_TOKENS` (comma-separated access tokens for existing room members)
                        - `SYNC_SAMPLE_COUNT` (optional; defaults to 40 and is bounded to 5–500)
                        - `SYNC_TARGET_MS` (optional; defaults to 250)

                        The script reports requested and delivered heartbeats, viewer count, P50/P95/
                        maximum delivery time, configured threshold, and whether that threshold was
                        met. Preserve the full JSON output. Run it multiple times under documented
                        conditions; one local run is not representative of a real network or
                        browser-session SLA.

                        ### 3.2 API workflow

                        The project provides an authenticated API workflow:

                        ```powershell
                        npm run test:api
                        ```

                        Run from `server` with `TEST_API_URL`, `TEST_EMAIL`, and `TEST_PASSWORD`
                        configured, against a live test server and disposable test database/account.
                        This script checks a functional API flow; the checked-in script does not
                        produce the PRD's API latency percentile report. To evaluate API P95, collect
                        per-request elapsed time for repeated requests to the selected non-AI
                        endpoints, exclude warm-up requests, and calculate P95 using the same
                        environment and load for all runs. Record endpoint, method, status, sample
                        count, concurrency, warm-up count, and percentile calculation.

                        ### 3.3 AI response latency

                        The provider-contract test is run with:

                        ```powershell
                        npm run test:ai-provider
                        ```

                        It mocks the external provider and therefore is a functional test only. For
                        AI latency evaluation, use the live AI endpoint with a configured provider (or
                        timeline-only mode, reported separately), a fixed set of questions and
                        timestamps, and repeated requests. Measure elapsed time from request start to
                        complete response; report provider/configuration mode, question count,
                        timeouts/errors, and P50/P95. Never include API keys in the report. Provider
                        results are dependent on provider, model, network, prompt, and evidence size.

                        On 2026-10-30, an authorized run attempted one direct `AIService.askQuestion`
                        call using local Interstellar timeline evidence. The configured provider
                        returned HTTP 429 (insufficient credits) before any successful answer, so the
                        run stopped and no provider latency percentile or target result is reported.
                        The attempt metadata is in
                        [performance-results-ai-local-2026-10-30.json](./performance-results-ai-local-2026-10-30.json).

                        ### 3.4 Playback drift and fan-out

                        For actual playback drift, connect at least two real browser clients to the
                        same live Watch Space on a documented network. Log or capture each client's
                        playback position at synchronized sample times while exercising play, pause,
                        seek, and reconnect. For each sample calculate the maximum participant
                        position minus minimum participant position; report P50/P95/max drift and the
                        number of samples below 100 ms and 250 ms. Report browser count and network
                        conditions.

                        For WebSocket fan-out, record server-receipt and last-client-receipt times
                        for the same uniquely identified event, with multiple room members. Report
                        room size and load, sample count, and P95/max. The current heartbeat script
                        does not test design-capacity fan-out or measure video drift.

                        ## 4. Functional tests and build checks

                        The following environment-independent server checks passed in the documented
                        test run:

                        | Command | Result | What it establishes |
                        |---|---|---|
                        | `npm run test:auth` | PASS | Authentication middleware/token and RBAC behavior using test doubles. |
                        | `npm run test:socket` | PASS | Selected socket chat/moderation behavior with fake persistence. |
                        | `npm run test:ai` | PASS | Timeline grounding and unsupported-question behavior with fixture data. |
                        | `npm run test:ai-provider` | PASS | Provider request and citation contract using mocked HTTP responses. |
                        | `npm run test:analytics` | PASS | Session summary and percentile calculations using fixtures. |
                        | `npm run test:recommendation` | PASS | Recommendation scoring and Precision@K on synthetic fixtures. |
                        | `npm run test:api` | PASS (public/protection smoke checks only) | Ran against a temporary local API and MongoDB. Health, public catalogue/timeline, and unauthenticated access rejections passed. Authenticated room/AI/analytics flow was not run because test credentials were not configured. |
                        | `npm run build --prefix client` | PASS | Vite production bundle compiles; this is not a runtime performance benchmark. |

                        These are functional/unit-level checks. They do not establish end-to-end
                        latency, test capacity, external provider performance, or real network
                        synchronization.

                        ### Latest verification environment

                        - Run date: 2026-10-30.
                        - Operating system: Windows.
                        - Node.js: v25.9.0; npm: 11.12.1.
                        - Local MongoDB was listening on port 27017; the API used the local database.
                        - A temporary local API instance returned HTTP 200 from `/api/health`; public
                          and unauthenticated-protection smoke checks passed.
                        - The sequential API latency rerun used 10 warm-ups plus 100 measured requests
                          per endpoint; all 300 returned HTTP 200. At that time the database had one
                          movie and zero Dune timeline events.
                        - A separate API concurrency run used 10 warm-ups and 100 requests per
                          endpoint at concurrency 1, 5, and 10; all 900 returned HTTP 200. The
                          Interstellar timeline endpoint returned 13 events.
                        - Timeline-only AI service latency used 10 warm-ups and 100 measured calls;
                          all 100 returned grounded responses with source events.
                        - Socket heartbeat delivery used a temporary room with one host and two
                          viewers; 40 heartbeats yielded 80 deliveries. A separate simultaneous
                          two-room smoke used four clients and delivered 20/20 heartbeats to each
                          viewer. Temporary test accounts and rooms were deleted afterward.
                        - The authenticated API workflow was not run because `TEST_EMAIL` and
                          `TEST_PASSWORD` were unavailable. For the Socket.IO benchmark, disposable
                          test users, room, and tokens were generated temporarily and deleted after
                          the one-room delivery run; the project does not have persistent test
                          credentials.
                        - One live provider-backed AI request was attempted and rejected with HTTP 429
                          for insufficient credits; it yielded no successful latency sample. The
                          authorized 30-sample attempt stopped after the first rejection. Provider
                          contract and grounding tests passed using mocks/fixtures.

                        ## 5. Recommendation evaluation

                        The repository includes an evaluator for a labeled judgment file:

                        ```powershell
                        npm run evaluate:recommendations -- judgments.json
                        ```

                        Each judgment must contain a MongoDB user ID and relevant title slugs:

                        ```json
                        [
                          {
                            "userId": "REPLACE_WITH_TEST_USER_ID",
                            "relevantMovieSlugs": ["title-a", "title-b"]
                          }
                        ]
                        ```

                        The evaluator queries the live recommendation service and reports
                        Precision@5 for each judgment and the mean across cases. The current live
                        evaluation returned **0.20 (20%)** using one held-out relevance judgment for
                        `The Signal`. This is a smoke-test measurement only: the demo catalog contains
                        one title, so the result is not representative of production-scale quality.
                        A valid larger evaluation should keep the judgment set separate from
                        interaction data used to tune or construct recommendation behavior, document
                        how relevance labels were assigned, and use enough users/titles to avoid
                        interpreting a tiny smoke-test score as general quality.

                        ## 6. Reproducible result record

                        Complete this record for each live run and attach the unedited output or log.
                        Do not fill in expected/target values as measured results.

                        | Field | Record |
                        |---|---|
                        | Run date/time and timezone | Benchmarks: 2026-10-30; playback monitor snapshot: 2026-10-31 (time and timezone not recorded) |
                        | Application commit/version | Not available in this non-Git workspace |
                        | Environment (local/staging), OS, Node version | Local Windows; Node.js v25.9.0; npm 11.12.1 |
                        | Host/network conditions | One machine; APIs and Socket.IO used loopback with local MongoDB; provider attempt contacted configured external provider |
                        | Test type and exact command/scenario | Sequential/concurrent API GETs; local timeline-only AI; live provider attempt; one-room delivery benchmark; simultaneous two-room smoke |
                        | Browser/client count and room count | Playback snapshot: not recorded; Socket.IO: 1 host + 2 viewers in one-room test, then 2 hosts + 2 viewers across 2 rooms; API: Node.js clients; AI: service harness |
                        | Warm-up and measured sample counts | Sequential API: 10 + 100/endpoint; concurrency API: 10 + 100/endpoint/concurrency; timeline AI: 10 + 100; socket: 40 heartbeat events/80 deliveries; concurrent rooms: 20 events per room; provider: 1 attempted/0 successful |
                        | API P95 per endpoint | Latest rerun: health 2.75 ms; movies 5.89 ms; Dune timeline 5.52 ms |
                        | AI P50/P95 and provider mode | Timeline-only local: P50 1.17 ms / P95 3.03 ms, 100 grounded samples; provider-backed: no successful sample, first request HTTP 429; see [timeline-only results](./performance-results-timeline-ai-local-2026-10-30.json) and [provider attempt](./performance-results-ai-local-2026-10-30.json) |
                        | Playback drift P50/P95/max | Live UI snapshot: 230.7 / 385.53 / 435.6 ms over 108 samples; 17/108 below 100 ms, 62/108 below 250 ms; P95 above ceiling; client count/network conditions not recorded |
                        | Socket heartbeat delivery P50/P95/max | Local one-host/two-viewer test: 5.11 / 7.46 / 37.32 ms; 80 deliveries; not design-capacity evidence |
                        | Recommendation dataset size and mean Precision@5 | One held-out judgment (`The Signal`); Precision@5 = **0.20 (20%)**; single-title smoke test, not representative of production quality |
                        | Errors, timeouts, dropped samples | Sequential API: 0 errors/300; concurrency API: 0 errors/900; timeline-only AI: 0 errors/100; socket: 80/80 deliveries; two rooms: 40/40 deliveries; provider AI: 1 HTTP 429 and 0 successful samples |
                        | Raw output / evidence attachment | Recommendation Precision@5 result supplied in the session; no raw evaluator output attached. [API rerun](./performance-results-local-2026-10-30-rerun.json), [API concurrency](./performance-results-api-concurrency-local-2026-10-30.json), [timeline-only AI](./performance-results-timeline-ai-local-2026-10-30.json), [Socket.IO](./performance-results-socket-local-2026-10-30.json), [two-room test](./performance-results-multiroom-local-2026-10-30.json), [provider attempt](./performance-results-ai-local-2026-10-30.json); playback snapshot values supplied in the session, no raw browser recording or remote-load output |

                        ## 7. Conclusion

                        The project contains functional checks and instrumentation relevant to the
                        PRD, but the mandatory performance targets remain **unverified**. Before
                        claiming completion against Section 10.2, run the live tests above in a
                        controlled environment, retain raw output, and replace the “Not measured”
                        entries with actual results and test conditions. If a target is missed, report
                        the measured value and discuss the bottleneck rather than presenting the
                        target as an achieved result.
