# Security

## Core rules

- Gemini and all model calls run only in server-side code.
- API keys and sensitive configuration never reach browser code.
- `NEXT_PUBLIC_` is never used for secrets, and `.env` files are never committed.
- All external input is validated before use.
- Gemini output is validated with Zod before it changes workflow state or is
  displayed as structured content.

## Prototype sessions

Anonymous prototype voting will use a server-generated session identifier in a
secure cookie. Browser state may improve UX but cannot decide ballot eligibility.
Cookie attributes, expiration, rotation, and same-site policy are implementation
decisions that must be documented when selected.

## Data and operations

- Route handlers are the initial trusted backend boundary.
- Creator approval actions require authorization once authentication exists.
- Minimize persisted personal data; do not collect device fingerprints in MVP.
- Log failures without logging secrets or unnecessary request data.
- Clearly label fictional demo ballots and concepts.

Before public deployment, refine rate limiting, abuse monitoring, Firestore
access rules, authentication, and secret management.
