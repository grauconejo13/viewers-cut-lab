# Decisions

## Accepted decisions

- Phase 0 is documentation only: no scaffold, packages, implementation, or source-code files.
- The stack is Next.js App Router, strict TypeScript, Tailwind CSS, and Next.js route handlers; no separate Render, Express, or FastAPI backend is planned initially.
- Gemini uses `@google/genai` only from server-side code, and structured output will be validated with Zod.
- Deterministic rules decide vote validity; Gemini does not.
- Creator approval is required before screenplay scene generation.
- The MVP contains fictional demonstration content only and makes no claims of real demand, testimonials, or production outcomes.
- The audience journey is framed as an interactive unfinished movie with one story decision at a time.
- Homepage discovery and `/story/[movieId]` are separate so the story flow remains focused and responsive.
- `POST /api/votes` is the trusted boundary for completed cuts; client totals and percentages are never authoritative.
- Cloud Firestore is the current durable prototype vote store.
- Firestore uses `prototypeVotes/{movieId}` for aggregate trusted totals/counts and `prototypeVotes/{movieId}/submissions/{sessionHash}` for one validated completed cut per anonymous session and movie.
- Duplicate detection, submission creation, and aggregate updates happen in one Firestore transaction.
- Anonymous browser session IDs are validated server-side, then hashed with SHA-256 using `VOTE_SESSION_HASH_SECRET` and movie ID before persistence. Raw session IDs are not stored.
- The anonymous session hash is duplicate-detection infrastructure only; it is not authentication or strong anti-abuse protection.
- Fictional seeded counts remain separate from real prototype submissions.
- Unit tests use `MemoryVoteRepository` and do not require a live Firestore project.
- The current vote API contract is `200` success, `409` duplicate, `400` validation failure, `503` missing persistence configuration, and `500` unexpected persistence failure.
- Phase 5A's Audience Analyst sends Gemini only fictional movie/question metadata and the trusted server-derived aggregate; it never sends session IDs, session hashes, or submission documents.
- The Audience Analyst API contract is `200` success, `404` unknown movie ID, `503` missing Gemini or Firestore configuration, `502` Gemini request failure or output that fails Zod validation, and `500` unexpected failure.

## Current environment decisions

- `FIRESTORE_PROJECT_ID` and `VOTE_SESSION_HASH_SECRET` are required for the Firestore-backed vote repository.
- `FIRESTORE_EMULATOR_HOST` is optional for local emulator use and should not be configured for production deployment.
- Real secrets are never committed and never use the `NEXT_PUBLIC_` prefix.

## Provisional decisions

- Firebase Authentication or Google sign-in may be added for stronger identity and creator authorization later.
- Vercel hosts early previews; Cloud Run remains a possible final Google Cloud target.
- Google Cloud Agent Builder is planned for the final agent workflow.
- Responsibilities may begin as deterministic services and workflow modules rather than separate AI agents.
- Stronger rate limiting, abuse controls, auditability, and retention policy remain later hardening work.

## Next authorized phase

Phase 7 — Opening-scene generation. Phase 7 has not started.

Phase 5A is complete: it consumes only trusted server-derived aggregates and validates structured model output before that output enters workflow state. It has passed lint, tests, typecheck, and build using a mocked Gemini client, and has additionally passed live end-to-end validation (real Firestore aggregate read, real Gemini Interactions API on `gemini-3.6-flash`, strict Zod output validation) on 2026-09-01.

Phase 6 is also complete: creator-review state (`analysis_ready`/`approved`/`rejected`/`revision_requested`) is server-authoritative, invalid transitions are rejected deterministically, and an approval gate is in place for Phase 7 to call. Its store (`CreatorReviewRepository`) is in-memory and resets on process restart. It has passed lint, tests, typecheck, and build with mocked dependencies, and live end-to-end validation of the real creator flow for `luminous-archive` (real Gemini execution, review creation, UI rendering, and an `analysis_ready -> approved` transition confirmed via `GET /api/creator-review/luminous-archive` returning `200` with status `"approved"`) on 2026-09-01.

Phase 5B is also complete: below `MIN_AUDIENCE_SUBMISSIONS` (5) trusted submissions, Gemini is skipped entirely and a deterministic, clearly-non-Gemini `AudienceAnalysis` is returned instead; a question's top two options are treated as a close decision when within `CLOSE_DECISION_MARGIN_POINTS` (5 percentage points). It has passed lint, tests, typecheck, and build with a mocked Gemini client, and live end-to-end validation of the real zero-signal path for `luminous-archive` on 2026-09-02: `totalSubmissions = 0`, Gemini was skipped, the deterministic result clearly identified itself as non-Gemini-generated, and creator review creation and approval still worked from it (`GET /api/creator-review/luminous-archive` returned `200` with status `"approved"`). The 5+ submission live Gemini path remains covered only by mocked-client automated tests - it was not re-run live during this validation.

## Unresolved questions

- What creator identity and authorization model is sufficient for the MVP?
- What rate-limit thresholds and held-versus-rejected rules are appropriate for public traffic?
- What exact Zod schemas, Gemini model settings, retry policy, and failure experience should Phase 5A use?
- What continuity severities and creator-resolution actions are needed?
- What Firestore retention/deletion policy and production security configuration are appropriate?

## Hackathon and partner requirements awaiting confirmation

- Partner track implementation should begin only after its exact requirements are confirmed.
- No partner integration should be invented merely to satisfy documentation.
- Hackathon rubric, demo constraints, deployment requirements, and Agent Builder expectations should be rechecked before those phases begin.
