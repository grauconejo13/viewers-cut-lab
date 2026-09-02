"use client";
import { useCallback, useEffect, useState } from "react";

type CreatorReviewStatus =
  | "analysis_ready"
  | "approved"
  | "rejected"
  | "revision_requested";

type AudienceAnalysis = {
  dominantPreferences: string[];
  closeDecisions: string[];
  audienceTensions: string[];
  narrativeRisks: string[];
  recommendedDirection: string;
};

type CreatorReview = {
  movieId: string;
  analysis: AudienceAnalysis;
  status: CreatorReviewStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

const statusLabels: Record<CreatorReviewStatus, string> = {
  analysis_ready: "Awaiting creator decision",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
};

export function CreatorReviewPanel({
  movieId,
  title,
}: {
  movieId: string;
  title: string;
}) {
  const [review, setReview] = useState<CreatorReview | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/creator-review/${movieId}`);
      if (response.status === 404) {
        setReview(null);
        return;
      }
      const data = (await response.json()) as {
        review?: CreatorReview;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to load creator review.");
      setReview(data.review ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load creator review.",
      );
    } finally {
      setBusy(false);
    }
  }, [movieId]);

  useEffect(() => {
    // Fetch-on-mount is intentional: there is no external store to
    // subscribe to here, just a one-time GET for the current review state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const startReview = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/creator-review/${movieId}`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        review?: CreatorReview;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to start creator review.");
      setReview(data.review ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start creator review.",
      );
    } finally {
      setBusy(false);
    }
  };

  const decide = async (
    action: "approved" | "rejected" | "revision_requested",
  ) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/creator-review/${movieId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = (await response.json()) as {
        review?: CreatorReview;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to record creator decision.");
      setReview(data.review ?? null);
      setNote("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record creator decision.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="story-shell">
      <div className="story-main">
        <p className="eyebrow">
          Creator review - internal, not part of the public audience flow
        </p>
        <h1>{title}</h1>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {!review && !busy && (
          <div className="approval-panel">
            <div>
              <p className="panel-kicker">No analysis yet</p>
              <p>No creator review has been started for this film.</p>
            </div>
            <div className="approval-actions">
              <button type="button" className="button" onClick={startReview}>
                Run Audience Analysis
              </button>
            </div>
          </div>
        )}

        {review && (
          <div className="approval-panel">
            <div>
              <p className="panel-kicker">
                Status - {statusLabels[review.status]}
              </p>
              <h3>{review.analysis.recommendedDirection}</h3>
              {review.note && <p>Creator note: {review.note}</p>}

              <p className="panel-kicker">Dominant preferences</p>
              <ul>
                {review.analysis.dominantPreferences.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="panel-kicker">Close decisions</p>
              <ul>
                {review.analysis.closeDecisions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="panel-kicker">Audience tensions</p>
              <ul>
                {review.analysis.audienceTensions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="panel-kicker">Narrative risks</p>
              <ul>
                {review.analysis.narrativeRisks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="approval-actions">
              {review.status === "analysis_ready" ? (
                <>
                  <label htmlFor="creator-note">Note (optional)</label>
                  <textarea
                    id="creator-note"
                    value={note}
                    disabled={busy}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => decide("approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="button button-quiet"
                    disabled={busy}
                    onClick={() => decide("revision_requested")}
                  >
                    Request revision
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={busy}
                    onClick={() => decide("rejected")}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <small>
                    This review is {statusLabels[review.status].toLowerCase()}.
                  </small>
                  <button
                    type="button"
                    className="button button-quiet"
                    disabled={busy}
                    onClick={startReview}
                  >
                    Run New Analysis
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
