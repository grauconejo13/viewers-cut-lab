import { z } from "zod";
import { movieConcepts } from "@/data/demo-data";
import type { AudienceAnalysis } from "@/lib/audienceAnalyst";

export type CreatorReviewStatus =
  | "analysis_ready"
  | "approved"
  | "rejected"
  | "revision_requested";

export type CreatorReview = {
  movieId: string;
  analysis: AudienceAnalysis;
  status: CreatorReviewStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export class CreatorReviewUnknownMovieError extends Error {}
export class CreatorReviewNotFoundError extends Error {}
export class CreatorReviewValidationError extends Error {}
export class CreatorReviewTransitionError extends Error {}
export class CreatorReviewNotApprovedError extends Error {}

export const CreatorDecisionActionSchema = z.enum([
  "approved",
  "rejected",
  "revision_requested",
]);
export type CreatorDecisionAction = z.infer<typeof CreatorDecisionActionSchema>;

export const CreatorDecisionRequestSchema = z
  .object({
    action: CreatorDecisionActionSchema,
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

export function validateDecisionRequest(body: unknown) {
  const result = CreatorDecisionRequestSchema.safeParse(body);
  if (!result.success)
    throw new CreatorReviewValidationError("Invalid creator decision request.");
  return result.data;
}

/**
 * The only allowed status transitions. A review only ever leaves
 * "analysis_ready" once - approved/rejected/revision_requested are terminal
 * for this decision cycle. A creator can start a fresh review (see
 * startCreatorReview) to get a new "analysis_ready" cycle, but that is a new
 * analysis, not a transition of the old one. Anything not listed here fails
 * deterministically via CreatorReviewTransitionError.
 */
const VALID_TRANSITIONS: Record<CreatorReviewStatus, CreatorDecisionAction[]> = {
  analysis_ready: ["approved", "rejected", "revision_requested"],
  approved: [],
  rejected: [],
  revision_requested: [],
};

function findMovieOrThrow(movieId: string) {
  const concept = movieConcepts.find((c) => c.id === movieId);
  if (!concept) throw new CreatorReviewUnknownMovieError("Unknown movie ID.");
  return concept;
}

export function createCreatorReview(
  movieId: string,
  analysis: AudienceAnalysis,
  now = new Date(),
): CreatorReview {
  findMovieOrThrow(movieId);
  const timestamp = now.toISOString();
  return {
    movieId,
    analysis,
    status: "analysis_ready",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function applyCreatorDecision(
  review: CreatorReview,
  action: CreatorDecisionAction,
  note: string | undefined,
  now = new Date(),
): CreatorReview {
  const allowed = VALID_TRANSITIONS[review.status] ?? [];
  if (!allowed.includes(action))
    throw new CreatorReviewTransitionError(
      `Cannot move from "${review.status}" to "${action}".`,
    );
  return {
    ...review,
    status: action,
    note: note ?? review.note,
    updatedAt: now.toISOString(),
  };
}

export function isReviewApproved(review: CreatorReview | null): boolean {
  return review?.status === "approved";
}

/**
 * Storage boundary for creator-review state. An in-memory implementation is
 * used for now; a Firestore-backed implementation can replace it later
 * without changing this contract or any route behavior - the same pattern
 * Phase 4A/4B already used for votes.
 */
export interface CreatorReviewRepository {
  get(movieId: string): Promise<CreatorReview | null>;
  save(review: CreatorReview): Promise<void>;
}

export class MemoryCreatorReviewRepository implements CreatorReviewRepository {
  private reviews = new Map<string, CreatorReview>();
  async get(movieId: string) {
    return this.reviews.get(movieId) ?? null;
  }
  async save(review: CreatorReview) {
    this.reviews.set(review.movieId, review);
  }
}

/**
 * Shared in-memory store for the current prototype. Resets on server
 * restart, matching the Phase 4A vote store before Firestore was added in
 * Phase 4B.
 */
export const creatorReviewRepository: CreatorReviewRepository =
  new MemoryCreatorReviewRepository();

/** Starts (or restarts) a review cycle from a freshly generated analysis. */
export async function startCreatorReview(
  repository: CreatorReviewRepository,
  movieId: string,
  analysis: AudienceAnalysis,
): Promise<CreatorReview> {
  const review = createCreatorReview(movieId, analysis);
  await repository.save(review);
  return review;
}

export async function getCreatorReview(
  repository: Pick<CreatorReviewRepository, "get">,
  movieId: string,
): Promise<CreatorReview> {
  findMovieOrThrow(movieId);
  const review = await repository.get(movieId);
  if (!review)
    throw new CreatorReviewNotFoundError(
      "No creator review has been started for this movie.",
    );
  return review;
}

export async function decideCreatorReview(
  repository: CreatorReviewRepository,
  movieId: string,
  action: CreatorDecisionAction,
  note: string | undefined,
): Promise<CreatorReview> {
  const review = await getCreatorReview(repository, movieId);
  const updated = applyCreatorDecision(review, action, note);
  await repository.save(updated);
  return updated;
}

/**
 * Approval gate for future Phase 7 screenplay generation. Boolean form
 * returns false unless the current status is "approved"; the throwing form
 * rejects instead, for call sites that should fail loudly.
 */
export async function isApprovedForGeneration(
  repository: Pick<CreatorReviewRepository, "get">,
  movieId: string,
): Promise<boolean> {
  return isReviewApproved(await repository.get(movieId));
}

export async function requireApprovedReview(
  repository: Pick<CreatorReviewRepository, "get">,
  movieId: string,
): Promise<CreatorReview> {
  const review = await repository.get(movieId);
  if (!isReviewApproved(review))
    throw new CreatorReviewNotApprovedError(
      "Creator approval is required before generation.",
    );
  return review as CreatorReview;
}
