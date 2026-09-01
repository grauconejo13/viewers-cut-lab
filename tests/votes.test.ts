import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import {
  firestoreRepositoryFromEnv,
  FirestoreVoteRepository,
  hashSession,
  MemoryVoteRepository,
  roundPercentage,
  validateVote,
  VoteStoreError,
  VoteValidationError,
} from "../src/lib/votes";
const movie = movieConcepts[0],
  answers = Object.fromEntries(
    movie.ballotQuestions.map((q) => [q.id, [q.options[0].id]]),
  );
test("valid persisted submission aggregates", async () => {
  const r = new MemoryVoteRepository();
  const result = await r.submit(movie.id, answers, "hash");
  assert.equal(result.aggregate.totalSubmissions, 1);
});
test("validation rejects invalid movie, option, and incomplete answers", () => {
  assert.throws(
    () => validateVote("nope", answers, "session-abcdefghijklmnop"),
    VoteValidationError,
  );
  assert.throws(
    () =>
      validateVote(
        movie.id,
        { ...answers, lead: ["nope"] },
        "session-abcdefghijklmnop",
      ),
    VoteValidationError,
  );
  assert.throws(
    () => validateVote(movie.id, {}, "session-abcdefghijklmnop"),
    VoteValidationError,
  );
});
test("atomic duplicate and different movies", async () => {
  const r = new MemoryVoteRepository();
  await r.submit(movie.id, answers, "hash");
  assert.equal((await r.submit(movie.id, answers, "hash")).status, "duplicate");
  assert.equal(
    (
      await r.submit(
        movieConcepts[1].id,
        Object.fromEntries(
          movieConcepts[1].ballotQuestions.map((q) => [
            q.id,
            [q.options[0].id],
          ]),
        ),
        "hash",
      )
    ).status,
    "submitted",
  );
});
test("hash is stable and raw session is not stored", () => {
  assert.equal(
    hashSession("session-abcdefghijklmnop", "secret", "x"),
    hashSession("session-abcdefghijklmnop", "secret", "x"),
  );
  assert.notEqual(
    hashSession("session-abcdefghijklmnop", "secret", "x"),
    "session-abcdefghijklmnop",
  );
});
test("rounding", () => assert.equal(roundPercentage(33.333), 33.3));
test("firestoreRepositoryFromEnv requires project and secret configuration", () => {
  const keys = ["FIRESTORE_PROJECT_ID", "VOTE_SESSION_HASH_SECRET"] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    assert.throws(() => firestoreRepositoryFromEnv(), VoteStoreError);

    process.env.FIRESTORE_PROJECT_ID = "viewers-cut-lab";
    assert.throws(
      () => firestoreRepositoryFromEnv(),
      VoteStoreError,
      "missing VOTE_SESSION_HASH_SECRET must still fail even with project configured",
    );

    process.env.VOTE_SESSION_HASH_SECRET = "test-secret";
    const { repository } = firestoreRepositoryFromEnv();
    assert.ok(repository instanceof FirestoreVoteRepository);
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
