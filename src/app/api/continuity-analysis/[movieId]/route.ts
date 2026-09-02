import { NextResponse } from "next/server";
import {
  CreatorReviewNotApprovedError,
  creatorReviewRepository,
} from "@/lib/creatorReview";
import {
  ContinuityAlreadyExistsError,
  ContinuityConfigError,
  ContinuityModelError,
  ContinuityNotFoundError,
  ContinuityOutputError,
  ContinuityValidationError,
  continuityModelFromEnv,
  continuityRepository,
  getContinuityReview,
  runContinuityAnalysis,
} from "@/lib/continuity";
import {
  SceneNotFoundError,
  sceneRepository,
} from "@/lib/screenplay";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const continuity = await getContinuityReview(continuityRepository, movieId);
    return NextResponse.json({ continuity });
  } catch (error) {
    if (
      error instanceof ContinuityValidationError ||
      error instanceof ContinuityNotFoundError
    )
      return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(
      { error: "Unable to load continuity analysis." },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const model = continuityModelFromEnv();
    const continuity = await runContinuityAnalysis(
      movieId,
      creatorReviewRepository,
      sceneRepository,
      continuityRepository,
      model,
    );
    return NextResponse.json({ continuity });
  } catch (error) {
    if (error instanceof ContinuityValidationError)
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (
      error instanceof CreatorReviewNotApprovedError ||
      error instanceof SceneNotFoundError ||
      error instanceof ContinuityAlreadyExistsError
    )
      return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof ContinuityConfigError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    if (
      error instanceof ContinuityModelError ||
      error instanceof ContinuityOutputError
    )
      return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json(
      { error: "Unable to run continuity analysis." },
      { status: 500 },
    );
  }
}
