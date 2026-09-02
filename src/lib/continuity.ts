import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { movieConcepts, type MovieConcept } from "@/data/demo-data";
import {
  requireApprovedReview,
  type CreatorReview,
  type CreatorReviewRepository,
} from "@/lib/creatorReview";
import {
  getOpeningScene,
  type OpeningScene,
  type SceneRepository,
} from "@/lib/screenplay";

export class ContinuityValidationError extends Error {}
export class ContinuityNotFoundError extends Error {}
export class ContinuityAlreadyExistsError extends Error {}
export class ContinuityConfigError extends Error {}
export class ContinuityModelError extends Error {}
export class ContinuityOutputError extends Error {}

export const ContinuityIssueConfidenceSchema = z.enum([
  "confirmed",
  "risk",
  "watchpoint",
]);
export type ContinuityIssueConfidence = z.infer<
  typeof ContinuityIssueConfidenceSchema
>;

const issueSchema = z
  .object({
    summary: z.string().min(1).max(240),
    evidence: z.string().min(1).max(500),
    confidence: ContinuityIssueConfidenceSchema,
  })
  .strict();

export const ContinuityAnalysisSchema = z
  .object({
    overallAssessment: z.string().min(1).max(800),
    severity: z.enum(["none", "low", "medium", "high"]),
    continuityIssues: z.array(issueSchema).max(8),
    logicIssues: z.array(issueSchema).max(8),
    characterConsistencyIssues: z.array(issueSchema).max(8),
    worldRuleIssues: z.array(issueSchema).max(8),
    approvedDirectionAlignment: z
      .object({
        status: z.enum(["aligned", "partial", "conflict"]),
        summary: z.string().min(1).max(500),
      })
      .strict(),
    unresolvedRisks: z.array(z.string().min(1).max(300)).max(8),
    recommendedFixes: z.array(z.string().min(1).max(400)).max(8),
  })
  .strict();

export type ContinuityAnalysis = z.infer<typeof ContinuityAnalysisSchema>;

export type ContinuityReview = {
  movieId: string;
  analysis: ContinuityAnalysis;
  createdAt: string;
};

const issueResponseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    evidence: { type: "string" },
    confidence: {
      type: "string",
      enum: ["confirmed", "risk", "watchpoint"],
    },
  },
  required: ["summary", "evidence", "confidence"],
} as const;

const continuityResponseSchema = {
  type: "object",
  properties: {
    overallAssessment: { type: "string" },
    severity: { type: "string", enum: ["none", "low", "medium", "high"] },
    continuityIssues: { type: "array", items: issueResponseSchema },
    logicIssues: { type: "array", items: issueResponseSchema },
    characterConsistencyIssues: { type: "array", items: issueResponseSchema },
    worldRuleIssues: { type: "array", items: issueResponseSchema },
    approvedDirectionAlignment: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["aligned", "partial", "conflict"] },
        summary: { type: "string" },
      },
      required: ["status", "summary"],
    },
    unresolvedRisks: { type: "array", items: { type: "string" } },
    recommendedFixes: { type: "array", items: { type: "string" } },
  },
  required: [
    "overallAssessment",
    "severity",
    "continuityIssues",
    "logicIssues",
    "characterConsistencyIssues",
    "worldRuleIssues",
    "approvedDirectionAlignment",
    "unresolvedRisks",
    "recommendedFixes",
  ],
} as const;

const MODEL = "gemini-3.6-flash";

function findConcept(movieId: string): MovieConcept {
  const concept = movieConcepts.find((item) => item.id === movieId);
  if (!concept) throw new ContinuityValidationError("Unknown movie ID.");
  return concept;
}

/** Trusted server-side payload supplied to the continuity supervisor. */
export function buildContinuityInput(
  concept: MovieConcept,
  review: CreatorReview,
  scene: OpeningScene,
) {
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
    openingScene: scene.scene,
  };
}

export function buildContinuityPrompt(
  concept: MovieConcept,
  review: CreatorReview,
  scene: OpeningScene,
) {
  return [
    "You are the continuity supervisor and story-logic editor for a fictional interactive movie lab.",
    "Review exactly the supplied opening scene against the supplied movie context and approved creator direction.",
    "Identify contradictions and logic problems; do not rewrite the screenplay.",
    "Classify each issue carefully: confidence=confirmed only when the supplied material directly contradicts itself or directly demonstrates the problem; confidence=risk when there is enough evidence for concern but not enough to prove a contradiction; confidence=watchpoint when something is valid now but future scenes must keep it consistent, such as character knowledge, object state, location, setup/payoff, unresolved fact, or an emerging world rule.",
    "Do not treat ordinary mystery, unanswered setup, or intentionally undefined world rules as defects merely because they are unresolved; use watchpoint when the material is currently coherent but should be tracked.",
    "Do not invent canon, backstory, world rules, character facts, or continuity facts that are not present in the supplied data.",
    "Check character behavior, world logic, internal continuity, unresolved narrative risks, and alignment with the approved direction.",
    "Recommended fixes should be concise editorial actions, not replacement screenplay prose.",
    "Respond with the requested JSON structure only.",
    JSON.stringify(buildContinuityInput(concept, review, scene)),
  ].join("\n\n");
}

export interface ContinuityModel {
  analyze(prompt: string): Promise<string>;
}

export function continuityModelFromEnv(): ContinuityModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ContinuityConfigError("Gemini is not configured.");
  const ai = new GoogleGenAI({ apiKey });
  return {
    async analyze(prompt: string) {
      try {
        const response = await ai.interactions.create({
          model: MODEL,
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: continuityResponseSchema,
          },
        });
        return response.output_text ?? "";
      } catch (error) {
        throw new ContinuityModelError(
          error instanceof Error ? error.message : "Gemini request failed.",
        );
      }
    },
  };
}

export interface ContinuityRepository {
  get(movieId: string): Promise<ContinuityReview | null>;
  save(review: ContinuityReview): Promise<void>;
}

export class MemoryContinuityRepository implements ContinuityRepository {
  private reviews = new Map<string, ContinuityReview>();

  async get(movieId: string) {
    return this.reviews.get(movieId) ?? null;
  }

  async save(review: ContinuityReview) {
    this.reviews.set(review.movieId, review);
  }
}

export const continuityRepository: ContinuityRepository =
  new MemoryContinuityRepository();

export async function getContinuityReview(
  repository: Pick<ContinuityRepository, "get">,
  movieId: string,
): Promise<ContinuityReview> {
  findConcept(movieId);
  const review = await repository.get(movieId);
  if (!review)
    throw new ContinuityNotFoundError(
      "No continuity analysis has been run for this movie.",
    );
  return review;
}

export async function runContinuityAnalysis(
  movieId: string,
  creatorReviewRepository: Pick<CreatorReviewRepository, "get">,
  sceneRepository: Pick<SceneRepository, "get">,
  continuityRepo: Pick<ContinuityRepository, "get" | "save">,
  model: ContinuityModel,
): Promise<ContinuityReview> {
  const concept = findConcept(movieId);
  const review = await requireApprovedReview(creatorReviewRepository, movieId);
  const scene = await getOpeningScene(sceneRepository, movieId);

  const existing = await continuityRepo.get(movieId);
  if (existing)
    throw new ContinuityAlreadyExistsError(
      "Continuity analysis has already been run for this movie.",
    );

  const text = await model.analyze(buildContinuityPrompt(concept, review, scene));
  if (!text) throw new ContinuityModelError("Gemini returned no content.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ContinuityOutputError("Gemini response was not valid JSON.");
  }

  const result = ContinuityAnalysisSchema.safeParse(parsed);
  if (!result.success)
    throw new ContinuityOutputError("Gemini output failed schema validation.");

  const continuityReview: ContinuityReview = {
    movieId,
    analysis: result.data,
    createdAt: new Date().toISOString(),
  };
  await continuityRepo.save(continuityReview);
  return continuityReview;
}
