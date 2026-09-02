"use client";

import { useCallback, useEffect, useState } from "react";
import {
  continuityTriggerLabel,
  resolveErrorMessage,
} from "@/lib/creatorReviewUi";

type Issue = {
  summary: string;
  evidence: string;
  confidence: "confirmed" | "risk" | "watchpoint";
};

type ContinuityReview = {
  movieId: string;
  analysis: {
    overallAssessment: string;
    severity: "none" | "low" | "medium" | "high";
    continuityIssues: Issue[];
    logicIssues: Issue[];
    characterConsistencyIssues: Issue[];
    worldRuleIssues: Issue[];
    approvedDirectionAlignment: {
      status: "aligned" | "partial" | "conflict";
      summary: string;
    };
    unresolvedRisks: string[];
    recommendedFixes: string[];
  };
  createdAt: string;
};

const issueLabels: Record<Issue["confidence"], string> = {
  confirmed: "Confirmed issue",
  risk: "Potential risk",
  watchpoint: "Continuity watchpoint",
};

function IssueList({ title, issues }: { title: string; issues: Issue[] }) {
  return (
    <div>
      <p className="panel-kicker">{title}</p>
      {issues.length === 0 ? (
        <p>None identified.</p>
      ) : (
        <ul>
          {issues.map((issue, index) => (
            <li key={`${issue.summary}-${index}`}>
              <strong>{issueLabels[issue.confidence]}: {issue.summary}</strong> — {issue.evidence}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ContinuityReviewPanel({ movieId }: { movieId: string }) {
  const [eligible, setEligible] = useState(false);
  const [continuity, setContinuity] = useState<ContinuityReview | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [reviewResponse, sceneResponse] = await Promise.all([
        fetch(`/api/creator-review/${movieId}`),
        fetch(`/api/opening-scene/${movieId}`),
      ]);

      if (!reviewResponse.ok || !sceneResponse.ok) {
        setEligible(false);
        return;
      }

      const reviewData = (await reviewResponse.json()) as {
        review?: { status?: string };
      };
      if (reviewData.review?.status !== "approved") {
        setEligible(false);
        return;
      }

      setEligible(true);

      const response = await fetch(`/api/continuity-analysis/${movieId}`);
      if (response.status === 404) {
        setContinuity(null);
        return;
      }
      const data = (await response.json()) as {
        continuity?: ContinuityReview;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to load continuity analysis.");
      setContinuity(data.continuity ?? null);
    } catch (err) {
      setError(resolveErrorMessage(err, "Unable to load continuity analysis."));
    }
  }, [movieId]);

  useEffect(() => {
    void load();
    if (eligible) return;
    const interval = window.setInterval(() => {
      void load();
    }, 1500);
    return () => window.clearInterval(interval);
  }, [eligible, load]);

  if (!eligible) return null;

  const runCheck = async () => {
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`/api/continuity-analysis/${movieId}`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        continuity?: ContinuityReview;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to run continuity analysis.");
      setContinuity(data.continuity ?? null);
    } catch (err) {
      setError(resolveErrorMessage(err, "Unable to run continuity analysis."));
    } finally {
      setChecking(false);
    }
  };

  const analysis = continuity?.analysis;

  return (
    <div className="approval-panel">
      <div>
        <p className="panel-kicker">Continuity &amp; story logic</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {!analysis && <p>Run a continuity check on the approved opening scene.</p>}

        {analysis && (
          <>
            <p>
              <strong>Severity: {analysis.severity}</strong>
            </p>
            <p>{analysis.overallAssessment}</p>

            <p className="panel-kicker">Approved direction alignment</p>
            <p>
              <strong>{analysis.approvedDirectionAlignment.status}</strong> — {analysis.approvedDirectionAlignment.summary}
            </p>

            <IssueList title="Continuity issues" issues={analysis.continuityIssues} />
            <IssueList title="Logic issues" issues={analysis.logicIssues} />
            <IssueList
              title="Character consistency issues"
              issues={analysis.characterConsistencyIssues}
            />
            <IssueList title="World-rule issues" issues={analysis.worldRuleIssues} />

            <p className="panel-kicker">Unresolved risks</p>
            {analysis.unresolvedRisks.length === 0 ? (
              <p>None identified.</p>
            ) : (
              <ul>
                {analysis.unresolvedRisks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            )}

            <p className="panel-kicker">Recommended fixes</p>
            {analysis.recommendedFixes.length === 0 ? (
              <p>No fixes recommended.</p>
            ) : (
              <ul>
                {analysis.recommendedFixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="approval-actions">
        {!continuity ? (
          <button
            type="button"
            className="button"
            disabled={checking}
            aria-busy={checking}
            onClick={runCheck}
          >
            {continuityTriggerLabel(checking, "Run Continuity Check")}
          </button>
        ) : (
          <small>
            Continuity analysis has already been run for this scene. Re-analysis
            is not available in this prototype.
          </small>
        )}
      </div>
    </div>
  );
}
