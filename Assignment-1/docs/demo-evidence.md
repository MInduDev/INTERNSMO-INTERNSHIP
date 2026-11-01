# Local demo and evidence capture runbook

This runbook prepares a reproducible local demonstration. It does not claim
that a live multi-client recording or production latency measurement has
already been captured.

## 1. Prepare an isolated demo environment

1. Install dependencies in `server` and `client` with `npm install`.
2. Copy `server/.env.example` to `server/.env`.
3. Configure `MONGO_URI` to a disposable local database and set two distinct,
   randomly generated JWT secrets. Keep `.env` local; never share its contents.
4. Start MongoDB.
5. To use the fixture data, set different private `DEMO_HOST_PASSWORD` and
   `DEMO_ADMIN_PASSWORD` values (at least 12 characters) in `server/.env`.
   Run `npm run seed` from `server` **only after verifying the selected
   database is disposable**. The seed clears all six application collections.
6. Start the API with `npm run dev` from `server`, then start Vite with
   `npm run dev` from `client`.
7. Check `GET http://localhost:5000/api/health`.
8. Use the seeded account emails with the private passwords from your local
   `.env`, or register fresh accounts. The seed script does not print
   passwords. Do not reuse seeded credentials outside the disposable demo.

For provider-backed AI only, set `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`
to a compatible chat-completions provider. Leave them blank to demonstrate
timeline-only answers. Never include API keys in evidence.

### AI scope for this submission

The verified demonstration scope is timeline-only, retrieval-grounded
question answering with source event IDs. Provider-backed generation is an
optional extension, not a submission claim: the available provider attempt
was rejected with HTTP 429 before a successful answer could be captured.
Describe this feature as timeline-grounded Q&A, not as a verified
provider-backed generative AI demo.

## 2. Capture the PRD scenarios

### Synchronized room

1. Open two separate browser profiles/devices and sign in with distinct users.
2. Have the first user create a Watch Space and share the invite code.
3. Join the second browser, wait for the initial sync state, and start playback
   as Host.
4. Record both clients while the Host pauses, resumes, and seeks. Include a
   reconnect scenario and note browser versions, device/network setup, room
   code (redact if public), and number of participants.
5. Do not claim an SLA from a local same-process run.

### Grounded AI

1. Use a title with timeline content only after verifying that its timeline
   matches the actual video asset. The seeded Dune title currently inherits
   the Movie model's Big Buck Bunny sample-video default, so its timeline is
   not aligned to the playing asset. Do not present it as a valid synchronized
   Dune demonstration until the project-approved clip and timeline are aligned.
2. Ask a question whose answer is present in an event at or before current
   playback time.
3. Capture the question, answer, timestamp, and visible/source event ID.
4. Ask a question unsupported by the available timeline and capture the
   abstention/low-confidence behavior.
5. Record whether the optional external provider was configured, without
   exposing the secret.

### Variation vote and subtitle/localization

1. In the Admin Timeline screen, author a Variation Point with 2–4 JSON option
   objects. Add a reachable, permitted `.vtt` URL (and a direct HTML5 video
   source for external tracks). The admin-only API stamps media options as
   approved; the client cannot self-approve assets.
2. Open the vote as Host, cast different participant votes, then capture the
   result and asset applied by each browser. Video options switch the video;
   audio options switch the synchronized audio track; subtitle options load
   WebVTT subtitles.
3. Verify both clients render the same approved winning variation, including
   a viewer who joins after it has been selected. Do not use
   copyrighted media/subtitles unless you have permission to do so.

### Recommendations, tests, and RBAC

1. Create interactions by watching/rating multiple titles, then capture the
   recommendation results and response `method`. Label the data as demo data.
2. Run the backend test commands in the README and save complete console
   output, exit code, date, and Node/npm versions.
3. Sign in as a viewer and attempt an admin-only action; capture the server
   `403` response. Also capture rejection of a Host-only socket action from a
   non-Host participant.

## 3. Latency measurements

For the API workflow use `npm run test:api --prefix server` with
`TEST_API_URL`, `TEST_EMAIL`, and `TEST_PASSWORD` configured in the environment.
For the sync script use `npm run test:sync-performance --prefix client` and
configure `TEST_ROOM_CODE`, `TEST_HOST_TOKEN`, and comma-separated
`TEST_VIEWER_TOKENS`. Use a disposable room and credentials. Record machine,
network, client count, sample count, warm-up, and raw percentiles. The sync
script is a local Socket.IO benchmark and is not representative of a
cross-network or production SLA.

## 4. Evidence handling

Keep original screenshots/recordings, the sanitized report, and commands used
to generate them together. Redact access tokens, refresh tokens, emails where
not needed, API keys, and private room codes. Add only evidence actually
captured; never replace missing evidence with mock data or an illustrative
image.

The current local captures and their limits are listed in
[`evidence/README.md`](../evidence/README.md). In particular, the local
two-client screenshot used tabs in one browser profile, and the formatted
AI/RBAC/test result images are not application or terminal screenshots.
