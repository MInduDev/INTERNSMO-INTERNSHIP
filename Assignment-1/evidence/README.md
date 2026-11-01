# Demo evidence

The PNGs in this folder were captured from the local application and its live
local API on 2026-10-31. They document a local demo, not a production
deployment, independent-browser/network synchronization test, or complete PRD
verification. Some captures are formatted views of actual API/test output
rather than screenshots of the application UI; those are identified below.
The local database was empty before capture; temporary demo fixtures were
removed afterward, so the database is empty again. The generated demo room
code and unnecessary seeded participant display names were redacted from the
relevant captures before sharing.

| File | Captured content | Scope and limitation |
|---|---|---|
| `01-authentication.png` | Sign-in screen | Fresh capture of the current UI; it describes real-time playback sync without an unsupported numeric drift claim. No credentials are shown. |
| `02-create-space.png` | Create Watch Space form | UI capture of the form before submission. |
| `03-two-browser-sync.png` | Connected Host and Viewer room state at the same playback timestamp | Two local app clients in tabs of the same browser profile; not independent browser profiles, devices, or cross-network drift evidence. |
| `04-chat.png` | Room chat with a submitted message | UI capture from the local room. |
| `05-ai-qna.png` | Grounded answer, timestamp, source event ID, and provider mode | Formatted from an actual HTTP 200 local API response in timeline-only mode; not a screenshot of the in-app chat UI or provider-backed answer. |
| `06-trivia.png` | Timeline trivia overlay | UI capture of the seeded timeline event. |
| `07-variation-vote.png` | Active seeded variation vote | Local vote UI; the capture is viewport-clipped, and seeded choices have no compatible media/subtitle assets. No asset switch is demonstrated. |
| `08-recommendation.png` | Recommendation screen | Local seeded catalogue/cold-start view; not evidence of representative personalized recommendation quality. |
| `09-analytics.png` | Session analytics screen | Local session snapshot; the displayed sample counts are limited to that demo session. |
| `10-admin.png` | Admin timeline console | Admin UI against seeded timeline data; authored timeline content still needs editorial review. |
| `11-rbac.png` | Admin-only endpoint rejection | Formatted view of an actual local `POST /api/timeline` response: HTTP 403 using a Host-role token; not an app UI screenshot. |
| `12-tests.png` | Six backend test suites marked passing | Formatted summary of the capture-time test output; the later dedicated playback suite is verified separately and is not shown in this image. |

Use the [demo capture runbook](../docs/demo-evidence.md) for reproduction
steps. Redact access and refresh tokens, passwords, API keys, private room
codes, and personal information that is not needed to demonstrate the feature.
