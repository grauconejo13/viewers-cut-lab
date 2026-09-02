import assert from "node:assert/strict";
import test from "node:test";
import {
  analysisTriggerLabel,
  resolveErrorMessage,
  sceneTriggerLabel,
} from "../src/lib/creatorReviewUi";

test("analysisTriggerLabel shows clear busy copy while analyzing, regardless of idle label", () => {
  assert.equal(
    analysisTriggerLabel(true, "Run Audience Analysis"),
    "Analyzing audience signal…",
  );
  assert.equal(
    analysisTriggerLabel(true, "Run New Analysis"),
    "Analyzing audience signal…",
  );
});

test("analysisTriggerLabel falls back to the idle label when not analyzing", () => {
  assert.equal(
    analysisTriggerLabel(false, "Run Audience Analysis"),
    "Run Audience Analysis",
  );
  assert.equal(
    analysisTriggerLabel(false, "Run New Analysis"),
    "Run New Analysis",
  );
});

test("resolveErrorMessage surfaces an Error's own message", () => {
  assert.equal(
    resolveErrorMessage(new Error("Gemini is not configured."), "fallback"),
    "Gemini is not configured.",
  );
});

test("resolveErrorMessage falls back for non-Error values and empty messages, never leaking internals", () => {
  assert.equal(resolveErrorMessage("raw string thrown", "fallback"), "fallback");
  assert.equal(resolveErrorMessage(new Error(""), "fallback"), "fallback");
  assert.equal(resolveErrorMessage(undefined, "fallback"), "fallback");
  assert.equal(resolveErrorMessage(null, "fallback"), "fallback");
});

test("sceneTriggerLabel shows distinct busy copy while generating, not the analysis-trigger copy", () => {
  assert.equal(
    sceneTriggerLabel(true, "Generate Opening Scene"),
    "Generating opening scene…",
  );
  assert.notEqual(
    sceneTriggerLabel(true, "Generate Opening Scene"),
    analysisTriggerLabel(true, "Run Audience Analysis"),
  );
});

test("sceneTriggerLabel falls back to the idle label when not generating", () => {
  assert.equal(
    sceneTriggerLabel(false, "Generate Opening Scene"),
    "Generate Opening Scene",
  );
});
