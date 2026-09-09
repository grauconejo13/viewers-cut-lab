# Viewer’s Cut

**Audiences shape the story. AI turns trusted choices into creator-approved screenplays with continuity built in.**

Viewer’s Cut is an agentic filmmaking workflow for audience-driven story development. Viewers make curated narrative choices, trusted submissions are aggregated server-side, Gemini interprets the signal, the creator approves or rejects the direction, Gemini generates an opening scene, and a continuity supervisor checks the result for contradictions, logic issues, character consistency, world-rule risks, and future watchpoints.

For the ClickHouse partner track, Viewer’s Cut also includes a Google ADK production-intelligence agent that uses the official `mcp-clickhouse` server at runtime. The agent queries ClickHouse Cloud for movie-specific production evidence before it is allowed to make a recommendation.

## End-to-end workflow

1. **Audience enters a film world** and makes one curated story decision at a time.
2. **Trusted vote submission** is validated server-side and persisted in Cloud Firestore.
3. **Audience Analyst** receives only trusted server-derived aggregates and returns a structured development brief with Gemini.
4. **Low-signal safeguard** returns a deterministic result instead of inventing audience demand when fewer than five trusted submissions exist.
5. **Creator approval gate** requires an explicit approve, reject, or revision decision before downstream generation.
6. **Screenwriter** generates a structured opening scene only after creator approval.
7. **Continuity Supervisor** evaluates the generated scene and classifies findings as confirmed issues, potential risks, or continuity watchpoints.
8. **Production Intelligence Agent** uses Google ADK + Gemini and the official `mcp-clickhouse` server to query ClickHouse Cloud before recommending the next production action.

## Current stack

### Web application

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Next.js route handlers
- Cloud Firestore via `@google-cloud/firestore`
- Google Gen AI SDK via `@google/genai`
- Zod for strict AI-output validation
- Vercel-compatible deployment

### Agent / partner integration

- Google Agent Development Kit (ADK)
- Gemini on Google Cloud / Vertex AI
- Google Cloud Agent Platform API
- Official `mcp-clickhouse` server
- ClickHouse Cloud
- `viewer_cut_events` analytics table

The ADK client and `mcp-clickhouse` server intentionally run in separate Python virtual environments because their MCP SDK requirements are incompatible. `agent/setup.ps1` creates both environments.

## ClickHouse production agent

The production agent is defined in `agent/agent.py` and exposes only the read-only `run_query` MCP tool.

For every requested movie, the agent must successfully run a movie-filtered `SELECT` against:

```sql
SELECT *
FROM default.viewer_cut_events
WHERE movie_id = '<requested movie id>'
LIMIT 200
```

before it can produce a recommendation. A callback records successful grounding, and a second callback blocks an ungrounded recommendation.

The agent summarizes evidence under four headings:

- Strongest audience signal
- Creator state
- Continuity watchpoints
- Recommended next production action

The creator approval gate remains authoritative. If ClickHouse does not contain an explicitly approved creator state, the agent cannot recommend scene generation or another downstream production step.

### Example validated run

A live run for `luminous-archive` successfully executed the ClickHouse MCP query and returned grounded evidence including:

- strongest audience signal: follow the erased-memory mystery
- creator state: direction approved
- continuity watchpoint: memory-erasure rules need consistency
- recommended next action: continue scene development while preserving the established continuity constraint

## Firestore trust boundary

Trusted prototype vote data uses:

- `prototypeVotes/{movieId}` for trusted aggregate totals and option counts
- `prototypeVotes/{movieId}/submissions/{sessionHash}` for one validated completed cut per anonymous session and movie

Submission creation, duplicate prevention, and aggregate updates happen in one Firestore transaction. Raw anonymous session IDs are never stored; they are validated and hashed server-side before persistence.

Client-provided totals and percentages are never trusted. Gemini receives only trusted aggregate counts/percentages plus fictional movie/question metadata, never session IDs, session hashes, or submission documents.

The anonymous browser-session model is intentionally lightweight and is not presented as production-grade identity or abuse prevention.

## Audience Analyst safeguards

`GET /api/audience-analysis/[movieId]` returns a structured Gemini development brief for a trusted aggregate.

When trusted submissions are below `MIN_AUDIENCE_SUBMISSIONS` (currently 5), Gemini is not called. The endpoint instead returns a deterministic low-signal result that explicitly refuses to invent audience preference.

## Creator workflow

The creator workflow supports:

- `analysis_ready`
- `approved`
- `rejected`
- `revision_requested`

Opening-scene generation requires an approved creator review. Duplicate or invalid state transitions are rejected.

## Opening scene + continuity analysis

After creator approval, Gemini generates one structured opening scene for the movie. The continuity workflow then evaluates that scene against the approved direction and supplied story context.

Continuity findings are classified as:

- `confirmed` — a contradiction or logic problem directly demonstrated by supplied story data
- `risk` — a plausible concern not yet proven to be a contradiction
- `watchpoint` — a currently valid fact, setup, or world rule future scenes should preserve

Intentional mystery or ambiguity is not automatically treated as a defect.

## Local setup

### 1. Web app

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Required web-app values include:

```text
GEMINI_API_KEY=
FIRESTORE_PROJECT_ID=
VOTE_SESSION_HASH_SECRET=
```

For local Google Cloud Firestore access, Application Default Credentials can be configured with:

```powershell
gcloud auth application-default login
gcloud config set project viewers-cut-lab
```

### 2. ADK + ClickHouse MCP agent

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\agent\setup.ps1
```

Set the required process environment variables:

```text
CLICKHOUSE_HOST=
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=
CLICKHOUSE_PASSWORD=
CLICKHOUSE_SECURE=true
CLICKHOUSE_DATABASE=default
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=viewers-cut-lab
GOOGLE_CLOUD_LOCATION=global
```

Enable Google Cloud Agent Platform / Vertex AI if needed:

```powershell
gcloud services enable aiplatform.googleapis.com --project=viewers-cut-lab
```

Authenticate Application Default Credentials:

```powershell
gcloud auth application-default login
```

Run the production agent:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\agent\run.ps1 luminous-archive
```

The run script refuses to start when required Google Cloud or ClickHouse environment variables are missing.

## Validation

The current repository has been validated with:

```powershell
npm run lint
npm run test
npm run typecheck
npm run build
```

Current automated test suite: **68 passing tests**.

The ADK/ClickHouse integration also has an offline smoke test and has been validated with a real stdio MCP startup/tool-discovery flow and a live ClickHouse Cloud query.

## Environment variables

See `.env.example` for the complete list. Do not commit credentials or secrets, and do not expose server secrets with `NEXT_PUBLIC_` prefixes.

## Repository structure

```text
agent/   Google ADK + official mcp-clickhouse integration
docs/    product requirements, architecture, workflow, security, decisions, roadmap
src/     Next.js application and API routes
tasks/   phased implementation plan and backlog
tests/   automated tests
```

## Scope

Viewer’s Cut is a hackathon prototype focused on the creative-development workflow. It does not attempt to provide feature-length screenplay generation, casting, crowdfunding, payments, public social feeds, or production guarantees.

## License

MIT — see `LICENSE`.
