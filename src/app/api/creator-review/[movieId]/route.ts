import { NextResponse } from "next/server";
import {
  AnalysisConfigError,
  AnalysisModelError,
  AnalysisOutputError,
  AnalysisValidationError,
  analyzeAudience,
  geminiModelFromEnv,
} from "@/lib/audienceAnalyst";
import {
  CreatorReviewNotFoundError,
  CreatorReviewUnknownMovieError,
  creatorReviewRepository,
  getCreatorReview,
  startCreatorReview,
} from "@/lib/creatorReview";
import { VoteStoreError, firestoreRepositoryFromEnv } from "@/lib/votes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const review = await getCreatorReview(creatorReviewRepository, movieId);
    return NextResponse.json({ review });
  } catch (error) {
    if (
      error instanceof CreatorReviewUnknownMovieError ||
      error instanceof CreatorReviewNotFoundError
    )
      return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(
      { error: "Unable to load creator review." },
      { status: 500 },
    );
  }
}

/**
 * Starts (or restarts) a creator-review cycle: runs the Phase 5A Audience
 * Analyst against the trusted Firestore aggregate, then stores the result
 * as a new review in "analysis_ready" state.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const { repository } = firestoreRepositoryFromEnv();
    const model = geminiModelFromEnv();
    const analysis = await analyzeAudience(movieId, repository, model);
    const review = await startCreatorReview(
      creatorReviewRepository,
      movieId,
      analysis,
    );
    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof AnalysisValidationError)
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof AnalysisConfigError || error instanceof VoteStoreError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    if (
      error instanceof AnalysisModelError ||
      error instanceof AnalysisOutputError
    )
      return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json(
      { error: "Unable to start creator review." },
      { status: 500 },
    );
  }
}
