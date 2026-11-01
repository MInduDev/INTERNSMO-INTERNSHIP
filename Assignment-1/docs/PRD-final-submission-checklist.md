# PRD final submission checklist

This checklist reflects the current workspace, not a claim that every
submission requirement has been demonstrated. See the [PRD requirement
mapping](./PRD-requirement-mapping.md) and [testing report](./testing-report.md)
for implementation details and evidence limitations.

## Project and documentation

- [x] React client and Express/Socket.IO/MongoDB server are present.
- [x] README and safe server environment template are present.
- [x] `server/.env` is excluded from the prepared source archive and by `.gitignore`; keep the local file out of any manual upload.
- [x] Architecture, API, and data-model documentation are present.
- [x] Performance report, testing report, demo runbook, and retrospective are present.
- [x] Requirement mapping and this checklist are present.
- [ ] Confirm the retrospective accurately reflects the project owner's experience and add their challenge and scope rationale.
- [x] Create a local Git repository with a labeled source-snapshot commit and a separate follow-up fix commit; this is genuine history from 2026-10-31, not reconstructed past history.
- [ ] Connect the local repository to the intended GitHub remote and publish it; no remote was provided or configured.

## Functional demonstrations and evidence

- [x] Capture authentication and Watch Space creation.
- [x] Capture a local Host/Viewer room with matching playback timestamps; this used two tabs in one browser profile and a Dune label over the default Big Buck Bunny video asset.
- [ ] Record independent authenticated browser profiles synchronizing play, pause, seek, and reconnect with the approved demo video.
- [x] Set the submission AI scope to timeline-only, retrieval-grounded Q&A; do not claim provider-backed generation.
- [x] Capture local chat, timeline-only API answer with source event ID, and trivia; the answer is not an in-app AI screenshot and seeded timeline/video alignment needs correction.
- [x] Capture a variation vote; seeded options are label-only.
- [ ] Capture an admin-authored, approved video/audio/subtitle variation applied by two clients.
- [x] Capture the local recommendation screen; representative interaction-based quality evaluation remains outstanding.
- [x] Capture local analytics and an HTTP 403 for a Host-role attempt at an admin-only API action.
- [x] Add an automated assertion that a Viewer playback-control socket event is rejected without changing room state or broadcasting.
- [ ] Capture a live viewer denied a Host-only socket action.
- [x] Add the 12 local PNG captures to [`evidence/`](../evidence/README.md), with each capture's scope and limitations documented; some are formatted response summaries rather than app/terminal screenshots.

## Tests and measurements

- [x] Automated auth/RBAC, socket, AI grounding/provider contract, analytics, and recommendation checks are documented as passing.
- [x] Dedicated playback state-transition tests cover play, pause, seek, resume, elapsed-time accounting, and invalid input.
- [x] Remove the unsupported `< 50ms` login-screen drift claim; actual playback drift remains unmeasured.
- [x] Local API and Socket.IO benchmark limitations are recorded.
- [x] Run seven focused backend test suites; the existing formatted result image predates the added playback suite.
- [ ] Measure actual cross-client playback drift and record topology, environment, and sample count.
- [ ] Run authenticated API integration checks with a disposable database and test account.
- [ ] If claiming provider-backed AI performance, collect successful provider samples; current provider attempt was blocked by HTTP 429.
- [ ] Evaluate recommendation quality on a representative held-out labeled dataset before claiming a quality score.

## Before sharing

- [ ] Verify all sample media and subtitle URLs are reachable and permitted for the intended demo.
- [x] Redact room codes and unnecessary seeded participant names from available evidence; no tokens, passwords, or API keys are shown.
- [ ] Re-read the [performance report](./performance-report.md) and keep local smoke results distinct from production claims.
