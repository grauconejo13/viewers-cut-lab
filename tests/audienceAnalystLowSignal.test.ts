import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import {
  AudienceAnalysisSchema,
  analyzeAudience,
  buildDeterministicAnalysis,
  CLOSE_DECISION_MARGIN_POINTS,
  detectCloseDecisions,
  MIN_AUDIENCE_SUBMISSIONS,
  type AudienceAnalystModel,
} from "../src/lib/audienceAnalyst";
import { createCreatorReview } from "../src/lib/creatorReview";
import { MemoryVoteRepository, type VoteAggregate } from "../src/lib/votes";

const movie = movieConcepts[0];
const question = movie.ballotQuestions[0];
const [optionA, optionB] = question.options;
const allAnswers = Object.fromEntries(
  movie.ballotQuestions.map((q) => [q.id, [q.options[0].id]]),
);

function aggregateWithPercentages(
  percentageA: number,
  percentageB: number,
  totalSubmissions = 10,
): VoteAggregate {
  return {
    movieId: movie.id,
    totalSubmissions,
    counts: { [optionA.id]: 0, [optionB.id]: 0 },
    percentages: { [optionA.id]: percentageA, [optionB.id]: percentageB },
  };
}

const throwingModel: AudienceAnalystModel = {
  generate: async () => {
    throw new Error("Gemini should not have been called for low-signal data.");
  },
};

async function seed(repository: MemoryVoteRepository, count: number) {
  for (let i = 0; i < count; i++) {
    await repository.submit(movie.id, allAnswers, `hash-${i}`);
  }
}

test("zero submissions skips Gemini and returns a deterministic no-data result", async () => {
  const repository = new MemoryVoteRepository();
  const result = await analyzeAudience(movie.id, repository, throwingModel);
  assert.equal(AudienceAnalysisSchema.safeParse(result).success, true);
  assert.match(result.recommendedDirection, /deterministic/i);
  assert.match(result.narrativeRisks.join(" "), /deterministic/i);
});

test("below the minimum threshold skips Gemini and returns a deterministic low-signal result", async () => {
  const repository = new MemoryVoteRepository();
  await seed(repository, MIN_AUDIENCE_SUBMISSIONS - 1);
  const result = await analyzeAudience(movie.id, repository, throwingModel);
  assert.equal(AudienceAnalysisSchema.safeParse(result).success, true);
  assert.match(result.recommendedDirection, /deterministic/i);
  assert.match(
    result.narrativeRisks.join(" "),
    new RegExp(`${MIN_AUDIENCE_SUBMISSIONS}-submission threshold`),
  );
});

test("meeting the minimum threshold calls Gemini", async () => {
  const repository = new MemoryVoteRepository();
  await seed(repository, MIN_AUDIENCE_SUBMISSIONS);
  let called = false;
  const model: AudienceAnalystModel = {
    generate: async () => {
      called = true;
      return JSON.stringify({
        dominantPreferences: ["x"],
        closeDecisions: [],
        audienceTensions: [],
        narrativeRisks: [],
        recommendedDirection: "y",
      });
    },
  };
  await analyzeAudience(movie.id, repository, model);
  assert.equal(called, true);
});

test("detects an exact tie between the top two options", () => {
  const close = detectCloseDecisions(movie, aggregateWithPercentages(50, 50));
  assert.equal(close.length, 1);
  assert.match(close[0], /exact tie/i);
});

test("detects a near-tie within the margin", () => {
  const close = detectCloseDecisions(movie, aggregateWithPercentages(52, 48));
  assert.equal(close.length, 1);
  assert.match(close[0], /close/i);
  assert.doesNotMatch(close[0], /exact tie/i);
});

test("does not flag a clear majority as close", () => {
  const close = detectCloseDecisions(movie, aggregateWithPercentages(80, 20));
  assert.equal(close.length, 0);
});

test("close-decision margin is inclusive at the boundary and exclusive just past it", () => {
  const half = CLOSE_DECISION_MARGIN_POINTS / 2;
  const atMargin = aggregateWithPercentages(50 + half, 50 - half);
  assert.equal(detectCloseDecisions(movie, atMargin).length, 1);

  const pastMargin = aggregateWithPercentages(50 + half + 1, 50 - half - 1);
  assert.equal(detectCloseDecisions(movie, pastMargin).length, 0);
});

test("buildAudienceAnalystInput includes detected close decisions for Gemini", async () => {
  const repository = new MemoryVoteRepository();
  await seed(repository, MIN_AUDIENCE_SUBMISSIONS);
  const capturedPrompts: string[] = [];
  const model: AudienceAnalystModel = {
    generate: async (prompt) => {
      capturedPrompts.push(prompt);
      return JSON.stringify({
        dominantPreferences: ["x"],
        closeDecisions: [],
        audienceTensions: [],
        narrativeRisks: [],
        recommendedDirection: "y",
      });
    },
  };
  await analyzeAudience(movie.id, repository, model);
  assert.match(capturedPrompts[0], /detectedCloseDecisions/);
  assert.match(capturedPrompts[0], /invent certainty/i);
});

test("buildDeterministicAnalysis output always passes AudienceAnalysisSchema", () => {
  const zero = buildDeterministicAnalysis(movie, aggregateWithPercentages(0, 0, 0));
  assert.equal(AudienceAnalysisSchema.safeParse(zero).success, true);

  const lowSignal = buildDeterministicAnalysis(
    movie,
    aggregateWithPercentages(60, 40, 3),
  );
  assert.equal(AudienceAnalysisSchema.safeParse(lowSignal).success, true);
  assert.equal(lowSignal.closeDecisions.length, 0);

  const lowSignalTied = buildDeterministicAnalysis(
    movie,
    aggregateWithPercentages(50, 50, 3),
  );
  assert.equal(AudienceAnalysisSchema.safeParse(lowSignalTied).success, true);
  assert.equal(lowSignalTied.closeDecisions.length, 1);
});

test("a deterministic low-signal analysis can still start a creator review", () => {
  const lowSignal = buildDeterministicAnalysis(
    movie,
    aggregateWithPercentages(60, 40, 3),
  );
  const review = createCreatorReview(movie.id, lowSignal);
  assert.equal(review.status, "analysis_ready");
  assert.equal(review.analysis, lowSignal);
});
