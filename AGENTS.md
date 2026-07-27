# AGENTS.md

## Purpose

This repository is the planning and documentation foundation for Viewers Cut Lab. Future coding agents must treat this repo as a controlled product-design and implementation scaffold, not as a general-purpose app template.

## Required reading before editing

Before making any change, read:
- README.md
- docs/
- tasks/TASKS.md

## Working rules

- Work only on the requested phase and avoid unrelated features or refactoring.
- Keep changes small, reviewable, and scoped to the current task.
- Never expose API keys or secrets to browser code.
- Never use NEXT_PUBLIC_ for secrets or sensitive configuration.
- Never commit .env files.
- Use strict TypeScript for implementation work.
- Validate all external input.
- Validate all Gemini output with Zod.
- Prefer deterministic rules before AI interpretation.
- Preserve creator approval gates.
- Never fabricate real users, votes, demand, testimonials, or production claims.
- Clearly label fictional demo content.
- Run lint, tests, type checking, and build after implementation tasks.
- Update tasks/TASKS.md only after validation passes.
- Record major decisions in docs/DECISIONS.md.
- Report failures honestly rather than silently substituting fake data.
