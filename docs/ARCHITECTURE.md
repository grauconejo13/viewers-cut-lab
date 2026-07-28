# Architecture

## High-level approach

The initial implementation should be a lightweight product prototype with a Next.js frontend, server-side route handlers, and a small set of deterministic services. AI responsibilities should remain server-side and should be isolated behind defined workflows.

## Planned technical architecture

- Frontend: Next.js with App Router and TypeScript
- Styling: Tailwind CSS
- Backend entry points: Next.js route handlers
- AI integration: official Google Gen AI SDK via @google/genai
- Validation: Zod for request validation and model-output validation
- Data layer: Cloud Firestore as the planned database
- Authentication: Firebase Authentication or Google sign-in later
- Prototype session handling: secure server cookie for anonymous sessions
- Deployment: Vercel for early preview, with Cloud Run as a possible future Google Cloud deployment

## Architectural principles

The current ballot flow is a client-memory prototype. A future server-side voting milestone will replace it with authoritative persistence and duplicate prevention.

The audience UI is split between the static homepage route (`/`) and the focused
story route (`/story/[movieId]`). The route parameter selects an existing
fictional concept; its answers remain in component memory and are intentionally
lost on refresh or confirmed exit.

Phase 4A adds `POST /api/votes` and an in-memory vote repository. The route
validates movie, question, option, and anonymous session identifiers before
writing; durable Firestore storage replaces this repository in the later
persistence milestone.

- Keep Gemini calls on the server.
- Treat AI as an interpretation layer, not a source of truth for ballot validity.
- Use deterministic logic before AI interpretation whenever possible.
- Preserve creator approval gates before generating creative output.
- Keep the initial implementation free of a separate Express, FastAPI, or Render backend.

## Proposed system boundaries

- UI layer: cinematic voting experience, concept presentation, and approval screens
- Application layer: ballot handling, vote aggregation, integrity checks, workflow state transitions
- AI layer: audience analysis, story-brief generation, scene generation, continuity/story-logic review
- Data layer: persistence for concepts, ballots, workflow state, and analysis results

## Deployment direction

The first implementation can be previewed on Vercel if that helps speed up the hackathon workflow. The architecture should remain compatible with a later Google Cloud deployment if the project grows.
