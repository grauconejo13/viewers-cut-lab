import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import {
  createCreatorReview,
  CreatorReviewNotApprovedError,
  decideCreatorReview,
  MemoryCreatorReviewRepository,
  startCreatorReview,
} from "../src/lib/creatorReview";
import {
  buildSceneInput,
  generateOpeningScene,
  getOpeningScene,
  MemorySceneRepository,
  OpeningSceneSchema,
  SceneAlreadyExistsError,
  SceneNotFoundError,
  SceneOutputError,
  SceneValidationError,
  type SceneGeneratorModel,
} from "../src/lib/screenplay";

const movie = movieConcepts[0];

const analysis = {
  dominantPreferences: ["Audiences favor the mapmaker lead"],
  closeDecisions: ["Setting choice is nearly even"],
  audienceTensions: ["Trust vs. evidence"],
  narrativeRisks: ["Losing the mystery's stakes"],
  recommendedDirection: "Lean into the mapmaker's instinct-driven search.",
};

const validScene = {
  title: "The Archive Opens",
  slugline: "INT. SEALED STACKS - NIGHT",
  setting: "A hidden municipal archive beneath the river.",
  timeOfDay: "Night",
  characters: ["Mapmaker", "Archivist"],
  scenePurpose: "Establish the map's first erasure and the pair's tension.",
  screenplay: "The mapmaker unfolds a page that dissolves at its edges...",
  unresolvedQuestions: ["Why does the map erase only shared memories?"],
};

const mockModel = (text: string): SceneGeneratorModel => ({
  generate: async () => text,
});

async function approvedReviewRepo() {
  const repository = new MemoryCreatorReviewRepository();
  await startCreatorReview(repository, movie.id, analysis);
  await decideCreatorReview(repository, movie.id, "approved", undefined);
  return repository;
}

test("blocks generation when no creator review exists", async () => {
  const creatorReviewRepo = new MemoryCreatorReviewRepository();
  const sceneRepo = new MemorySceneRepository();
  await assert.rejects(
    () =>
      generateOpeningScene(
        movie.id,
        creatorReviewRepo,
        sceneRepo,
        mockModel(JSON.stringify(validScene)),
      ),
    CreatorReviewNotApprovedError,
  );
});

test("blocks generation when the review exists but is not approved", async () => {
  const creatorReviewRepo = new MemoryCreatorReviewRepository();
  await startCreatorReview(creatorReviewRepo, movie.id, analysis);
  const sceneRepo = new MemorySceneRepository();
  await assert.rejects(
    () =>
      generateOpeningScene(
        movie.id,
        creatorReviewRepo,
        sceneRepo,
        mockModel(JSON.stringify(validScene)),
      ),
    CreatorReviewNotApprovedError,
  );
});

test("allows generation once the review is approved, using only trusted data", async () => {
  const creatorReviewRepo = await approvedReviewRepo();
  const sceneRepo = new MemorySceneRepository();
  const capturedPrompts: string[] = [];
  const model: SceneGeneratorModel = {
    generate: async (prompt) => {
      capturedPrompts.push(prompt);
      return JSON.stringify(validScene);
    },
  };
  const result = await generateOpeningScene(
    movie.id,
    creatorReviewRepo,
    sceneRepo,
    model,
  );
  assert.deepEqual(result.scene, validScene);
  assert.equal(result.movieId, movie.id);
  assert.equal(capturedPrompts.length, 1);
  assert.match(capturedPrompts[0], /approvedDirection/);
  assert.doesNotMatch(capturedPrompts[0], /sessionId/i);
  assert.doesNotMatch(capturedPrompts[0], /sessionHash/i);
  assert.doesNotMatch(capturedPrompts[0], /submission/i);
});

test("rejects an unknown movie ID before checking approval", async () => {
  const creatorReviewRepo = new MemoryCreatorReviewRepository();
  const sceneRepo = new MemorySceneRepository();
  await assert.rejects(
    () =>
      generateOpeningScene(
        "not-a-real-movie",
        creatorReviewRepo,
        sceneRepo,
        mockModel(JSON.stringify(validScene)),
      ),
    SceneValidationError,
  );
});

test("rejects model output that is not valid JSON", async () => {
  const creatorReviewRepo = await approvedReviewRepo();
  const sceneRepo = new MemorySceneRepository();
  await assert.rejects(
    () =>
      generateOpeningScene(
        movie.id,
        creatorReviewRepo,
        sceneRepo,
        mockModel("not json"),
      ),
    SceneOutputError,
  );
});

test("rejects model output that fails schema validation", async () => {
  const creatorReviewRepo = await approvedReviewRepo();
  const sceneRepo = new MemorySceneRepository();
  const incomplete = { ...validScene, screenplay: undefined };
  await assert.rejects(
    () =>
      generateOpeningScene(
        movie.id,
        creatorReviewRepo,
        sceneRepo,
        mockModel(JSON.stringify(incomplete)),
      ),
    SceneOutputError,
  );
});

test("does not generate a second scene once one already exists", async () => {
  const creatorReviewRepo = await approvedReviewRepo();
  const sceneRepo = new MemorySceneRepository();
  const model = mockModel(JSON.stringify(validScene));
  await generateOpeningScene(movie.id, creatorReviewRepo, sceneRepo, model);

  let calledAgain = false;
  const secondModel: SceneGeneratorModel = {
    generate: async () => {
      calledAgain = true;
      return JSON.stringify(validScene);
    },
  };
  await assert.rejects(
    () =>
      generateOpeningScene(movie.id, creatorReviewRepo, sceneRepo, secondModel),
    SceneAlreadyExistsError,
  );
  assert.equal(calledAgain, false);

  const stored = await sceneRepo.get(movie.id);
  assert.deepEqual(stored?.scene, validScene);
});

test("getOpeningScene distinguishes unknown movie from no scene yet", async () => {
  const sceneRepo = new MemorySceneRepository();
  await assert.rejects(
    () => getOpeningScene(sceneRepo, "not-a-real-movie"),
    SceneValidationError,
  );
  await assert.rejects(
    () => getOpeningScene(sceneRepo, movie.id),
    SceneNotFoundError,
  );
});

test("trusted scene input never includes session identifiers or submission data", () => {
  const review = createCreatorReview(movie.id, analysis);
  const input = buildSceneInput(movie, review);
  const serialized = JSON.stringify(input);
  assert.doesNotMatch(serialized, /session/i);
  assert.doesNotMatch(serialized, /hash/i);
  assert.doesNotMatch(serialized, /submission/i);
  assert.equal(input.movie.title, movie.title);
  assert.equal(
    input.approvedDirection.recommendedDirection,
    analysis.recommendedDirection,
  );
});

test("OpeningSceneSchema accepts a well-formed scene and rejects extra fields", () => {
  assert.equal(OpeningSceneSchema.safeParse(validScene).success, true);
  assert.equal(
    OpeningSceneSchema.safeParse({ ...validScene, extra: "nope" }).success,
    false,
  );
});
