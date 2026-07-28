import type { MovieConcept } from "@/data/demo-data";

export function MovieConceptCard({ concept, onEnter }: { concept: MovieConcept; onEnter: (concept: MovieConcept) => void }) {
  return <article className="concept-card"><div className={`poster poster-${concept.posterClass}`} role="img" aria-label={`Decorative fictional poster treatment for ${concept.title}`}><span>{concept.posterMark}</span><small>FICTIONAL FILM LAB</small></div><div className="concept-copy"><p className="eyebrow">{concept.genre}</p><h3>{concept.title}</h3><p>{concept.logline}</p><div className="tags">{concept.tones.map((tone) => <span key={tone}>{tone}</span>)}</div><div className="card-meta"><span>{concept.status}</span><span>{concept.demoBallots}</span></div><a className="text-link" href="#ballot" aria-label={`Enter the fictional story world of ${concept.title}`} onClick={(event) => { event.preventDefault(); onEnter(concept); }}>{concept.storyCta} <span aria-hidden="true">&rarr;</span></a></div></article>;
}
