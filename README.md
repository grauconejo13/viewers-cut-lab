# Viewers Cut Lab

Viewers Cut Lab is an audience-driven movie development platform concept. It explores a workflow in which viewers vote on curated creative choices, trusted results are interpreted by Gemini into a coherent story direction, creators approve that direction, and later AI agents generate screenplay scenes while checking continuity, story logic, props, chronology, and plot holes.

## Current status

This repository currently contains the planning and documentation foundation for the first lab MVP. No Next.js scaffold, package installation, Gemini implementation, voting system implementation, or source-code application files have been created yet.

## Planned stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Next.js route handlers as the initial backend
- Official Google Gen AI SDK using @google/genai
- Gemini calls only from server-side code
- Zod for input and model-output validation
- Cloud Firestore as the planned database
- Firebase Authentication or Google sign-in later
- Secure server cookie for anonymous prototype sessions
- Google Cloud Agent Builder for the final agent workflow
- Partner MCP integration after the partner track is selected
- Vercel for early preview deployment if useful
- Cloud Run as a possible final Google Cloud deployment
- No separate Render, Express, or FastAPI backend initially

## First MVP definition

The first lab MVP includes:
- three clearly fictional movie concepts
- one anonymous ballot per session per round
- several curated story choices
- vote totals and percentages
- clearly labeled fictional demo ballots when needed
- Gemini audience-development brief
- creator approval gate
- one generated opening scene
- one continuity and story-logic analysis result

## Explicitly out of scope for the first MVP

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

## Repository structure

- docs/ — product requirements, architecture, workflow, security, decisions, roadmap
- tasks/ — phased implementation plan and backlog
