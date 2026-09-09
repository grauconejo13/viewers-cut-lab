import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MOVIE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ movieId: string }> },
) {
  const { movieId } = await params;
  if (!MOVIE_ID_PATTERN.test(movieId) || movieId.length > 64) {
    return NextResponse.json({ error: "Invalid movie ID." }, { status: 400 });
  }

  const baseUrl = process.env.PRODUCTION_AGENT_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Production intelligence service is not configured." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ movie_id: movieId }),
      cache: "no-store",
    });

    const data = (await response.json()) as {
      recommendation?: string;
      detail?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Production intelligence request failed." },
        { status: response.status },
      );
    }

    return NextResponse.json({ recommendation: data.recommendation ?? "" });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the production intelligence service." },
      { status: 502 },
    );
  }
}
