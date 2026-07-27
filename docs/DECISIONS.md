# Decisions

## Accepted decisions

- Phase 0 is documentation only: no scaffold, packages, implementation, or
  source-code files.
- The planned stack is Next.js App Router, strict TypeScript, Tailwind CSS, and
  Next.js route handlers; no separate Render, Express, or FastAPI backend is
  planned initially.
- Gemini uses `@google/genai` only from server-side code, and structured output
  is validated with Zod.
- Deterministic rules decide vote validity; Gemini does not.
- Creator approval is required before screenplay scene generation.
- The MVP contains fictional demonstration content only and makes no claims of
  real demand, votes, testimonials, or production outcomes.

## Provisional decisions

- Cloud Firestore is the planned database.
- Secure server cookies identify anonymous prototype sessions.
- Firebase Authentication or Google sign-in are planned for the real version.
- Vercel may host early previews; Cloud Run is a possible final Google Cloud
  target.
- Google Cloud Agent Builder is planned for the final agent workflow.
- Responsibilities may begin as deterministic services and workflow modules,
  rather than separate AI agents.

## Unresolved questions

- What creator identity and authorization model is sufficient for the MVP?
- What rate-limit thresholds and held-versus-rejected rules are appropriate?
- What exact Zod schemas, model settings, retry policy, and failure experience
  should the Gemini workflows use?
- What continuity severities and creator-resolution actions are needed?
- What Firestore schema and retention policy should be adopted?

## Hackathon and partner requirements awaiting confirmation

- Partner track selection and its required integration are unconfirmed.
- No partner integration is invented; Partner MCP integration begins only after
  the track is selected.
- Hackathon rubric, demo constraints, deployment requirements, and Agent Builder
  expectations require confirmation before those phases begin.
