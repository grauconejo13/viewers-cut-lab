import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { movieConcepts, type MovieConcept } from "@/data/demo-data";
import type { VoteAggregate, VoteRepository } from "@/lib/votes";

export class AnalysisValidationError extends Error {}
export class AnalysisConfigError extends Error {}
export class AnalysisModelError extends Error {}
export class AnalysisOutputError extends Error {}

/**
 * Strict Audience Analyst result schema. Gemini's structured output must
 * match this exactly before it can be returned or stored - unknown or
 * missing fields fail validation rather than being silently accepted.
 */
export const AudienceAnalysisSchema = z
  .object({
    dominantPreferences: z.array(z.string().min(1).max(240)).min(1).max(6),
    closeDecisions: z.array(z.string().min(1).max(240)).max(6),
    audienceTensions: z.array(z.string().min(1).max(240)).max(6),
    narrativeRisks: z.array(z.string().min(1).max(240)).max(6),
    recommendedDirection: z.string().min(1).max(800),
  })
  .strict();
export type AudienceAnalysis = z.infer<typeof AudienceAnalysisSchema>;

// Standard JSON Schema, per the Interactions API's `response_format.schema`
// contract (plain JSON Schema, not the legacy generateContent Type enum).
const geminiResponseSchema = {
  type: "object",
  properties: {
    dominantPreferences: { type: "array", items: { type: "string" } },
    closeDecisions: { type: "array", items: { type: "string" } },
    audienceTensions: { type: "array", items: { type: "string" } },
    narrativeRisks: { type: "array", items: { type: "string" } },
    recommendedDirection: { type: "string" },
  },
  required: [
    "dominantPreferences",
    "closeDecisions",
    "audienceTensions",
    "narrativeRisks",
    "recommendedDirection",
  ],
} as const;

const MODEL = "gemini-3.6-flash";

function findConcept(movieId: string): MovieConcept {
  const concept = movieConcepts.find((c) => c.id === movieId);
  if (!concept) throw new AnalysisValidationError("Unknown movie ID.");
  return concept;
}

/**
 * The exact payload sent to Gemini: fictional movie/question metadata plus
 * server-derived trusted counts and percentages. This never includes
 * session IDs, session hashes, or raw submission documents.
 */
export function buildAudienceAnalystInput(
  concept: MovieConcept,
  aggregate: VoteAggregate,
) {
  return {
    movie: {
      title: concept.title,
      genre: concept.genre,
      synopsis: concept.synopsis,
      tones: concept.tones,
    },
    totalTrustedSubmissions: aggregate.totalSubmissions,
    questions: concept.ballotQuestions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        count: aggregate.counts[o.id] ?? 0,
        percentage: aggregate.percentages[o.id] ?? 0,
      })),
    })),
  };
}

function buildPrompt(concept: MovieConcept, aggregate: VoteAggregate) {
  const input = buildAudienceAnalystInput(concept, aggregate);
  return [
    "You are the Audience Analyst for a fictional interactive movie lab.",
    "Interpret only the trusted aggregate data below. Never invent votes, never decide ballot validity, and keep all output clearly about this fictional prototype.",
    "Respond with the requested JSON structure only.",
    JSON.stringify(input),
  ].join("\n\n");
}

/** Minimal model surface the analyst depends on, so tests can mock it. */
export interface AudienceAnalystModel {
  generate(prompt: string): Promise<string>;
}

export function geminiModelFromEnv(): AudienceAnalystModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AnalysisConfigError("Gemini is not configured.");
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
            schema: geminiResponseSchema,
          },
        });
        return response.output_text ?? "";
      } catch (error) {
        throw new AnalysisModelError(
          error instanceof Error ? error.message : "Gemini request failed.",
        );
      }
    },
  };
}

export async function analyzeAudience(
  movieId: string,
  repository: Pick<VoteRepository, "getAggregate">,
  model: AudienceAnalystModel,
): Promise<AudienceAnalysis> {
  const concept = findConcept(movieId);
  const aggregate = await repository.getAggregate(movieId);
  const text = await model.generate(buildPrompt(concept, aggregate));
  if (!text) throw new AnalysisModelError("Gemini returned no content.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AnalysisOutputError("Gemini response was not valid JSON.");
  }
  const result = AudienceAnalysisSchema.safeParse(parsed);
  if (!result.success)
    throw new AnalysisOutputError("Gemini output failed schema validation.");
  return result.data;
}
