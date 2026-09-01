import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import {
  AnalysisConfigError,
  AnalysisModelError,
  AnalysisOutputError,
  AnalysisValidationError,
  analyzeAudience,
  buildAudienceAnalystInput,
  geminiModelFromEnv,
  type AudienceAnalystModel,
} from "../src/lib/audienceAnalyst";
import { MemoryVoteRepository } from "../src/lib/votes";

const movie = movieConcepts[0];
const answers = Object.fromEntries(
  movie.ballotQuestions.map((q) => [q.id, [q.options[0].id]]),
);

const validAnalysis = {
  dominantPreferences: ["Audiences favor the mapmaker lead"],
  closeDecisions: ["Setting choice is nearly even"],
  audienceTensions: ["Trust vs. evidence"],
  narrativeRisks: ["Losing the mystery's stakes"],
  recommendedDirection: "Lean into the mapmaker's instinct-driven search.",
};

const mockModel = (text: string): AudienceAnalystModel => ({
  generate: async () => text,
});

test("returns validated analysis using only trusted aggregate data", async () => {
  const repository = new MemoryVoteRepository();
  await repository.submit(movie.id, answers, "hash-a");
  const capturedPrompts: string[] = [];
  const model: AudienceAnalystModel = {
    generate: async (prompt) => {
      capturedPrompts.push(prompt);
      return JSON.stringify(validAnalysis);
    },
  };
  const result = await analyzeAudience(movie.id, repository, model);
  assert.deepEqual(result, validAnalysis);
  assert.equal(capturedPrompts.length, 1);
  assert.match(capturedPrompts[0], /totalTrustedSubmissions/);
  assert.doesNotMatch(capturedPrompts[0], /hash-a/);
  assert.doesNotMatch(capturedPrompts[0], /sessionId/i);
  assert.doesNotMatch(capturedPrompts[0], /sessionHash/i);
});

test("rejects an unknown movie ID before contacting the model", async () => {
  const repository = new MemoryVoteRepository();
  let called = false;
  const model: AudienceAnalystModel = {
    generate: async () => {
      called = true;
      return JSON.stringify(validAnalysis);
    },
  };
  await assert.rejects(
    () => analyzeAudience("not-a-real-movie", repository, model),
    AnalysisValidationError,
  );
  assert.equal(called, false);
});

test("rejects model output that is not valid JSON", async () => {
  const repository = new MemoryVoteRepository();
  await assert.rejects(
    () => analyzeAudience(movie.id, repository, mockModel("not json")),
    AnalysisOutputError,
  );
});

test("rejects model output that fails schema validation", async () => {
  const repository = new MemoryVoteRepository();
  const incomplete = { ...validAnalysis, recommendedDirection: undefined };
  await assert.rejects(
    () =>
      analyzeAudience(
        movie.id,
        repository,
        mockModel(JSON.stringify(incomplete)),
      ),
    AnalysisOutputError,
  );
});

test("rejects model output with unexpected extra fields", async () => {
  const repository = new MemoryVoteRepository();
  const withExtra = { ...validAnalysis, sessionId: "should-not-be-here" };
  await assert.rejects(
    () =>
      analyzeAudience(
        movie.id,
        repository,
        mockModel(JSON.stringify(withExtra)),
      ),
    AnalysisOutputError,
  );
});

test("propagates model failures as AnalysisModelError", async () => {
  const repository = new MemoryVoteRepository();
  const model: AudienceAnalystModel = {
    generate: async () => {
      throw new AnalysisModelError("Gemini request failed.");
    },
  };
  await assert.rejects(
    () => analyzeAudience(movie.id, repository, model),
    AnalysisModelError,
  );
});

test("trusted input never includes session identifiers", () => {
  const aggregate = {
    movieId: movie.id,
    totalSubmissions: 3,
    counts: { [movie.ballotQuestions[0].options[0].id]: 3 },
    percentages: { [movie.ballotQuestions[0].options[0].id]: 100 },
  };
  const input = buildAudienceAnalystInput(movie, aggregate);
  const serialized = JSON.stringify(input);
  assert.doesNotMatch(serialized, /session/i);
  assert.doesNotMatch(serialized, /hash/i);
  assert.equal(input.totalTrustedSubmissions, 3);
  assert.equal(input.movie.title, movie.title);
});

test("geminiModelFromEnv requires GEMINI_API_KEY before contacting the Interactions API", () => {
  const saved = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    assert.throws(() => geminiModelFromEnv(), AnalysisConfigError);
  } finally {
    if (saved === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved;
  }
});
