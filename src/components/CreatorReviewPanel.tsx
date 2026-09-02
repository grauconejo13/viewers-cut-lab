"use client";
import { useCallback, useEffect, useState } from "react";
import {
  analysisTriggerLabel,
  resolveErrorMessage,
  sceneTriggerLabel,
} from "@/lib/creatorReviewUi";

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

type OpeningSceneResult = {
  title: string;
  slugline: string;
  setting: string;
  timeOfDay: string;
  characters: string[];
  scenePurpose: string;
  screenplay: string;
  unresolvedQuestions: string[];
};

type OpeningScene = {
  movieId: string;
  scene: OpeningSceneResult;
  createdAt: string;
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
  // busy: any request in flight (disables controls).
  // analyzing: specifically the Gemini-backed startReview request, so the
  // trigger can say "Analyzing audience signal…" rather than mislabeling
  // the initial state check as an analysis in progress.
  const [busy, setBusy] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState("");

  const [scene, setScene] = useState<OpeningScene | null>(null);
  const [generatingScene, setGeneratingScene] = useState(false);
  const [sceneError, setSceneError] = useState("");

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
      setError(resolveErrorMessage(err, "Unable to load creator review."));
    } finally {
      setBusy(false);
      setInitialLoad(false);
    }
  }, [movieId]);

  const loadScene = useCallback(async () => {
    try {
      const response = await fetch(`/api/opening-scene/${movieId}`);
      if (response.status === 404) {
        setScene(null);
        return;
      }
      const data = (await response.json()) as {
        scene?: OpeningScene;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to load the opening scene.");
      setScene(data.scene ?? null);
    } catch (err) {
      setSceneError(resolveErrorMessage(err, "Unable to load the opening scene."));
    }
  }, [movieId]);

  useEffect(() => {
    // Fetch-on-mount is intentional: there is no external store to
    // subscribe to here, just a one-time GET for the current review and
    // scene state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadScene();
  }, [load, loadScene]);

  const startReview = async () => {
    setBusy(true);
    setAnalyzing(true);
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
      setError(resolveErrorMessage(err, "Unable to start creator review."));
    } finally {
      setBusy(false);
      setAnalyzing(false);
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
      setError(resolveErrorMessage(err, "Unable to record creator decision."));
    } finally {
      setBusy(false);
    }
  };

  const generateScene = async () => {
    setBusy(true);
    setGeneratingScene(true);
    setSceneError("");
    try {
      const response = await fetch(`/api/opening-scene/${movieId}`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        scene?: OpeningScene;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to generate the opening scene.");
      setScene(data.scene ?? null);
    } catch (err) {
      setSceneError(
        resolveErrorMessage(err, "Unable to generate the opening scene."),
      );
    } finally {
      setBusy(false);
      setGeneratingScene(false);
    }
  };

  return (
    <main className="story-shell">
      <div className="story-main">
        <p className="eyebrow">
          Creator review - internal, not part of the public audience flow
        </p>
        <h1>{title}</h1>

        {initialLoad && (
          <p aria-live="polite" className="story-announcement">
            Loading creator review…
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {!initialLoad && !review && (
          <div className="approval-panel">
            <div>
              <p className="panel-kicker">No analysis yet</p>
              <p>No creator review has been started for this film.</p>
            </div>
            <div className="approval-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                aria-busy={analyzing}
                onClick={startReview}
              >
                {analysisTriggerLabel(analyzing, "Run Audience Analysis")}
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
                    aria-busy={analyzing}
                    onClick={startReview}
                  >
                    {analysisTriggerLabel(analyzing, "Run New Analysis")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {review && review.status === "approved" && (
          <div className="approval-panel">
            <div>
              <p className="panel-kicker">Opening scene</p>

              {sceneError && (
                <p className="error" role="alert">
                  {sceneError}
                </p>
              )}

              {!scene && <p>No opening scene has been generated yet.</p>}

              {scene && (
                <>
                  <h3>{scene.scene.title}</h3>
                  <p>
                    <strong>{scene.scene.slugline}</strong>
                  </p>
                  <p>
                    {scene.scene.setting} - {scene.scene.timeOfDay}
                  </p>
                  <p className="panel-kicker">Characters</p>
                  <ul>
                    {scene.scene.characters.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <p className="panel-kicker">Scene purpose</p>
                  <p>{scene.scene.scenePurpose}</p>
                  <p className="panel-kicker">Screenplay</p>
                  <pre className="screenplay-text">{scene.scene.screenplay}</pre>
                  <p className="panel-kicker">Unresolved questions</p>
                  <ul>
                    {scene.scene.unresolvedQuestions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="approval-actions">
              {!scene ? (
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  aria-busy={generatingScene}
                  onClick={generateScene}
                >
                  {sceneTriggerLabel(generatingScene, "Generate Opening Scene")}
                </button>
              ) : (
                <small>
                  An opening scene has already been generated for this film.
                  Regeneration is not available in this prototype.
                </small>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
