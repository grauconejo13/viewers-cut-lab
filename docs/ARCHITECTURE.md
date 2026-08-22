# Architecture

## High-level approach

The implementation is a lightweight product prototype with a Next.js frontend, server-side route handlers, deterministic vote services, durable Firestore persistence, and later server-side AI workflows.

## Current technical architecture

- Frontend: Next.js App Router and TypeScript
- Styling: Tailwind CSS
- Backend entry points: Next.js route handlers
- Vote persistence: Cloud Firestore via `@google-cloud/firestore`
- Vote tests: repository abstraction with `MemoryVoteRepository`
- AI integration: official Google Gen AI SDK via `@google/genai` planned for Phase 5A
- Validation: trusted server definitions for vote input; Zod planned for model-output validation
- Deployment: Vercel preview deployment, with Cloud Run as a possible future Google Cloud target

## Audience routes

The public audience UI is split between:

- `/` — film-world discovery and product framing
- `/story/[movieId]` — focused, responsive story decisions, review, completion, and exit handling

The route parameter selects an existing fictional concept. Client state manages the in-progress cut until submission. Exiting an in-progress story requires confirmation.

## Trusted vote boundary

`POST /api/votes` is the current server trust boundary for completed cuts.

The route:

1. parses the request body,
2. validates movie ID, anonymous session ID, completeness, and selected option IDs against trusted movie definitions,
3. loads the Firestore-backed repository from server environment configuration,
4. hashes the validated anonymous session ID with `VOTE_SESSION_HASH_SECRET` and the movie ID,
5. submits the validated cut to the repository,
6. returns trusted server-derived aggregate counts and percentages.

The browser cannot submit authoritative totals, percentages, labels, or aggregate counts.

## Firestore data model

### Aggregate document

`prototypeVotes/{movieId}`

Stores:

- `movieId`
- `totalSubmissions`
- `counts`
- `updatedAt`

### Submission document

`prototypeVotes/{movieId}/submissions/{sessionHash}`

Stores:

- `movieId`
- `sessionHash`
- validated `optionIds`
- `createdAt`

Raw browser session IDs are not persisted.

## Transaction boundary

`FirestoreVoteRepository.submit()` uses one Firestore transaction for the duplicate check, submission creation, and aggregate update.

Within the transaction:

- the submission document is checked first,
- an existing document returns a duplicate result without incrementing counts,
- a new submission writes the submission document and updated aggregate together,
- count calculations use only server-validated option IDs.

This boundary prevents an accepted submission from intentionally updating only part of the trusted vote state. Firestore transaction retry semantics handle conflicting concurrent writes.

## Anonymous identity boundary

The browser creates an anonymous session identifier for the prototype. The server validates its format and length before use. The server then computes a SHA-256 hash from the server-only secret, movie ID, and session ID.

The hash is only a duplicate-detection key. It is not authentication, authorization, or strong anti-abuse protection. Clearing browser storage creates a new anonymous identity.

## Environment configuration

Server-side vote persistence uses:

- `FIRESTORE_PROJECT_ID` — required
- `VOTE_SESSION_HASH_SECRET` — required and secret
- `FIRESTORE_EMULATOR_HOST` — optional for local emulator use

When the emulator host is set, the Firestore client connects to that host without SSL. Unit tests do not require Firestore and use `MemoryVoteRepository` instead.

## Architectural principles

- Keep Gemini calls on the server.
- Treat AI as an interpretation layer, not a source of truth for ballot validity.
- Use deterministic logic before AI interpretation whenever possible.
- Preserve creator approval gates before generating creative output.
- Keep fictional seeded demo totals separate from real prototype submissions.
- Keep vote storage behind a repository boundary so persistence can evolve without changing the audience contract.
- Keep the initial implementation free of a separate Express, FastAPI, or Render backend.

## Proposed system boundaries

- UI layer: cinematic story experience, concept presentation, review, and approval screens
- Application layer: ballot handling, vote aggregation, integrity checks, workflow state transitions
- AI layer: audience analysis, story-brief generation, scene generation, continuity/story-logic review
- Data layer: Firestore persistence for current prototype votes and later workflow state

## Deployment direction

The current prototype can run on Vercel with server-side Firestore configuration. The architecture should remain compatible with later Google Cloud deployment and Agent Builder orchestration.
