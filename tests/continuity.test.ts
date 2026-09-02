import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import {
  CreatorReviewNotApprovedError,
  MemoryCreatorReviewRepository,
  decideCreatorReview,
  startCreatorReview,
} from "../src/lib/creatorReview";
import {
  ContinuityAlreadyExistsError,
  ContinuityAnalysisSchema,
  ContinuityNotFoundError,
  ContinuityOutputError,
  buildContinuityInput,
  buildContinuityPrompt,
  getContinuityReview,
  MemoryContinuityRepository,
  runContinuityAnalysis,
  type ContinuityModel,
} from "../src/lib/continuity";
import {
  MemorySceneRepository,
  SceneNotFoundError,
  type OpeningScene,
} from "../src/lib/screenplay";

const movie = movieConcepts[0];

const audienceAnalysis = {
  dominantPreferences: ["Favor the mapmaker lead"],
  closeDecisions: ["Mystery vs. romance is close"],
  audienceTensions: ["Trust vs. evidence"],
  narrativeRisks: ["Do not explain the map too quickly"],
  recommendedDirection: "Keep the impossible map central and preserve ambiguity.",
};

const scene: OpeningScene = {
  movieId: movie.id,
  createdAt: "2026-09-02T00:00:00.000Z",
  scene: {
    title: "The Luminous Archive",
    slugline: "INT. PRINTMAKER'S WORKSHOP - NIGHT",
    setting: "A rain-darkened printmaker's workshop.",
    timeOfDay: "Night",
    characters: ["Elena", "Marcus"],
    scenePurpose: "Introduce the impossible map and an erased shared memory.",
    screenplay:
      "Elena studies a luminous map. Marcus realizes a bridge and their memory of it are both gone.",
    unresolvedQuestions: ["Who sent the map?"],
  },
};

const validAnalysis = {
  overallAssessment:
    "The scene is internally coherent and aligned with the approved mystery direction.",
  severity: "low" as const,
  continuityIssues: [],
  logicIssues: [],
  characterConsistencyIssues: [],
  worldRuleIssues: [
    {
      summary: "Memory-erasure rules remain undefined",
      evidence: "The scene establishes an effect but not its boundaries.",
      confidence: "risk" as const,
    },
  ],
  approvedDirectionAlignment: {
    status: "aligned" as const,
    summary: "The impossible map remains central and unexplained.",
  },
  unresolvedRisks: ["Later scenes need consistent memory-erasure boundaries."],
  recommendedFixes: ["Track each established map effect in future continuity notes."],
};

const model = (text: string): ContinuityModel => ({
  analyze: async () => text,
});

async function approvedReviewRepo() {
  const repository = new MemoryCreatorReviewRepository();
  await startCreatorReview(repository, movie.id, audienceAnalysis);
  await decideCreatorReview(repository, movie.id, "approved", "Preserve mystery.");
  return repository;
}

async function sceneRepo() {
  const repository = new MemorySceneRepository();
  await repository.save(scene);
  return repository;
}

test("blocks continuity analysis without an approved creator review", async () => {
  const creatorRepo = new MemoryCreatorReviewRepository();
  const scenes = await sceneRepo();
  await assert.rejects(
    () =>
      runContinuityAnalysis(
        movie.id,
        creatorRepo,
        scenes,
        new MemoryContinuityRepository(),
        model(JSON.stringify(validAnalysis)),
      ),
    CreatorReviewNotApprovedError,
  );
});

test("blocks continuity analysis when no generated scene exists", async () => {
  const creatorRepo = await approvedReviewRepo();
  await assert.rejects(
    () =>
      runContinuityAnalysis(
        movie.id,
        creatorRepo,
        new MemorySceneRepository(),
        new MemoryContinuityRepository(),
        model(JSON.stringify(validAnalysis)),
      ),
    SceneNotFoundError,
  );
});

test("approved review plus scene allows one structured continuity analysis", async () => {
  const creatorRepo = await approvedReviewRepo();
  const scenes = await sceneRepo();
  const repository = new MemoryContinuityRepository();
  const result = await runContinuityAnalysis(
    movie.id,
    creatorRepo,
    scenes,
    repository,
    model(JSON.stringify(validAnalysis)),
  );
  assert.deepEqual(result.analysis, validAnalysis);
  assert.equal(result.movieId, movie.id);
  assert.deepEqual(await repository.get(movie.id), result);
});

test("trusted continuity input includes movie, approved direction, and generated scene only", async () => {
  const creatorRepo = await approvedReviewRepo();
  const review = await creatorRepo.get(movie.id);
  assert.ok(review);
  const input = buildContinuityInput(movie, review, scene);
  const serialized = JSON.stringify(input);
  assert.equal(input.movie.title, movie.title);
  assert.equal(input.openingScene.slugline, scene.scene.slugline);
  assert.match(serialized, /approvedDirection/);
  assert.doesNotMatch(serialized, /session/i);
  assert.doesNotMatch(serialized, /hash/i);
  assert.doesNotMatch(serialized, /submission/i);
});

test("continuity prompt explicitly forbids invented unsupported facts and screenplay rewriting", async () => {
  const creatorRepo = await approvedReviewRepo();
  const review = await creatorRepo.get(movie.id);
  assert.ok(review);
  const prompt = buildContinuityPrompt(movie, review, scene);
  assert.match(prompt, /do not invent canon/i);
  assert.match(prompt, /do not rewrite the screenplay/i);
  assert.match(prompt, /confidence=confirmed/i);
  assert.match(prompt, /confidence=risk/i);
});

test("rejects non-JSON model output", async () => {
  const creatorRepo = await approvedReviewRepo();
  await assert.rejects(
    () =>
      runContinuityAnalysis(
        movie.id,
        creatorRepo,
        await sceneRepo(),
        new MemoryContinuityRepository(),
        model("not-json"),
      ),
    ContinuityOutputError,
  );
});

test("rejects structured output that fails the strict schema", async () => {
  const creatorRepo = await approvedReviewRepo();
  await assert.rejects(
    () =>
      runContinuityAnalysis(
        movie.id,
        creatorRepo,
        await sceneRepo(),
        new MemoryContinuityRepository(),
        model(JSON.stringify({ ...validAnalysis, extra: "nope" })),
      ),
    ContinuityOutputError,
  );
});

test("does not silently overwrite an existing continuity review", async () => {
  const creatorRepo = await approvedReviewRepo();
  const scenes = await sceneRepo();
  const repository = new MemoryContinuityRepository();
  await runContinuityAnalysis(
    movie.id,
    creatorRepo,
    scenes,
    repository,
    model(JSON.stringify(validAnalysis)),
  );

  let calledAgain = false;
  const secondModel: ContinuityModel = {
    analyze: async () => {
      calledAgain = true;
      return JSON.stringify(validAnalysis);
    },
  };
  await assert.rejects(
    () =>
      runContinuityAnalysis(
        movie.id,
        creatorRepo,
        scenes,
        repository,
        secondModel,
      ),
    ContinuityAlreadyExistsError,
  );
  assert.equal(calledAgain, false);
});

test("getContinuityReview returns 404-style domain error when analysis does not exist", async () => {
  await assert.rejects(
    () => getContinuityReview(new MemoryContinuityRepository(), movie.id),
    ContinuityNotFoundError,
  );
});

test("ContinuityAnalysisSchema accepts valid analysis and rejects extra fields", () => {
  assert.equal(ContinuityAnalysisSchema.safeParse(validAnalysis).success, true);
  assert.equal(
    ContinuityAnalysisSchema.safeParse({ ...validAnalysis, extra: true }).success,
    false,
  );
});
