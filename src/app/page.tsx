"use client";

import { useRef, useState } from "react";
import { BallotFlow } from "@/components/BallotFlow";
import { ContinuityIssueCard } from "@/components/ContinuityIssueCard";
import { CreatorApprovalPreview } from "@/components/CreatorApprovalPreview";
import { MovieConceptCard } from "@/components/MovieConceptCard";
import { ResultsPreview } from "@/components/ResultsPreview";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { movieConcepts, type MovieConcept } from "@/data/demo-data";

export default function Home() {
  const [selectedConcept, setSelectedConcept] = useState<MovieConcept | null>(null);
  const filmWorldHeading = useRef<HTMLHeadingElement>(null);
  const returnToFilmWorlds = () => { setSelectedConcept(null); window.requestAnimationFrame(() => { filmWorldHeading.current?.focus({ preventScroll: true }); document.getElementById("discover")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }); };
  return <div id="top" className="site-shell"><SiteHeader /><main><section className="hero"><p className="eyebrow">An interactive story prototype</p><h1>This movie hasn&apos;t been written yet.</h1><p className="hero-copy">Step into an unfinished story, choose what happens next, and help shape the version that gets written.</p><div className="hero-actions"><a className="button" href="#discover">Enter the Story</a><a className="button button-quiet" href="#how-it-works">See How It Works</a></div><p className="demo-disclaimer">All current films, choices, counts, and results are fictional demonstration content.</p></section><section className="section immediate-steps" aria-labelledby="steps-title"><p className="eyebrow">How you shape the story</p><h2 id="steps-title">Enter. Choose. See the cut take shape.</h2><ol><li><span>01</span>Enter a film world</li><li><span>02</span>Make story decisions</li><li><span>03</span>See how the audience is shaping the cut</li></ol></section><section className="section concepts" id="discover" aria-labelledby="film-worlds-title"><div className="section-heading"><p className="eyebrow">Choose a fictional film world</p><h2 id="film-worlds-title" tabIndex={-1} ref={filmWorldHeading}>Choose a fictional film world</h2><p>Three unfinished stories await. Choose one to begin directing its next scenes.</p></div><div className="concept-grid">{movieConcepts.map((concept) => <MovieConceptCard concept={concept} key={concept.id} onEnter={setSelectedConcept} />)}</div></section>{selectedConcept && <BallotFlow concept={selectedConcept} onChangeFilmWorld={returnToFilmWorlds} />}<ResultsPreview /><WorkflowSteps /><CreatorApprovalPreview /><section className="section continuity"><div className="section-heading"><p className="eyebrow">Behind the scenes</p><h2>Keep every story detail in focus.</h2></div><div className="issue-grid"><ContinuityIssueCard severity="Needs review" title="Prop contradiction" text="Fictional example: a brass key returns after it was already surrendered." /><ContinuityIssueCard severity="Question" title="Character knowledge gap" text="Fictional example: a clue is recognized before it is introduced." /><ContinuityIssueCard severity="Needs review" title="Timeline inconsistency" text="Fictional example: a scene crosses midnight twice." /></div></section></main><SiteFooter /></div>;
}
