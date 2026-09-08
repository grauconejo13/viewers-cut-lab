import { ContinuityReviewPanel } from "@/components/ContinuityReviewPanel";
import { CreatorReviewPanel } from "@/components/CreatorReviewPanel";
import { movieConcepts } from "@/data/demo-data";

export default async function CreatorReviewPage({
  params,
}: {
  params: Promise<{ movieId: string }>;
}) {
  const { movieId } = await params;
  const concept = movieConcepts.find((item) => item.id === movieId);
  if (!concept)
    return (
      <main className="not-found-story">
        <p className="eyebrow">Creator review</p>
        <h1>That film world is not available.</h1>
        <p>The requested fictional story does not exist in this prototype.</p>
      </main>
    );
  return (
    <>
      <CreatorReviewPanel movieId={concept.id} title={concept.title} />
      <section className="story-shell" aria-label="Continuity review">
        <div className="story-main">
          <ContinuityReviewPanel movieId={concept.id} />
        </div>
      </section>
    </>
  );
}
