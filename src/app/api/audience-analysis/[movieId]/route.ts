import { NextResponse } from "next/server";
import {
  AnalysisConfigError,
  AnalysisModelError,
  AnalysisOutputError,
  AnalysisValidationError,
  analyzeAudience,
  geminiModelFromEnv,
} from "@/lib/audienceAnalyst";
import { VoteStoreError, firestoreRepositoryFromEnv } from "@/lib/votes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  try {
    const { movieId } = await params;
    const { repository } = firestoreRepositoryFromEnv();
    const model = geminiModelFromEnv();
    const analysis = await analyzeAudience(movieId, repository, model);
    return NextResponse.json({ movieId, analysis });
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
      { error: "Unable to generate audience analysis." },
      { status: 500 },
    );
  }
}
