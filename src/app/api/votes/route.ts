import { NextResponse } from "next/server";
import {
  VoteStoreError,
  VoteValidationError,
  firestoreRepositoryFromEnv,
  hashSession,
  validateVote,
} from "@/lib/votes";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const vote = validateVote(
      (body as Record<string, unknown>).movieId,
      (body as Record<string, unknown>).answers,
      (body as Record<string, unknown>).sessionId,
    );
    const store = firestoreRepositoryFromEnv();
    const result = await store.repository.submit(
      vote.movieId,
      vote.answers,
      hashSession(vote.sessionId, store.secret, vote.movieId),
    );
    return NextResponse.json(result, {
      status: result.status === "duplicate" ? 409 : 200,
    });
  } catch (error) {
    if (error instanceof VoteValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });

    if (error instanceof VoteStoreError) {
      console.error("Vote store configuration failed", {
        name: error.name,
        message: error.message,
      });
      return NextResponse.json(
        { error: "We couldn't save your cut. Please try again." },
        { status: 503 },
      );
    }

    const details =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: "UnknownError", message: String(error) };

    console.error("Vote submission failed", details);

    return NextResponse.json(
      { error: "We couldn't save your cut. Please try again." },
      { status: 500 },
    );
  }
}
