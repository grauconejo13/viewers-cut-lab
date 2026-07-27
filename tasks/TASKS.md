# Tasks

## Status convention

Phases 0, 1, and 2 are complete. All later phases are planned and must be validated
before their status is changed or this file is updated.

## Phase 0 — Documentation and repository foundation — Completed

**Scope:** Establish the product definition, technical direction, safeguards,
workflow boundaries, roadmap, and implementation plan.

**Tasks:** Create the required README, agent guidance, product, architecture,
AI workflow, voting integrity, continuity, security, decision, roadmap, task,
and backlog documentation.

**Acceptance criteria:** The project is clearly defined as a fictional lab MVP;
the stack, workflow, approval gate, voting model, AI boundaries, exclusions,
and phased plan are documented.

**Validation:** Review all documents for internal consistency; confirm that no
application source files, package installation, voting implementation, or Gemini
implementation were introduced.

## Phase 1 — Next.js scaffold — Completed

**Scope:** Create a strict TypeScript Next.js App Router foundation with
Tailwind CSS and baseline quality tooling.

**Tasks:** Scaffold the app, configure linting/type checking, and establish
server-only configuration boundaries.

**Acceptance criteria:** The app builds and has no exposed secret configuration.

**Validation:** Passed on 2026-07-27.

- `npm install` — passed; installed the locked scaffold dependencies.
- `npm.cmd run lint` — passed with no ESLint findings.
- `npm.cmd run typecheck` — passed (`tsc --noEmit`).
- `npm.cmd run build` — passed; Next.js production build completed successfully.

## Phase 2 — Static cinematic interface — Completed

**Scope:** Build static, accessible lab screens using clearly fictional content.

**Tasks:** Create concept, voting, result, and creator-review presentation
states without live logic.

**Acceptance criteria:** The interface communicates the lab workflow and labels
all demo content as fictional.

**Validation:** Passed on 2026-07-27.

- `npm.cmd run lint` — passed with no ESLint findings.
- `npm.cmd run typecheck` — passed (`tsc --noEmit`).
- `npm.cmd run build` — passed; the static routes compiled and prerendered successfully.
- Visual browser review could not run because no browser surface was available in the environment.

## Phase 3 — Fictional movie concepts and ballot form — Planned

**Scope:** Add three fictional concepts and a validated curated ballot form.

**Tasks:** Model rounds and choices for lead/supporting character, setting,
genre blend, tone, conflict, relationship, major event, and ending style.

**Acceptance criteria:** A ballot captures all choices for one round and rejects
invalid external input.

**Validation:** Run lint, tests, type checking, build, and form-validation tests.

## Phase 4 — Vote calculation and anonymous session limits — Planned

**Scope:** Add server-enforced one-ballot-per-session-per-round behavior.

**Tasks:** Implement secure anonymous session handling, deterministic ballot
status rules, trusted aggregation, and clearly labeled demo data.

**Acceptance criteria:** Duplicate prevention is server-enforced; raw and
trusted counts differ when needed; percentages use trusted ballots.

**Validation:** Run lint, tests, type checking, build, and integrity scenarios.

## Phase 5 — Gemini audience-analysis integration — Planned

**Scope:** Generate a validated audience-development brief from trusted totals.

**Tasks:** Add server-only `@google/genai` integration, Zod schemas, and failure
handling.

**Acceptance criteria:** Gemini receives trusted aggregates only and invalid
model output cannot enter workflow state.

**Validation:** Run lint, tests, type checking, build, schema tests, and mocked
failure scenarios.

## Phase 6 — Creator approval workflow — Planned

**Scope:** Require approval, edit, or rejection of the proposed direction.

**Tasks:** Model workflow states and creator decisions.

**Acceptance criteria:** A scene cannot be generated before an approved brief.

**Validation:** Run lint, tests, type checking, build, and state-transition tests.

## Phase 7 — Opening-scene generation — Planned

**Scope:** Produce one opening screenplay scene after approval.

**Tasks:** Add the Screenwriter workflow and validate its structured result.

**Acceptance criteria:** Exactly one reviewable scene is generated only from
approved direction.

**Validation:** Run lint, tests, type checking, build, schema tests, and approval-gate tests.

## Phase 8 — Continuity and story-logic analysis — Planned

**Scope:** Analyze the approved direction and opening scene.

**Tasks:** Return findings on physical continuity and story logic.

**Acceptance criteria:** Analysis covers knowledge, motivation, props,
condition, costumes, injuries, locations, chronology, rules, setups, payoffs,
unresolved threads, contradictions, and plot holes.

**Validation:** Run lint, tests, type checking, build, and representative finding tests.

## Phase 9 — Firestore persistence — Planned

**Scope:** Persist approved MVP data in Cloud Firestore.

**Tasks:** Define schemas, access rules, migrations/fixtures, and retention.

**Acceptance criteria:** Core workflow data persists safely with documented access control.

**Validation:** Run lint, tests, type checking, build, and Firestore-rule tests.

## Phase 10 — Authentication and stronger vote integrity — Planned

**Scope:** Add authenticated voting and public-deployment integrity controls.

**Tasks:** Add Firebase Authentication or Google sign-in, rate limiting, and auditability.

**Acceptance criteria:** Authenticated rules and abuse controls are enforced server-side.

**Validation:** Run lint, tests, type checking, build, and security/integrity tests.

## Phase 11 — Agent orchestration — Planned

**Scope:** Formalize workflow orchestration and recoverable failures.

**Tasks:** Implement ordered states, retries, observability, and approval gates.

**Acceptance criteria:** The Orchestrator prevents out-of-order execution.

**Validation:** Run lint, tests, type checking, build, and workflow tests.

## Phase 12 — Google Cloud Agent Builder and partner MCP integration — Planned

**Scope:** Integrate Agent Builder and only the partner MCP selected by the confirmed track.

**Tasks:** Confirm requirements, implement the selected integration, and document boundaries.

**Acceptance criteria:** No invented partner integration; confirmed requirements are met.

**Validation:** Run lint, tests, type checking, build, and partner-required validation.

## Phase 13 — UX, accessibility, testing, and error handling — Planned

**Scope:** Improve usability, accessibility, resilience, and test coverage.

**Tasks:** Address keyboard, screen-reader, loading, error, and no-data states.

**Acceptance criteria:** Core flows are accessible and failures are honest and actionable.

**Validation:** Run lint, tests, type checking, build, accessibility checks, and manual QA.

## Phase 14 — Deployment and hackathon demo preparation — Planned

**Scope:** Prepare a safe, reliable demo deployment and presentation.

**Tasks:** Configure deployment, environment handling, demo script, and fallback plan.

**Acceptance criteria:** The demo uses fictional content and meets confirmed hackathon rules.

**Validation:** Run lint, tests, type checking, build, deployment smoke tests, and demo rehearsal.
