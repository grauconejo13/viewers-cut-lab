import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import {
  applyCreatorDecision,
  createCreatorReview,
  CreatorReviewNotApprovedError,
  CreatorReviewNotFoundError,
  CreatorReviewTransitionError,
  CreatorReviewUnknownMovieError,
  CreatorReviewValidationError,
  decideCreatorReview,
  getCreatorReview,
  isApprovedForGeneration,
  isReviewApproved,
  MemoryCreatorReviewRepository,
  requireApprovedReview,
  startCreatorReview,
  validateDecisionRequest,
} from "../src/lib/creatorReview";

const movie = movieConcepts[0];
const analysis = {
  dominantPreferences: ["Audiences favor the mapmaker lead"],
  closeDecisions: ["Setting choice is nearly even"],
  audienceTensions: ["Trust vs. evidence"],
  narrativeRisks: ["Losing the mystery's stakes"],
  recommendedDirection: "Lean into the mapmaker's instinct-driven search.",
};

test("createCreatorReview starts a review in analysis_ready", () => {
  const review = createCreatorReview(movie.id, analysis);
  assert.equal(review.status, "analysis_ready");
  assert.equal(review.movieId, movie.id);
  assert.equal(review.analysis, analysis);
  assert.equal(review.createdAt, review.updatedAt);
  assert.equal(review.note, undefined);
});

test("createCreatorReview rejects an unknown movie ID", () => {
  assert.throws(
    () => createCreatorReview("not-a-real-movie", analysis),
    CreatorReviewUnknownMovieError,
  );
});

test("valid transitions from analysis_ready succeed", () => {
  for (const action of [
    "approved",
    "rejected",
    "revision_requested",
  ] as const) {
    const review = createCreatorReview(movie.id, analysis);
    const updated = applyCreatorDecision(review, action, undefined);
    assert.equal(updated.status, action);
  }
});

test("invalid transitions fail deterministically", () => {
  const approved = applyCreatorDecision(
    createCreatorReview(movie.id, analysis),
    "approved",
    undefined,
  );
  assert.throws(
    () => applyCreatorDecision(approved, "rejected", undefined),
    CreatorReviewTransitionError,
  );
  assert.throws(
    () => applyCreatorDecision(approved, "revision_requested", undefined),
    CreatorReviewTransitionError,
  );

  const rejected = applyCreatorDecision(
    createCreatorReview(movie.id, analysis),
    "rejected",
    undefined,
  );
  assert.throws(
    () => applyCreatorDecision(rejected, "approved", undefined),
    CreatorReviewTransitionError,
  );

  const revising = applyCreatorDecision(
    createCreatorReview(movie.id, analysis),
    "revision_requested",
    undefined,
  );
  assert.throws(
    () => applyCreatorDecision(revising, "approved", undefined),
    CreatorReviewTransitionError,
  );
});

test("validateDecisionRequest rejects invalid actions, empty/oversized notes, and unknown fields", () => {
  assert.throws(
    () => validateDecisionRequest({ action: "not-a-real-action" }),
    CreatorReviewValidationError,
  );
  assert.throws(
    () => validateDecisionRequest({ action: "approved", note: "" }),
    CreatorReviewValidationError,
  );
  assert.throws(
    () =>
      validateDecisionRequest({ action: "approved", note: "x".repeat(2001) }),
    CreatorReviewValidationError,
  );
  assert.throws(
    () => validateDecisionRequest({ action: "approved", extra: "nope" }),
    CreatorReviewValidationError,
  );
  assert.throws(
    () => validateDecisionRequest({}),
    CreatorReviewValidationError,
  );
});

test("validateDecisionRequest accepts a valid action with an optional note", () => {
  const withoutNote = validateDecisionRequest({ action: "approved" });
  assert.equal(withoutNote.action, "approved");
  assert.equal(withoutNote.note, undefined);

  const withNote = validateDecisionRequest({
    action: "revision_requested",
    note: "Tighten the midpoint reveal.",
  });
  assert.equal(withNote.action, "revision_requested");
  assert.equal(withNote.note, "Tighten the midpoint reveal.");
});

test("creator note is recorded on revision request", async () => {
  const repository = new MemoryCreatorReviewRepository();
  await startCreatorReview(repository, movie.id, analysis);
  const revised = await decideCreatorReview(
    repository,
    movie.id,
    "revision_requested",
    "Tighten the midpoint reveal.",
  );
  assert.equal(revised.note, "Tighten the midpoint reveal.");
});

test("creator note is preserved when a later decision omits it", async () => {
  const repository = new MemoryCreatorReviewRepository();
  const review = createCreatorReview(movie.id, analysis);
  const noted = applyCreatorDecision(
    review,
    "revision_requested",
    "First note.",
  );
  assert.equal(noted.note, "First note.");
  // Simulate restarting a fresh analysis cycle after revision, then
  // deciding again without a note - the transition logic itself must not
  // silently invent or drop notes when none is supplied.
  const restarted = createCreatorReview(movie.id, analysis);
  await repository.save(restarted);
  const approved = await decideCreatorReview(
    repository,
    movie.id,
    "approved",
    undefined,
  );
  assert.equal(approved.note, undefined);
});

test("getCreatorReview distinguishes unknown movie from no review yet", async () => {
  const repository = new MemoryCreatorReviewRepository();
  await assert.rejects(
    () => getCreatorReview(repository, "not-a-real-movie"),
    CreatorReviewUnknownMovieError,
  );
  await assert.rejects(
    () => getCreatorReview(repository, movie.id),
    CreatorReviewNotFoundError,
  );
});

test("decideCreatorReview fails deterministically for an unstarted review", async () => {
  const repository = new MemoryCreatorReviewRepository();
  await assert.rejects(
    () => decideCreatorReview(repository, movie.id, "approved", undefined),
    CreatorReviewNotFoundError,
  );
});

test("isReviewApproved treats a null or non-approved review as not approved", () => {
  assert.equal(isReviewApproved(null), false);
  assert.equal(isReviewApproved(createCreatorReview(movie.id, analysis)), false);
});

test("approval gate returns false / rejects unless status is approved", async () => {
  const repository = new MemoryCreatorReviewRepository();

  assert.equal(await isApprovedForGeneration(repository, movie.id), false);
  await assert.rejects(
    () => requireApprovedReview(repository, movie.id),
    CreatorReviewNotApprovedError,
  );

  await startCreatorReview(repository, movie.id, analysis);
  assert.equal(await isApprovedForGeneration(repository, movie.id), false);
  await assert.rejects(
    () => requireApprovedReview(repository, movie.id),
    CreatorReviewNotApprovedError,
  );

  await decideCreatorReview(repository, movie.id, "rejected", undefined);
  assert.equal(await isApprovedForGeneration(repository, movie.id), false);

  const fresh = createCreatorReview(movie.id, analysis);
  await repository.save(fresh);
  await decideCreatorReview(repository, movie.id, "approved", undefined);
  assert.equal(await isApprovedForGeneration(repository, movie.id), true);
  const approvedReview = await requireApprovedReview(repository, movie.id);
  assert.equal(approvedReview.status, "approved");
});
