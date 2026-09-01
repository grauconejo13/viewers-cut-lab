# Viewers Cut Lab

Viewers Cut Lab is an audience-driven movie development platform concept. It explores a workflow in which viewers shape curated story decisions, trusted results are interpreted by Gemini into a coherent story direction, creators approve that direction, and later AI agents generate screenplay scenes while checking continuity, story logic, props, chronology, and plot holes.

## Current status

The prototype separates homepage film-world discovery from the focused story route at `/story/[movieId]`. Viewers make one story decision at a time, review their cut, and submit a completed cut through `POST /api/votes`.

Phase 4 is now complete for the current prototype. Vote submissions are validated server-side and persisted in Cloud Firestore. Duplicate prevention, submission creation, and aggregate count updates happen in one transaction. Anonymous browser session IDs are validated and hashed before persistence; raw session IDs are not stored. Trusted prototype results remain separate from all fictional seeded demo counts.

The anonymous session model is intentionally lightweight. Clearing browser storage creates a new anonymous identity, so this is not production-grade abuse prevention or authentication.

## Current stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Next.js route handlers as the backend boundary
- `@google-cloud/firestore` for durable prototype vote persistence
- Official Google Gen AI SDK using `@google/genai` — server-side Audience Analyst implemented in Phase 5A
- Gemini calls only from server-side code
- Zod for model-output validation in AI phases
- Google Cloud Agent Builder planned for the final agent workflow
- Partner MCP integration after the partner track is confirmed
- Vercel for preview deployment
- Cloud Run remains a possible final Google Cloud deployment

## Firestore vote persistence

Current prototype vote data uses:

- `prototypeVotes/{movieId}` for trusted aggregate totals and option counts
- `prototypeVotes/{movieId}/submissions/{sessionHash}` for one validated completed cut per anonymous session and movie

The submission document stores the movie ID, validated option IDs, session hash, and server timestamp. The summary document stores trusted total submissions, option counts, and an updated timestamp.

The transaction checks for an existing submission before creating a new one and updating summary counts. A failed transaction does not intentionally partially increment the aggregate.

## Environment configuration

Copy `.env.example` and configure server-side values as needed:

- `FIRESTORE_PROJECT_ID` — required for the Firestore-backed vote repository
- `VOTE_SESSION_HASH_SECRET` — required server-only secret used when hashing anonymous session IDs
- `FIRESTORE_EMULATOR_HOST` — optional local emulator host; do not set it in production
- `GEMINI_API_KEY` — required server-side for `GET /api/audience-analysis/[movieId]` (Phase 5A); not required for Phase 4 voting

Do not commit real credentials or secrets. Do not prefix server secrets with `NEXT_PUBLIC_`.

## Vote API behavior

`POST /api/votes` returns:

- `200` for a successful first submission
- `409` for an already-submitted cut from the same anonymous session and movie
- `400` for invalid movie, option, answer, or session input
- `503` when Firestore persistence is not configured
- `500` for other persistence failures

Client-provided totals and percentages are never trusted. Counts and stable one-decimal percentages are derived server-side from trusted stored submissions.

## Audience Analyst API (Phase 5A)

`GET /api/audience-analysis/[movieId]` sends only the trusted server-derived aggregate (counts, percentages, total submissions) and fictional movie/question metadata to Gemini - never session IDs, session hashes, or submission documents. The response is validated against a strict Zod schema before it is returned; invalid or unavailable output never reaches the client.

- `200` — validated Audience Analyst result
- `404` — unknown movie ID
- `503` — Gemini or Firestore is not configured
- `502` — the Gemini request failed or its output failed validation
- `500` — unexpected failure

This endpoint has been validated with a mocked Gemini client in tests, and against the real Gemini Interactions API (`gemini-3.6-flash`) and a live Firestore trusted aggregate on 2026-09-01.

## First MVP definition

The first lab MVP includes:

- three clearly fictional movie concepts
- one anonymous completed cut per session per movie in the prototype
- several curated story choices
- trusted vote totals and percentages
- clearly labeled fictional demo ballots when needed
- Gemini audience-development brief
- creator approval gate
- one generated opening scene
- one continuity and story-logic analysis result

## Explicitly out of scope for the first MVP

- public creator marketplace
- real reviews of released films
- payments
- crowdfunding
- comments
- social feeds
- casting
- feature-length screenplay generation
- advanced device fingerprinting
- automatic publishing
- full production management
- real film-production guarantees

## Repository structure

- `docs/` — product requirements, architecture, workflow, security, decisions, roadmap
- `tasks/` — phased implementation plan and backlog
