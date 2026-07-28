import { NextResponse } from "next/server";
import { VoteValidationError, submitVote } from "@/lib/votes";

export async function POST(request: Request) {
  try { const body: unknown = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new VoteValidationError("Invalid submission."); const { movieId, answers, sessionId } = body as Record<string, unknown>; const result = submitVote(movieId, answers, sessionId); return NextResponse.json(result, { status: result.status === "duplicate" ? 409 : 201 }); }
  catch (error) { if (error instanceof VoteValidationError) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ error: "Unable to submit your cut." }, { status: 500 }); }
}
