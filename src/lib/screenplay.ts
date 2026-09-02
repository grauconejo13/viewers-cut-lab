import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { movieConcepts, type MovieConcept } from "@/data/demo-data";
import {
  requireApprovedReview,
  type CreatorReview,
  type CreatorReviewRepository,
} from "@/lib/creatorReview";

export class SceneValidationError extends Error {}
export class SceneNotFoundError extends Error {}
export class SceneAlreadyExistsError extends Error {}
export class SceneConfigError extends Error {}
export class SceneModelError extends Error {}
export class SceneOutputError extends Error {}

/**
 * Strict opening-scene result schema. Kept to exactly one reviewable
 * opening scene - not a multi-scene outline or a finished screenplay.
 */
export const OpeningSceneSchema = z
  .object({
    title: z.string().min(1).max(120),
    slugline: z.string().min(1).max(140),
    setting: z.string().min(1).max(300),
    timeOfDay: z.string().min(1).max(60),
    characters: z.array(z.string().min(1).max(120)).min(1).max(8),
    scenePurpose: z.string().min(1).max(400),
    screenplay: z.string().min(1).max(6000),
    unresolvedQuestions: z.array(z.string().min(1).max(240)).max(6),
  })
  .strict();
export type OpeningSceneResult = z.infer<typeof OpeningSceneSchema>;

export type OpeningScene = {
  movieId: string;
  scene: OpeningSceneResult;
  createdAt: string;
};

// Standard JSON Schema, matching the Interactions API's response_format.schema
// contract used by the Phase 5A Audience Analyst.
const sceneResponseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    slugline: { type: "string" },
    setting: { type: "string" },
    timeOfDay: { type: "string" },
    characters: { type: "array", items: { type: "string" } },
    scenePurpose: { type: "string" },
    screenplay: { type: "string" },
    unresolvedQuestions: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "slugline",
    "setting",
    "timeOfDay",
    "characters",
    "scenePurpose",
    "screenplay",
    "unresolvedQuestions",
  ],
} as const;

const MODEL = "gemini-3.6-flash";

function findConcept(movieId: string): MovieConcept {
  const concept = movieConcepts.find((c) => c.id === movieId);
  if (!concept) throw new SceneValidationError("Unknown movie ID.");
  return concept;
}

/**
 * The exact payload sent to Gemini: trusted fictional movie metadata and
 * the approved creator review's audience-analysis direction (including the
 * creator's own note, if any). This never includes session IDs, session
 * hashes, or raw submission documents - CreatorReview and AudienceAnalysis
 * carry none of that data to begin with.
 */
export function buildSceneInput(concept: MovieConcept, review: CreatorReview) {
  return {
    movie: {
      title: concept.title,
      genre: concept.genre,
      synopsis: concept.synopsis,
      tones: concept.tones,
    },
    approvedDirection: {
      recommendedDirection: review.analysis.recommendedDirection,
      dominantPreferences: review.analysis.dominantPreferences,
      closeDecisions: review.analysis.closeDecisions,
      audienceTensions: review.analysis.audienceTensions,
      narrativeRisks: review.analysis.narrativeRisks,
      creatorNote: review.note ?? null,
    },
  };
}

function buildScenePrompt(concept: MovieConcept, review: CreatorReview) {
  const input = buildSceneInput(concept, review);
  return [
    "You are the Screenwriter for a fictional interactive movie lab.",
    "Generate exactly one reviewable opening scene for this fictional prototype, consistent with the approved direction below. Do not contradict the approved direction. This is one focused opening scene only, not a full screenplay or outline of later scenes.",
    "Respond with the requested JSON structure only.",
    JSON.stringify(input),
  ].join("\n\n");
}

/** Minimal model surface the screenwriter depends on, so tests can mock it. */
export interface SceneGeneratorModel {
  generate(prompt: string): Promise<string>;
}

export function sceneModelFromEnv(): SceneGeneratorModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new SceneConfigError("Gemini is not configured.");
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generate(prompt: string) {
      try {
        const response = await ai.interactions.create({
          model: MODEL,
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: sceneResponseSchema,
          },
        });
        return response.output_text ?? "";
      } catch (error) {
        throw new SceneModelError(
          error instanceof Error ? error.message : "Gemini request failed.",
        );
      }
    },
  };
}

/**
 * Storage boundary for generated scenes. An in-memory implementation is
 * used for now; a Firestore-backed implementation can replace it later
 * without changing this contract or any route behavior - the same pattern
 * already used for votes (Phase 4A/4B) and creator reviews (Phase 6).
 */
export interface SceneRepository {
  get(movieId: string): Promise<OpeningScene | null>;
  save(scene: OpeningScene): Promise<void>;
}

export class MemorySceneRepository implements SceneRepository {
  private scenes = new Map<string, OpeningScene>();
  async get(movieId: string) {
    return this.scenes.get(movieId) ?? null;
  }
  async save(scene: OpeningScene) {
    this.scenes.set(scene.movieId, scene);
  }
}

/**
 * Shared in-memory store for the current prototype. Resets on server
 * restart, matching the Phase 4A vote store and the Phase 6 creator-review
 * store before either had (or, for reviews, has yet to have) Firestore
 * persistence.
 */
export const sceneRepository: SceneRepository = new MemorySceneRepository();

export async function getOpeningScene(
  repository: Pick<SceneRepository, "get">,
  movieId: string,
): Promise<OpeningScene> {
  findConcept(movieId);
  const scene = await repository.get(movieId);
  if (!scene)
    throw new SceneNotFoundError(
      "No opening scene has been generated for this movie.",
    );
  return scene;
}

/**
 * Generates the one opening scene for a movie. Blocked deterministically
 * unless the current creator review is approved (via the existing Phase 6
 * requireApprovedReview gate - covers both "no review at all" and "review
 * exists but is not approved"). Does not silently overwrite: if a scene
 * already exists for this movie, generation is refused rather than
 * regenerating - the simplest deterministic behavior for this phase.
 */
export async function generateOpeningScene(
  movieId: string,
  creatorReviewRepository: Pick<CreatorReviewRepository, "get">,
  sceneRepo: Pick<SceneRepository, "get" | "save">,
  model: SceneGeneratorModel,
): Promise<OpeningScene> {
  const concept = findConcept(movieId);
  const review = await requireApprovedReview(creatorReviewRepository, movieId);

  const existing = await sceneRepo.get(movieId);
  if (existing)
    throw new SceneAlreadyExistsError(
      "A scene has already been generated for this movie.",
    );

  const text = await model.generate(buildScenePrompt(concept, review));
  if (!text) throw new SceneModelError("Gemini returned no content.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SceneOutputError("Gemini response was not valid JSON.");
  }
  const result = OpeningSceneSchema.safeParse(parsed);
  if (!result.success)
    throw new SceneOutputError("Gemini output failed schema validation.");

  const scene: OpeningScene = {
    movieId,
    scene: result.data,
    createdAt: new Date().toISOString(),
  };
  await sceneRepo.save(scene);
  return scene;
}
