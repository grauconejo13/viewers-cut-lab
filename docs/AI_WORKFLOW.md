# AI Workflow

## Purpose

The AI workflow converts audience voting signals into a structured creative development brief, then into an opening scene and continuity analysis. The workflow should remain explainable and must preserve creator oversight.

## Workflow stages

1. Vote intake and integrity assessment
2. Aggregate trusted ballot analysis
3. Audience-development brief generation
4. Creator approval, edit, or rejection
5. Opening scene generation after approval
6. Continuity and story-logic review

## AI role boundaries

- The Audience Analyst interprets trusted percentages and close results.
- The Story Architect creates the proposed story direction and outline.
- The Screenwriter generates a scene only after creator approval.
- The Continuity Supervisor checks physical continuity and scene-level details.
- The Story Logic Reviewer checks character knowledge, chronology, world rules, setups, payoffs, and plot holes.
- The Orchestrator controls sequencing, retries, state transitions, and approval gates.

## Guardrails

- Gemini should never decide ballot validity by itself.
- Gemini may explain suspicious patterns, but deterministic integrity checks must remain the source of truth.
- All AI outputs must be validated with Zod before use in the workflow.
- The system should support explicit fallback behavior when AI output is invalid or low confidence.

## Prototype expectation

In the first MVP, the AI workflow should produce one audience-development brief, one opening scene, and one continuity/story-logic analysis result for a fictional demo concept.
