import { NextResponse } from "next/server";
import { CreatorReviewNotApprovedError, creatorReviewRepository } from "@/lib/creatorReview";
import {
  SceneAlreadyExistsError,
  SceneConfigError,
  SceneModelError,
  SceneNotFoundError,
  SceneOutputError,
  SceneValidationError,
  generateOpeningScene,
  getOpeningScene,
  sceneModelFromEnv,
  sceneRepository,
} from "@/lib/screenplay";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const scene = await getOpeningScene(sceneRepository, movieId);
    return NextResponse.json({ scene });
  } catch (error) {
    if (
      error instanceof SceneValidationError ||
      error instanceof SceneNotFoundError
    )
      return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(
      { error: "Unable to load the opening scene." },
      { status: 500 },
    );
  }
}

/**
 * Generates the one opening scene for a movie, only from an approved
 * creator review. Reuses the unchanged Phase 5A/5B Gemini setup and the
 * unchanged Phase 6 approval gate.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const model = sceneModelFromEnv();
    const scene = await generateOpeningScene(
      movieId,
      creatorReviewRepository,
      sceneRepository,
      model,
    );
    return NextResponse.json({ scene });
  } catch (error) {
    if (error instanceof SceneValidationError)
      return NextResponse.json({ error: error.message }, { status: 404 });
    if (
      error instanceof CreatorReviewNotApprovedError ||
      error instanceof SceneAlreadyExistsError
    )
      return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof SceneConfigError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof SceneModelError || error instanceof SceneOutputError)
      return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json(
      { error: "Unable to generate the opening scene." },
      { status: 500 },
    );
  }
}
