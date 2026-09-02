/**
 * Pure UI-state helpers for CreatorReviewPanel, kept separate from the
 * component so their logic can be unit-tested without a DOM/component test
 * framework (this repo has none - see tests/creatorReviewUi.test.ts).
 */

/**
 * Label for the "Run Audience Analysis" / "Run New Analysis" trigger.
 * Shows clear copy while a request is in flight; no fake progress
 * percentage, just a busy/idle distinction.
 */
export function analysisTriggerLabel(analyzing: boolean, idleLabel: string): string {
  return analyzing ? "Analyzing audience signal…" : idleLabel;
}

/**
 * Label for the "Generate Opening Scene" trigger (Phase 7). Kept as its
 * own function rather than reusing analysisTriggerLabel's hardcoded busy
 * copy, since "Analyzing audience signal…" would be the wrong message
 * while a screenplay scene is generating.
 */
export function sceneTriggerLabel(generating: boolean, idleLabel: string): string {
  return generating ? "Generating opening scene…" : idleLabel;
}

/**
 * Resolves a caught value to a user-facing error message: an Error's own
 * message, or a safe fallback. Never surfaces a raw stack trace or
 * provider secret, since it only ever reads `.message` off an Error
 * instance (never the error object itself, never response internals).
 */
export function resolveErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
