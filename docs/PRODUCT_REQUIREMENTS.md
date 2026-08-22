# Product Requirements

## Product vision

Viewers Cut Lab is a fictional, audience-driven movie development experiment. The experience should feel like a controlled lab for collaborative story exploration, where audience decisions are treated as creative input rather than a guarantee of outcome.

## Audience experience framing

The public opening experience frames participation as entering an unfinished story: enter a film world, make one story decision at a time, review a personal cut, and then complete it. Audience-facing language should prefer story decisions and "Your Cut" over survey terminology.

The homepage introduces the film worlds and product context. Selecting a concept opens `/story/[movieId]`, where one story decision is shown at a time. Exiting a story with choices requires confirmation.

Completed cuts submit to the trusted server boundary. Server aggregation returns counts and stable one-decimal percentages; these real prototype results remain visibly separate from fictional seeded demo counts.

## Current Phase 4 vote behavior

- A browser-generated anonymous session ID is validated server-side.
- One completed submission is accepted per anonymous session and movie.
- The server validates movie and selected option IDs against trusted definitions.
- The raw anonymous session ID is hashed with a server-only secret and movie ID before persistence.
- Firestore stores trusted submissions and aggregate counts durably.
- Duplicate detection and aggregate updates happen atomically in one transaction.
- Client totals, percentages, labels, and counts are never authoritative.
- Clearing browser storage creates a new anonymous identity, so this prototype mechanism is not production-grade abuse prevention.

## Core workflow

1. A creator defines a fictional movie premise and a set of curated choices.
2. Viewers complete one cut for one movie.
3. A cut may include choices for lead character, supporting character, setting, genre blend, tone, conflict, relationship direction, major story event, and ending style.
4. The app validates and persists trusted submissions.
5. The app calculates trusted counts and percentages server-side.
6. Gemini analyzes trusted aggregate results.
7. Gemini creates a coherent audience-development brief.
8. The creator approves, edits, or rejects the direction.
9. Gemini generates one opening screenplay scene after approval.
10. A continuity and story-logic system analyzes the scene and surrounding story assumptions.

## MVP goals

The first lab MVP should prove that:

- a fictional movie premise can be presented clearly,
- viewers can participate in a focused story-decision flow,
- trusted audience signals can persist and aggregate safely enough for the prototype,
- aggregate audience signals can be converted into a structured story brief,
- a creator approval gate can protect the story direction process,
- a single opening scene and analysis result can be produced from the approved direction.

## Functional requirements

- Present three clearly fictional movie concepts.
- Support one anonymous completed cut per session per movie for the prototype.
- Validate movie and option IDs on the server.
- Persist trusted submissions and aggregate counts in Firestore.
- Return duplicate submissions without incrementing trusted totals.
- Show trusted vote totals and one-decimal percentages.
- Display clearly labeled fictional demo ballots when necessary and never merge them into real prototype totals.
- Generate a Gemini audience-development brief from trusted aggregates.
- Require creator approval before scene generation.
- Produce one opening scene and one continuity/story-logic analysis within the lab MVP.

## API requirements

`POST /api/votes` must provide:

- `200` for a successful first submission,
- `409` for a duplicate session/movie submission,
- `400` for invalid submission data,
- `503` when Firestore persistence is not configured,
- `500` for unexpected persistence failures.

A failed submission must not be presented to the viewer as accepted.

## Explicit exclusions for the first MVP

The first MVP must not include public creator marketplaces, released-film reviews, payments, crowdfunding, comments, social feeds, casting, feature-length screenplay generation, advanced device fingerprinting, automatic publishing, full production management, or real film-production guarantees.

## Responsibilities

- Vote Integrity Service: deterministic validation, duplicate prevention, and later abuse controls.
- Audience Analyst: interprets trusted percentages and close results.
- Story Architect: creates the proposed story direction and outline.
- Screenwriter: generates a scene only after creator approval.
- Continuity Supervisor: checks physical continuity, props, costumes, injuries, and locations.
- Story Logic Reviewer: checks character knowledge, motivation, chronology, world rules, setup, payoff, and plot holes.
- Orchestrator: controls workflow order, state transitions, retries, and approval gates.

Not every responsibility must be a separate AI agent immediately. Deterministic services should be used wherever they are safer and more reliable.
