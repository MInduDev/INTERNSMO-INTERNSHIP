# Data model and sample data

MongoDB is accessed through Mongoose. ObjectId references are noted below;
several room and timeline relationships intentionally use stable title slugs
and room codes in addition to document IDs.

## Collections

| Model / collection | Key fields | Purpose and links |
|---|---|---|
| `User` / `users` | `name`, unique lowercase `email`, hashed `password`, `role`, avatar, stats, genres, subtitle language | Authenticated identities. `role` is `viewer`, `host`, or `admin`; password is bcrypt-hashed before save. |
| `Movie` / `movies` | unique `slug`, title, year, genres, duration, rating, cast/director, description, poster/backdrop, `videoAssetUrl` | Catalogue title used by slug from WatchSpace, TimelineEvent, and Interaction. Default video URL is remote sample media. |
| `WatchSpace` / `watchspaces` | unique room `code`, title, embedded movie and host, participant subdocuments, playback state, visibility/capacity/lock, chat, variation state, status, analytics counters/samples, session questions | Current room and session state. Host/participants reference User IDs; movie title is copied into the room for stable display. |
| `TimelineEvent` / `timelineevents` | `movieId` (title slug), unique `sourceId`, `timestampSeconds`, `timeFormatted`, type, content, metadata | Authored retrieval context, trivia, characters, glossary, and variation points. Indexed by title and timestamp. |
| `Interaction` / `interactions` | `userId`, `titleId` (slug), watched seconds, completion, optional rating, co-watch IDs, room code, genre snapshot | Personalized recommendation signals. |
| `Analytics` / `analytics` | room code, title, duration, peak participants, AI/trivia/chat counts, top questions, sync sample summary | Archived analytics summary. Live room analytics are also held on the WatchSpace document. |

## Relationships

```text
User 1 ──< Interaction >── 1 Movie (titleId uses Movie.slug)
User 1 ──< WatchSpace host / participants
Movie 1 ──< TimelineEvent (movieId uses Movie.slug)
Movie 1 ──< WatchSpace.movie (embedded snapshot)
WatchSpace 1 ──< chat / participants / questions / sync samples (embedded)
WatchSpace.code ──> Analytics.spaceCode
```

## Enumerations and bounds

- User roles: `viewer`, `host`, `admin`.
- Room status: `lobby`, `active`, `ended`; visibility: `Private`, `Public`.
- Room capacity: 2–50; AI co-pilot level: `Minimal`, `Normal`, `Chatty`.
- Timeline types: `Trivia`, `Character`, `Glossary`, `Variation Point`.
- A variation point accepts 2–4 pre-authored options. Asset metadata can
  include `id`, `label`, `assetType`, `videoUrl`, `audioUrl`, `subtitleUrl`,
  `youtubeCaptionLanguage`, and `language`. A YouTube caption variation
  identifies the poll's preferred existing YouTube track by language code.
  Viewers manually select that language in the YouTube CC menu; the app does
  not switch native captions or store/inject an external VTT file.
  Media URLs are accepted only through admin-protected timeline authoring and
  receive server-side `approved`, `approvedBy`, and `approvedAt` metadata.
  Socket voting strips media URLs without that approval stamp. Legacy labels
  remain voteable but cannot switch media.
- A room's `currentVariation` records the selected track URLs and their
  approval metadata so newly joined viewers can apply the same variation.
- Stored room question history is capped at 500 and sync samples at 1,000.

## Seed data

`server/seed/seedData.js` seeds six catalogue titles, seven timeline events
(four for Dune and three for Interstellar), one sample Watch Space (`ABC123`),
two demo users (a host-role account and an admin), one archived analytics row,
and four sample interactions for the first user. The Dune records cover
trivia, character, glossary, and variation event types, but only span the
first five minutes of a 2h35 title; this is not a complete title timeline.
An unsupported, contradictory 00:04:12 character entry was removed from the
seed and client mock data. Remaining authored facts still need editorial and
timestamp review before use as factual AI evidence. More importantly, the
seeded Dune movie does not set `videoAssetUrl`, so it inherits
the Movie model's Big Buck Bunny sample-video default. The timeline timestamps
and events therefore cannot be claimed to match the selected Dune video.
Align the events to a project-approved Dune clip and set its actual asset
before recording a synchronized timeline demo. The variation events contain
labels but no subtitle/video/audio asset URLs, so they support voting but do
not demonstrate an actual media-track swap.

**Destructive operation:** the seed script calls `deleteMany({})` for the
User, Movie, WatchSpace, TimelineEvent, Analytics, and Interaction collections
before inserting fixtures. Point it only at a disposable local database; do
not run it against a shared or production database. It requires different
`DEMO_HOST_PASSWORD` and `DEMO_ADMIN_PASSWORD` values of at least 12
characters from the local `server/.env`; it no longer contains or prints
fixed demo passwords.

There are no bundled movie assets in `client/public/movies`. Confirm sample
media accessibility and its license/terms before including a public demo or
redistributing any asset.
