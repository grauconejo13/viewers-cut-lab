import { createHash } from "node:crypto";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { movieConcepts, type BallotAnswer } from "@/data/demo-data";
export type VoteAggregate = {
  movieId: string;
  totalSubmissions: number;
  counts: Record<string, number>;
  percentages: Record<string, number>;
};
export class VoteValidationError extends Error {}
export class VoteStoreError extends Error {}
const ids = (movieId: string) =>
  movieConcepts
    .find((c) => c.id === movieId)
    ?.ballotQuestions.flatMap((q) => q.options.map((o) => o.id)) ?? [];
export const roundPercentage = (n: number) => Math.round(n * 10) / 10;
export const hashSession = (session: string, secret: string, movieId: string) =>
  createHash("sha256").update(`${secret}:${movieId}:${session}`).digest("hex");
export function validateVote(
  movieId: unknown,
  answers: unknown,
  sessionId: unknown,
) {
  if (
    typeof movieId !== "string" ||
    typeof sessionId !== "string" ||
    !/^[a-zA-Z0-9_-]{16,128}$/.test(sessionId) ||
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers)
  )
    throw new VoteValidationError("Invalid submission.");
  const concept = movieConcepts.find((c) => c.id === movieId);
  if (!concept) throw new VoteValidationError("Unknown movie ID.");
  const a = answers as BallotAnswer;
  if (Object.keys(a).length !== concept.ballotQuestions.length)
    throw new VoteValidationError("Complete answers are required.");
  for (const q of concept.ballotQuestions) {
    if (
      !Array.isArray(a[q.id]) ||
      a[q.id].length !== 1 ||
      !q.options.some((o) => o.id === a[q.id][0])
    )
      throw new VoteValidationError("Invalid option ID.");
  }
  return { movieId, answers: a, sessionId };
}
export interface VoteRepository {
  submit(
    movieId: string,
    answers: BallotAnswer,
    sessionHash: string,
  ): Promise<{ status: "submitted" | "duplicate"; aggregate: VoteAggregate }>;
  getAggregate(movieId: string): Promise<VoteAggregate>;
}
const aggregate = (
  movieId: string,
  total: number,
  counts: Record<string, number>,
): VoteAggregate => ({
  movieId,
  totalSubmissions: total,
  counts,
  percentages: Object.fromEntries(
    Object.entries(counts).map(([id, n]) => [
      id,
      total ? roundPercentage((n / total) * 100) : 0,
    ]),
  ),
});
export class MemoryVoteRepository implements VoteRepository {
  items: { movieId: string; hash: string; answers: BallotAnswer }[] = [];
  async submit(movieId: string, answers: BallotAnswer, sessionHash: string) {
    if (this.items.some((i) => i.movieId === movieId && i.hash === sessionHash))
      return { status: "duplicate" as const, aggregate: this.get(movieId) };
    this.items.push({
      movieId,
      hash: sessionHash,
      answers: structuredClone(answers),
    });
    return { status: "submitted" as const, aggregate: this.get(movieId) };
  }
  get(movieId: string) {
    const counts = Object.fromEntries(ids(movieId).map((id) => [id, 0]));
    const matching = this.items.filter((i) => i.movieId === movieId);
    matching.forEach((i) =>
      Object.values(i.answers).forEach(([id]) => counts[id]++),
    );
    return aggregate(movieId, matching.length, counts);
  }
  async getAggregate(movieId: string) {
    return this.get(movieId);
  }
}
export class FirestoreVoteRepository implements VoteRepository {
  constructor(private db: Firestore) {}
  async submit(movieId: string, answers: BallotAnswer, sessionHash: string) {
    const vote = this.db.doc(
        `prototypeVotes/${movieId}/submissions/${sessionHash}`,
      ),
      summary = this.db.doc(`prototypeVotes/${movieId}`);
    return this.db.runTransaction(async (tx) => {
      if ((await tx.get(vote)).exists) {
        const data = (await tx.get(summary)).data() ?? {};
        return {
          status: "duplicate" as const,
          aggregate: aggregate(
            movieId,
            data.totalSubmissions ?? 0,
            data.counts ??
              Object.fromEntries(ids(movieId).map((id) => [id, 0])),
          ),
        };
      }
      const current = (await tx.get(summary)).data() ?? {
        totalSubmissions: 0,
        counts: Object.fromEntries(ids(movieId).map((id) => [id, 0])),
      };
      const counts = { ...current.counts } as Record<string, number>;
      Object.values(answers).forEach(
        ([id]) => (counts[id] = (counts[id] ?? 0) + 1),
      );
      tx.set(vote, {
        movieId,
        sessionHash,
        optionIds: Object.values(answers).map(([id]) => id),
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(summary, {
        movieId,
        totalSubmissions: (current.totalSubmissions ?? 0) + 1,
        counts,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        status: "submitted" as const,
        aggregate: aggregate(
          movieId,
          (current.totalSubmissions ?? 0) + 1,
          counts,
        ),
      };
    });
  }
  async getAggregate(movieId: string) {
    const summary = this.db.doc(`prototypeVotes/${movieId}`);
    const data = (await summary.get()).data() ?? {};
    return aggregate(
      movieId,
      data.totalSubmissions ?? 0,
      data.counts ?? Object.fromEntries(ids(movieId).map((id) => [id, 0])),
    );
  }
}
export function firestoreRepositoryFromEnv() {
  const projectId = process.env.FIRESTORE_PROJECT_ID,
    secret = process.env.VOTE_SESSION_HASH_SECRET;
  if (!projectId || !secret)
    throw new VoteStoreError("Firestore is not configured.");
  const db = new Firestore({
    projectId,
    host: process.env.FIRESTORE_EMULATOR_HOST,
    ssl: !process.env.FIRESTORE_EMULATOR_HOST,
  });
  return { repository: new FirestoreVoteRepository(db), secret };
}
