# Product Requirements

## Product vision

Viewers Cut Lab is a fictional, audience-driven movie development experiment. The experience should feel like a controlled lab for collaborative story exploration, where voting signals are treated as creative input rather than a guarantee of outcome.

## Core workflow

1. A creator defines a fictional movie premise and a set of curated choices.
2. Viewers submit one ballot for one movie round.
3. A ballot may include choices for:
   - lead character
   - supporting character
   - setting
   - genre blend
   - tone
   - central conflict
   - relationship direction
   - major story event
   - ending style
4. The app calculates vote counts and percentages.
5. Deterministic integrity checks separate trusted, held, and rejected ballots.
6. Gemini analyzes trusted aggregate results.
7. Gemini creates a coherent audience-development brief.
8. The creator approves, edits, or rejects the direction.
9. Gemini generates one opening screenplay scene after approval.
10. A continuity and story-logic system analyzes the scene and surrounding story assumptions.

## MVP goals

The first lab MVP should prove that:
- a fictional movie premise can be presented clearly
- viewers can participate in a simple ballot flow
- aggregate audience signals can be converted into a story brief
- a creator approval gate can protect the story direction process
- a single opening scene and analysis result can be produced from the approved direction

## Functional requirements

Current Phase 3 ballots are local demonstration state only. They are not recorded as real votes, are cleared on refresh, and have no persistence or duplicate prevention yet.

- Present three clearly fictional movie concepts.
- Support one anonymous ballot per session per round for the prototype.
- Show vote totals and percentages.
- Display clearly labeled fictional demo ballots when necessary.
- Generate a Gemini audience-development brief from trusted aggregates.
- Require creator approval before scene generation.
- Produce one opening scene and one continuity/story-logic analysis within the lab MVP.

## Explicit exclusions for the first MVP

The first MVP must not include:
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

## Responsibilities

- Vote Integrity Service: deterministic duplicate, rate, and suspicious-pattern checks.
- Audience Analyst: interprets trusted percentages and close results.
- Story Architect: creates the proposed story direction and outline.
- Screenwriter: generates a scene only after creator approval.
- Continuity Supervisor: checks physical continuity, props, costumes, injuries, and locations.
- Story Logic Reviewer: checks character knowledge, motivation, chronology, world rules, setup, payoff, and plot holes.
- Orchestrator: controls workflow order, state transitions, retries, and approval gates.

Not every responsibility must be a separate AI agent immediately. Deterministic services should be used wherever they are safer and more reliable.
