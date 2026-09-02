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

/**
 * Below this many trusted submissions, Gemini is not called at all - a
 * handful of votes can look like a strong preference by chance, and asking
 * a model to interpret near-zero signal invites false confidence. This is
 * a deliberately simple, easy-to-change constant for this prototype's
 * scale (not a statistical threshold, sample-size test, or confidence
 * calculation) - raise or lower it here as the audience grows.
 */
export const MIN_AUDIENCE_SUBMISSIONS = 5;

/**
 * Two leading options within a question are treated as a "close decision"
 * when their trusted percentages differ by this many points or fewer (0
 * covers an exact tie). Deliberately simple - a fixed margin, not a
 * confidence interval - appropriate for this prototype's scale.
 */
export const CLOSE_DECISION_MARGIN_POINTS = 5;

function findConcept(movieId: string): MovieConcept {
  const concept = movieConcepts.find((c) => c.id === movieId);
  if (!concept) throw new AnalysisValidationError("Unknown movie ID.");
  return concept;
}

/**
 * Deterministically flags questions whose top two options are tied or
 * nearly tied, purely from trusted percentages - no Gemini involved. Used
 * both to enrich the trusted input sent to Gemini (so it is told where the
 * audience is split, rather than inventing certainty) and to surface
 * closeness directly in the deterministic low-signal result.
 */
export function detectCloseDecisions(
  concept: MovieConcept,
  aggregate: VoteAggregate,
): string[] {
  const close: string[] = [];
  for (const q of concept.ballotQuestions) {
    const ranked = q.options
      .map((o) => ({ label: o.label, percentage: aggregate.percentages[o.id] ?? 0 }))
      .sort((a, b) => b.percentage - a.percentage);
    const [first, second] = ranked;
    if (!first || !second) continue;
    if (first.percentage === 0 && second.percentage === 0) continue;
    const margin = first.percentage - second.percentage;
    if (margin > CLOSE_DECISION_MARGIN_POINTS) continue;
    close.push(
      margin === 0
        ? `${q.prompt}: exact tie between "${first.label}" and "${second.label}" (${first.percentage}% each).`
        : `${q.prompt}: "${first.label}" and "${second.label}" are close (${first.percentage}% vs ${second.percentage}%).`,
    );
  }
  return close;
}

/**
 * The exact payload sent to Gemini: fictional movie/question metadata plus
 * server-derived trusted counts and percentages, and deterministically
 * detected close decisions. This never includes session IDs, session
 * hashes, or raw submission documents.
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
    detectedCloseDecisions: detectCloseDecisions(concept, aggregate),
  };
}

function buildPrompt(concept: MovieConcept, aggregate: VoteAggregate) {
  const input = buildAudienceAnalystInput(concept, aggregate);
  return [
    "You are the Audience Analyst for a fictional interactive movie lab.",
    "Interpret only the trusted aggregate data below. Never invent votes, never decide ballot validity, and keep all output clearly about this fictional prototype.",
    "The input includes a detectedCloseDecisions list, computed deterministically before you were called. Do not invent certainty where the audience is split: reflect any listed close decisions honestly in your closeDecisions field, and avoid overstating confidence about those questions elsewhere in your response.",
    "Respond with the requested JSON structure only.",
    JSON.stringify(input),
  ].join("\n\n");
}

/**
 * Deterministic, non-Gemini result used when there is no or too little
 * trusted signal (see MIN_AUDIENCE_SUBMISSIONS). Always valid against
 * AudienceAnalysisSchema. Every string explicitly says "deterministic" and
 * never claims to be Gemini-generated, so it is unambiguous in the data
 * itself - not just in code - that no model call produced it.
 */
export function buildDeterministicAnalysis(
  concept: MovieConcept,
  aggregate: VoteAggregate,
): AudienceAnalysis {
  if (aggregate.totalSubmissions === 0) {
    return {
      dominantPreferences: [
        `No trusted votes yet for "${concept.title}" - no dominant preference can be determined.`,
      ],
      closeDecisions: [],
      audienceTensions: [],
      narrativeRisks: [
        "Deterministic no-data result: recommending a direction now would be invented, not audience-derived.",
      ],
      recommendedDirection:
        "Wait for audience participation before committing to a direction. This is a deterministic placeholder, not a Gemini-generated recommendation.",
    };
  }

  const submissionWord =
    aggregate.totalSubmissions === 1 ? "submission" : "submissions";
  const dominantPreferences = concept.ballotQuestions.map((q) => {
    const top = q.options
      .map((o) => ({ label: o.label, percentage: aggregate.percentages[o.id] ?? 0 }))
      .sort((a, b) => b.percentage - a.percentage)[0];
    return `${q.prompt}: leaning toward "${top.label}" (${top.percentage}%), based on only ${aggregate.totalSubmissions} trusted ${submissionWord}.`;
  });

  return {
    dominantPreferences: dominantPreferences.slice(0, 6),
    closeDecisions: detectCloseDecisions(concept, aggregate),
    audienceTensions: [],
    narrativeRisks: [
      `Only ${aggregate.totalSubmissions} trusted ${submissionWord} so far - below the ${MIN_AUDIENCE_SUBMISSIONS}-submission threshold for a Gemini-interpreted analysis. Deterministic result: early leaders could easily change.`,
    ],
    recommendedDirection:
      "Wait for more audience participation before treating this as a stable direction. This is a deterministic low-signal summary, not a Gemini-generated recommendation.",
  };
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

  // Below the minimum signal threshold (including zero), skip Gemini
  // entirely and return a deterministic result. See MIN_AUDIENCE_SUBMISSIONS.
  if (aggregate.totalSubmissions < MIN_AUDIENCE_SUBMISSIONS)
    return buildDeterministicAnalysis(concept, aggregate);

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
