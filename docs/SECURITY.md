# Security

## Core rules

- Gemini and all model calls run only in server-side code.
- API keys and sensitive configuration never reach browser code.
- `NEXT_PUBLIC_` is never used for secrets, and real `.env` values are never committed.
- All external input is validated before trusted persistence or workflow use.
- Gemini output is validated with Zod (Phase 5A `AudienceAnalysisSchema`, strict-mode) before it changes workflow state or is displayed as structured content.
- Deterministic vote rules remain authoritative; AI never decides ballot validity.

## Current prototype session model

The browser creates an anonymous session identifier for prototype voting. The server validates the identifier before use and hashes it with SHA-256 using `VOTE_SESSION_HASH_SECRET` and the movie ID.

Only the hash is persisted. Raw anonymous session IDs are not stored in Firestore.

The session hash is not authentication or authorization. It exists only to enforce the current one-completed-cut-per-session-per-movie prototype rule. Clearing browser storage creates a new anonymous identity, so this is not strong anti-abuse protection.

## Firestore trust boundary

`POST /api/votes` is the trusted server boundary for completed cuts.

Before persistence, the server validates:

- movie ID,
- session ID format and maximum length,
- required question completeness,
- selected option IDs against trusted movie definitions.

The server never accepts client totals, aggregate counts, percentages, or option labels as authoritative.

## Firestore transaction safety

The current Firestore repository performs duplicate detection, submission creation, and aggregate-count updates inside one transaction. A duplicate submission returns without incrementing counts. Transaction failures must not be treated as accepted submissions by the client.

## Environment variables

Current server-side configuration includes:

- `FIRESTORE_PROJECT_ID` — Firestore project identifier; required for Firestore vote persistence
- `VOTE_SESSION_HASH_SECRET` — required secret used to hash anonymous session IDs
- `FIRESTORE_EMULATOR_HOST` — optional local emulator host and not intended for production deployment
- `GEMINI_API_KEY` — required server-side secret for the Phase 5A Audience Analyst (`GET /api/audience-analysis/[movieId]`); never exposed with `NEXT_PUBLIC_`

Never commit real values. Keep `VOTE_SESSION_HASH_SECRET` private and sufficiently random. Rotate it intentionally because changing it changes duplicate-detection hashes for future requests.

## Emulator and tests

When `FIRESTORE_EMULATOR_HOST` is configured, the Firestore client connects to that emulator host without SSL. Unit tests use `MemoryVoteRepository`, so normal test runs do not need production credentials or a live Firestore project.

## Data minimization

Current vote persistence stores only the movie ID, validated option IDs, a one-way anonymous session hash, and server timestamps needed for trusted prototype aggregation and duplicate prevention.

The MVP does not collect device fingerprints. Fictional demo counts remain separate from real prototype submissions.

## API failure behavior

- invalid submissions return `400`,
- duplicates return `409`,
- missing Firestore configuration returns `503`,
- unexpected persistence failures return `500`.

Failures should be logged without secrets or unnecessary request payload data.

## Gemini trust boundary (Phase 5A)

`GET /api/audience-analysis/[movieId]` sends Gemini only fictional movie/question metadata and the trusted server-derived aggregate (counts, percentages, total submissions). Session IDs, session hashes, and submission documents are never sent to Gemini.

- unknown movie ID returns `404`,
- missing `GEMINI_API_KEY` or Firestore configuration returns `503`,
- a failed Gemini request or output that fails Zod validation returns `502`,
- unexpected failures return `500`.

## Before public or production-grade deployment

Add and review rate limiting, abuse monitoring, authentication or stronger identity controls, audit logs, Firestore access/security configuration, retention/deletion policy, secret management, creator authorization, and incident/failure observability.
