# Voting Integrity

## Purpose

Vote integrity protects the audience signal used for creative development. It is not an anti-fraud guarantee and must not imply fictional demo activity is real.

## Current prototype model

Phase 4B uses a browser-generated anonymous session identifier, server-side validation, SHA-256 session hashing, and Cloud Firestore persistence.

A completed cut is accepted at most once for the same anonymous session and movie. The server validates all movie, question, and option IDs against curated definitions before any trusted count changes.

Client-provided totals, labels, counts, or percentages are never accepted as authoritative.

## Anonymous session handling

- The browser creates the anonymous session ID.
- The server validates that it is a string matching the current 16-128 character alphanumeric/underscore/hyphen format.
- The server hashes the session ID with `VOTE_SESSION_HASH_SECRET` and the movie ID using SHA-256.
- Only the resulting hash is persisted in Firestore.
- Raw anonymous session IDs are not stored.
- The hash is a duplicate-detection key, not authentication.
- Clearing browser storage creates a new anonymous identity, so this mechanism does not prevent determined repeat voting.

## Firestore data model

Trusted prototype data uses:

- `prototypeVotes/{movieId}` — trusted aggregate total and option counts
- `prototypeVotes/{movieId}/submissions/{sessionHash}` — one validated completed cut per hashed anonymous session and movie

Submission documents contain validated option IDs, movie ID, the session hash, and a server timestamp. Aggregate documents contain total trusted submissions, trusted option counts, and an update timestamp.

## Atomic duplicate prevention

Duplicate detection and vote aggregation occur in one Firestore transaction.

The transaction:

1. reads the submission document for the session hash,
2. returns a duplicate result if that document already exists,
3. otherwise reads the current aggregate,
4. increments only the validated option counts,
5. writes the submission and updated aggregate together.

A duplicate returns `409` from `POST /api/votes` and does not increment trusted totals. Firestore transaction behavior protects the write boundary from partial accepted updates during conflicting writes.

## Trusted aggregation

- One completed submission contributes one vote to each required story decision.
- Percentages are calculated server-side from trusted aggregate counts.
- Percentages use stable one-decimal rounding.
- Zero-vote states return zero percentages safely.
- Fictional seeded demo counts remain separate from real prototype submissions and are labeled accordingly.

## Deterministic status model

| Status   | Meaning                               | Action                              |
| -------- | ------------------------------------- | ----------------------------------- |
| Trusted  | Passed defined integrity rules        | Include in percentages and AI input |
| Held     | Needs review or a later rule decision | Exclude from trusted percentages    |
| Rejected | Violates a deterministic rule         | Exclude from valid totals           |

The current Phase 4B implementation directly validates and accepts or rejects submissions; held/suspicious-pattern workflows remain future hardening. Gemini may summarize trusted aggregate patterns, but never decides whether a ballot is valid.

## API outcomes

- `200` — first valid submission accepted
- `409` — same anonymous session already submitted for that movie
- `400` — invalid movie, answers, option IDs, or session input
- `503` — Firestore persistence configuration unavailable
- `500` — unexpected persistence failure

## Testing boundary

Unit tests use `MemoryVoteRepository` and do not require a live Firestore project. Current focused tests cover valid and invalid submissions, duplicates, cross-movie session use, session-hash stability, aggregation, zero-vote behavior, and percentage rounding.

## Later hardening

Before treating this as production-grade voting integrity, add stronger anonymous identity controls or authentication, rate limiting, abuse monitoring, auditability, reviewed retention policies, and appropriate Firestore access/security configuration. Advanced device fingerprinting remains outside the first MVP.
