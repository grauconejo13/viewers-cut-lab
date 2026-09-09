"use client";

import { useState } from "react";

export function ProductionIntelligencePanel({ movieId }: { movieId: string }) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await fetch(`/api/production-intelligence/${movieId}`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        recommendation?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Production intelligence request failed.");
      }
      setResult(data.recommendation ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Production intelligence failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="approval-panel">
      <div>
        <p className="panel-kicker">Production intelligence</p>
        <h3>Google ADK + ClickHouse MCP</h3>
        <p>
          Query ClickHouse Cloud through the official mcp-clickhouse server and
          return the next production action grounded in stored audience and
          continuity evidence.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {result && (
          <pre className="screenplay-text" aria-live="polite">
            {result}
          </pre>
        )}
      </div>

      <div className="approval-actions">
        <button
          type="button"
          className="button"
          disabled={busy}
          aria-busy={busy}
          onClick={run}
        >
          {busy ? "Querying ClickHouse…" : "Run Production Intelligence"}
        </button>
      </div>
    </div>
  );
}
