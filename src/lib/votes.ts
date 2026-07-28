import { movieConcepts, type BallotAnswer } from "@/data/demo-data";

export type VoteAggregate = { movieId: string; totalSubmissions: number; counts: Record<string, number>; percentages: Record<string, number> };
type VoteSubmission = { movieId: string; sessionId: string; answers: BallotAnswer };
type Store = { submissions: VoteSubmission[] };
const globalStore = globalThis as typeof globalThis & { viewersCutVoteStore?: Store };
const store = globalStore.viewersCutVoteStore ?? (globalStore.viewersCutVoteStore = { submissions: [] });

export class VoteValidationError extends Error {}

const optionIds = (movieId: string) => movieConcepts.find((concept) => concept.id === movieId)?.ballotQuestions.flatMap((question) => question.options.map((option) => option.id)) ?? [];
export const roundPercentage = (value: number) => Math.round(value * 10) / 10;
export function aggregateVotes(movieId: string, submissions = store.submissions): VoteAggregate {
  const counts = Object.fromEntries(optionIds(movieId).map((id) => [id, 0]));
  const matching = submissions.filter((submission) => submission.movieId === movieId);
  matching.forEach((submission) => Object.values(submission.answers).forEach(([optionId]) => { counts[optionId] += 1; }));
  const totalSubmissions = matching.length;
  const percentages = Object.fromEntries(Object.entries(counts).map(([optionId, count]) => [optionId, totalSubmissions ? roundPercentage((count / totalSubmissions) * 100) : 0]));
  return { movieId, totalSubmissions, counts, percentages };
}
export function submitVote(movieId: unknown, answers: unknown, sessionId: unknown) {
  if (typeof movieId !== "string" || typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(sessionId) || !answers || typeof answers !== "object" || Array.isArray(answers)) throw new VoteValidationError("Invalid submission.");
  const concept = movieConcepts.find((item) => item.id === movieId);
  if (!concept) throw new VoteValidationError("Unknown movie ID.");
  const received = answers as BallotAnswer;
  const expectedIds = new Set(concept.ballotQuestions.map((question) => question.id));
  if (Object.keys(received).length !== expectedIds.size || Object.keys(received).some((id) => !expectedIds.has(id))) throw new VoteValidationError("Complete answers are required.");
  for (const question of concept.ballotQuestions) { const selected = received[question.id]; if (!Array.isArray(selected) || selected.length !== 1 || typeof selected[0] !== "string" || !question.options.some((option) => option.id === selected[0])) throw new VoteValidationError("Invalid option ID."); }
  if (store.submissions.some((item) => item.movieId === movieId && item.sessionId === sessionId)) return { status: "duplicate" as const, aggregate: aggregateVotes(movieId) };
  store.submissions.push({ movieId, sessionId, answers: structuredClone(received) });
  return { status: "submitted" as const, aggregate: aggregateVotes(movieId) };
}
export function resetVoteStoreForTests() { store.submissions.length = 0; }
