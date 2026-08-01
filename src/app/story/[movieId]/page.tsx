import { BallotFlow } from "@/components/BallotFlow";
import { movieConcepts } from "@/data/demo-data";
import Link from "next/link";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ movieId: string }>;
}) {
  const { movieId } = await params;
  const concept = movieConcepts.find((item) => item.id === movieId);
  if (!concept)
    return (
      <main className="not-found-story">
        <p className="eyebrow">Story not found</p>
        <h1>That film world is not available.</h1>
        <p>The requested fictional story does not exist in this prototype.</p>
        <Link className="button" href="/">
          Back to Film Worlds
        </Link>
      </main>
    );
  return <BallotFlow concept={concept} />;
}
