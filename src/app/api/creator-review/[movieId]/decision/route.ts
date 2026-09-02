import { NextResponse } from "next/server";
import {
  CreatorReviewNotFoundError,
  CreatorReviewTransitionError,
  CreatorReviewUnknownMovieError,
  CreatorReviewValidationError,
  creatorReviewRepository,
  decideCreatorReview,
  validateDecisionRequest,
} from "@/lib/creatorReview";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const body: unknown = await request.json();
    const { action, note } = validateDecisionRequest(body);
    const review = await decideCreatorReview(
      creatorReviewRepository,
      movieId,
      action,
      note,
    );
    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof CreatorReviewValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (
      error instanceof CreatorReviewUnknownMovieError ||
      error instanceof CreatorReviewNotFoundError
    )
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof CreatorReviewTransitionError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(
      { error: "Unable to record creator decision." },
      { status: 500 },
    );
  }
}
