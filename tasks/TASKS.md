# Tasks

## Status convention

Phases 0 through 6 are complete, with Phase 6 implemented ahead of Phase 5B at the explicit request that directed that work. Phase 7 and all later work remain planned and must be explicitly implemented and validated before their status changes.

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

## Phase 5A — Gemini Audience Analyst — Completed

**Scope:** Generate a validated Audience Analyst result from trusted server-derived vote aggregates.

**Implemented:**

- `src/lib/audienceAnalyst.ts` — server-only `@google/genai` integration using the Interactions API (`ai.interactions.create`, model `gemini-3.6-flash`) with a structured `response_format` JSON schema, a strict Zod schema (`AudienceAnalysisSchema`) with `dominantPreferences`, `closeDecisions`, `audienceTensions`, `narrativeRisks`, and `recommendedDirection`, and a minimal `AudienceAnalystModel` interface so the model call can be mocked in tests.
- `GET /api/audience-analysis/[movieId]` — looks up the movie, loads the trusted aggregate through the existing `VoteRepository`, calls Gemini, and validates its output before responding.
- `VoteRepository.getAggregate(movieId)` — a read-only trusted-aggregate accessor added to both `MemoryVoteRepository` and `FirestoreVoteRepository` so the analyst never needs submission documents, session hashes, or raw session IDs.
- Response codes: `404` unknown movie ID, `503` missing Gemini or Firestore configuration, `502` Gemini request failure or output that fails Zod validation, `500` unexpected failure.

**Not yet done:** no-data/close-result interpretation hardening was completed in Phase 5B (see below); the result is not yet wired into a creator-facing brief beyond the Phase 6 creator-review workflow.

**Acceptance criteria:** Gemini receives trusted aggregate data only; raw anonymous identifiers are never sent to the model; invalid model output cannot enter workflow state.

**Validation:** Passed with mocked Gemini client: lint, 18 tests, typecheck, and production build.

**Live end-to-end validation:** Passed on 2026-09-01 against `GET /api/audience-analysis/luminous-archive` using real infrastructure: a Firestore trusted-aggregate read, the real Gemini Interactions API (`gemini-3.6-flash`), and strict Zod output validation. The endpoint returned `200` with a structured Audience Analyst result. The aggregate used had zero trusted submissions, and Gemini correctly returned a no-signal / wait-for-participation recommendation rather than fabricating audience patterns - confirming the schema and prompt hold up on real, unvalidated model output as well as on the mocked test cases. Close-result and no-data *handling* (beyond Gemini's own honest response) remains Phase 5B scope.

## Phase 5B — Audience analysis workflow hardening — Completed

**Scope:** Make the analyst result reliable enough for creator review, and clearer around low-signal data, without changing the Phase 4B voting behavior, the Phase 5A Gemini contract, or the Phase 6 creator-review workflow and approval gate.

**Implemented:**

- `MIN_AUDIENCE_SUBMISSIONS` (currently `5`) in `src/lib/audienceAnalyst.ts` - below this many trusted submissions, `analyzeAudience` skips Gemini entirely (this covers zero submissions too) and returns a deterministic, non-Gemini `AudienceAnalysis` from `buildDeterministicAnalysis`. Every string in that result explicitly says "deterministic" and never claims to be Gemini-generated, so it is unambiguous in the data itself, not just in code. A dedicated `narrativeRisks` entry names the exact submission count and the threshold. The result always validates against the unchanged, strict `AudienceAnalysisSchema`.
- `CLOSE_DECISION_MARGIN_POINTS` (currently `5` percentage points) and `detectCloseDecisions()` - deterministically flags a question's top two options as a close decision when they are tied or within this margin, purely from trusted percentages. Used two ways: included in the trusted input sent to Gemini once the threshold is met (with an added prompt instruction not to invent certainty where a question is marked close), and surfaced directly in the deterministic low-signal result without calling Gemini.
- `src/lib/creatorReviewUi.ts` - two pure helpers extracted from `CreatorReviewPanel` so loading/error UI logic is unit-testable without a DOM/component framework: `analysisTriggerLabel` (busy copy, e.g. "Analyzing audience signal…", no fake progress percentage) and `resolveErrorMessage` (safe fallback text, never a raw stack trace or provider secret).
- `CreatorReviewPanel` - distinguishes the initial state-check load ("Loading creator review…") from the Gemini-backed analysis request (trigger button reads "Analyzing audience signal…" and is disabled, with `aria-busy`, while in flight); errors surface via the existing alert region instead of the UI appearing frozen. The public `/story/[movieId]` flow is untouched.

**Acceptance criteria:** Analysis remains grounded in trusted stored totals; zero and below-threshold submissions never reach Gemini and still produce schema-valid, clearly-deterministic output; close/tied results are surfaced instead of invented certainty; a deterministic result remains valid input for starting a Phase 6 creator review; Phase 4B voting, the Phase 5A route contract, and Phase 6 transitions/approval gate are unchanged.

**Validation:** Passed with a mocked Gemini client: lint, 44 tests (14 new, covering zero/below-threshold/at-threshold Gemini gating, exact-tie/near-tie/non-close/boundary detection, the Gemini prompt carrying detected close decisions, deterministic output validating against `AudienceAnalysisSchema`, a deterministic analysis starting a creator review, and the two extracted UI helpers), typecheck, and production build.

**Live end-to-end validation:** Passed on 2026-09-02 against the real zero-signal path for `luminous-archive`: `totalSubmissions = 0`, Gemini was skipped, and a deterministic `AudienceAnalysis` was returned that clearly identified itself as non-Gemini-generated. Creator review creation and creator approval still worked against this deterministic result, and `GET /api/creator-review/luminous-archive` returned `200` with status `"approved"`. The 5+ submission live Gemini path (`MIN_AUDIENCE_SUBMISSIONS = 5`) remains covered only by the mocked-client automated tests above; it was not re-run live during this validation.

## Phase 6 — Creator approval workflow — Completed

**Scope:** Require approval, edit, or rejection of the proposed direction before creative generation.

**Implemented:**

- `src/lib/creatorReview.ts` - a `CreatorReview` model (`movieId`, the Phase 5A `AudienceAnalysis`, `status`, optional `note`, `createdAt`/`updatedAt`) with four states (`analysis_ready`, `approved`, `rejected`, `revision_requested`); a deterministic transition table where only `analysis_ready -> approved | rejected | revision_requested` is valid and anything else throws `CreatorReviewTransitionError`; a Zod-validated decision request (`action`, optional `note`); a storage-agnostic `CreatorReviewRepository` interface (`get`/`save`) with an in-memory implementation, matching the Phase 4A-before-4B pattern so Firestore persistence can be added later without changing route contracts; and an approval gate (`isApprovedForGeneration` / `requireApprovedReview`) for Phase 7 to call.
- `GET /api/creator-review/[movieId]` - retrieves the current review (`404` unknown movie or no review started).
- `POST /api/creator-review/[movieId]` - starts/restarts a review by running the existing Phase 5A Audience Analyst pipeline unchanged and storing its result as a new `analysis_ready` review (`404`/`503`/`502` mirror the Phase 5A route's own error mapping).
- `POST /api/creator-review/[movieId]/decision` - approve/reject/request-revision with an optional note (`400` invalid request, `404` unknown movie or no review started, `409` invalid transition).
- `/creator/[movieId]` - a minimal internal review page (`CreatorReviewPanel`), reachable only by direct URL and not linked from the public homepage or `/story/[movieId]` flow, showing dominant preferences, close decisions, audience tensions, narrative risks, recommended direction, and Approve / Request revision / Reject controls.

**Known limitation:** `CreatorReviewRepository` is in-memory (`MemoryCreatorReviewRepository`) and resets on process restart; Firestore persistence for review state is deferred, structured so it can be added later without changing route contracts. Screenplay generation, continuity analysis, Agent Builder, and partner MCP remain explicitly out of scope for this phase.

**Acceptance criteria:** Creator-review state is server-authoritative; invalid transitions are rejected deterministically; a screenplay cannot be generated before an approved review (enforced by the Phase 6 approval-gate helper, to be called once Phase 7 exists).

**Validation:** Passed with mocked dependencies: lint, 30 tests (12 new, covering valid/invalid transitions, decision-request validation, creator-note handling, and approval-gate behavior), typecheck, and production build.

**Live end-to-end validation:** Passed on 2026-09-01 against the real creator flow for `luminous-archive`: real Gemini Audience Analyst execution, creator-review creation, creator-review UI rendering, and a successful `analysis_ready -> approved` transition. `GET /api/creator-review/luminous-archive` returned `200` with status `"approved"`, and approval-gate logic was confirmed intact.

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
