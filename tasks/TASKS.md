# Tasks

## Status convention

Phases 0 through 4B are complete. Phase 5A and later work remain planned and must be explicitly implemented and validated before their status changes.

## Phase 0 — Documentation and repository foundation — Completed

**Scope:** Establish the product definition, technical direction, safeguards, workflow boundaries, roadmap, and implementation plan.

**Acceptance criteria:** The project is clearly defined as a fictional lab MVP; the stack, workflow, approval gate, voting model, AI boundaries, exclusions, and phased plan are documented.

## Phase 1 — Next.js scaffold — Completed

Strict TypeScript Next.js App Router foundation with Tailwind CSS and baseline quality tooling.

**Validation:** Passed on 2026-07-27: install, lint, typecheck, and production build.

## Phase 2 — Static cinematic interface — Completed

Static, accessible fictional lab screens and clearly labeled demo content.

**Validation:** Passed on 2026-07-27: lint, typecheck, and production build.

## Phase 3 — Fictional movie concepts and ballot form — Completed

Three fictional concepts and a validated curated story-decision form.

**Validation:** Passed on 2026-07-27: lint, 4 focused ballot tests, typecheck, and build.

## Phase 3 UX refinement — Interactive story opening — Completed

Reframed the audience journey as entering an unfinished movie and shaping a personal cut with one decision at a time.

**Validation:** Passed on 2026-07-28: lint, 4 tests, typecheck, and build.

## Phase 3 UX architecture refinement — Dedicated story route — Completed

Separated homepage film-world discovery from `/story/[movieId]` so the interactive flow remains focused and responsive.

**Validation:** Passed on 2026-07-28: lint, 4 tests, typecheck, and build.

## Phase 4 — Trusted vote calculation and durable anonymous-session limits — Completed

### Phase 4A — Deterministic vote calculation and anonymous session limits — Completed

Implemented validated `POST /api/votes` submission, repository abstraction, one-submission-per-session-per-movie duplicate prevention, trusted aggregation, fictional-demo separation, and focused tests using an in-memory repository.

**Validation:** Passed on 2026-07-28: lint, 9 tests, typecheck, and build.

### Phase 4B — Firestore persistence and anonymous-session hashing — Completed

**Scope:** Replace restart-sensitive vote persistence with Cloud Firestore while preserving deterministic validation and API behavior.

**Implemented:**

- Firestore-backed `VoteRepository` using `@google-cloud/firestore`.
- `prototypeVotes/{movieId}` aggregate documents for trusted totals and option counts.
- `prototypeVotes/{movieId}/submissions/{sessionHash}` submission documents for validated option IDs, movie ID, session hash, and server timestamp.
- One Firestore transaction for duplicate detection, submission creation, and aggregate updates.
- SHA-256 hashing of validated browser session IDs using `VOTE_SESSION_HASH_SECRET` and movie ID; raw session IDs are not persisted.
- `FIRESTORE_PROJECT_ID`, optional `FIRESTORE_EMULATOR_HOST`, and `VOTE_SESSION_HASH_SECRET` environment configuration.
- Firestore emulator support when configured.
- Unit tests remain independent from a live Firestore project through `MemoryVoteRepository`.
- API compatibility: `200` accepted, `409` duplicate, `400` validation failure, `503` Firestore configuration unavailable, `500` unexpected persistence failure.
- Fictional seeded demo totals remain separate from real prototype aggregates.

**Known limitation:** Clearing browser storage creates a new anonymous identity. The session hash is duplicate-detection infrastructure, not authentication or production-grade abuse prevention.

**Validation:** Passed during Phase 4B implementation: lint, 9 focused tests, typecheck, and production build.

## Phase 5A — Gemini Audience Analyst — Planned

**Scope:** Generate a validated audience-development brief from trusted server-derived vote aggregates.

**Tasks:** Add server-only `@google/genai` integration, structured output schemas, retry/failure handling, and a minimal creator-facing analysis result.

**Acceptance criteria:** Gemini receives trusted aggregate data only; raw anonymous identifiers are never sent to the model; invalid model output cannot enter workflow state.

**Validation:** Run lint, tests, typecheck, build, schema tests, and mocked model failure scenarios.

## Phase 5B — Audience analysis workflow hardening — Planned

**Scope:** Make the analyst result reliable enough for creator review.

**Tasks:** Add no-data behavior, close-result interpretation, deterministic input shaping, retry limits, and traceable analysis metadata.

**Acceptance criteria:** Analysis remains grounded in trusted stored totals and fails honestly when model output is unavailable or invalid.

## Phase 6 — Creator approval workflow — Planned

Require approval, edit, or rejection of the proposed direction before creative generation.

## Phase 7 — Opening-scene generation — Planned

Produce one opening screenplay scene only after creator approval.

## Phase 8 — Continuity and story-logic analysis — Planned

Analyze the approved direction and opening scene for continuity, chronology, character knowledge, motivation, world rules, setups, payoffs, contradictions, unresolved threads, and plot holes.

## Phase 9 — Workflow persistence and Firestore hardening — Planned

**Scope:** Expand Firestore beyond vote storage to approved briefs, workflow state, generated scenes, and analysis results, while adding reviewed retention and production security configuration.

**Note:** Vote persistence itself was completed early in Phase 4B and is no longer deferred to this phase.

## Phase 10 — Authentication and stronger vote integrity — Planned

Add creator authorization, stronger voter identity/abuse controls, rate limiting, auditability, and reviewed public-deployment safeguards.

## Phase 11 — Agent orchestration — Planned

Formalize ordered workflow states, recoverable failures, retries, observability, and approval gates.

## Phase 12 — Google Cloud Agent Builder and partner MCP integration — Planned

Confirm current hackathon requirements, integrate Agent Builder, implement only the selected partner MCP, and document the trust boundaries.

## Phase 13 — UX, accessibility, testing, and error handling — Planned

Improve keyboard, screen-reader, loading, error, no-data, resilience, and broader test coverage.

## Phase 14 — Deployment and hackathon demo preparation — Planned

Prepare a reliable demo deployment, environment configuration, demo script, smoke tests, and fallback plan using clearly fictional content.
