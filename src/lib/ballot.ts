import type { BallotAnswer, DemoBallot, MovieConcept } from "@/data/demo-data";
export const initialAnswers = (): BallotAnswer => ({});
export const replaceAnswer = (
  answers: BallotAnswer,
  id: string,
  option: string,
): BallotAnswer => ({ ...answers, [id]: [option] });
export const missingRequired = (concept: MovieConcept, answers: BallotAnswer) =>
  concept.ballotQuestions
    .filter((q) => q.required && !answers[q.id]?.length)
    .map((q) => q.id);
export const createDemoBallot = (
  conceptId: string,
  answers: BallotAnswer,
  now = new Date(),
): DemoBallot => ({
  id: `demo-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
  conceptId,
  answers,
  submittedAt: now.toISOString(),
  mode: "fictional-demo",
});
