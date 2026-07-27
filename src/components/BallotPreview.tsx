import { ballotGroups } from "@/data/demo-data";

export function BallotPreview() {
  return <section className="section ballot-section" id="ballot" aria-labelledby="ballot-title"><div className="section-heading"><p className="eyebrow">Static ballot preview</p><h2 id="ballot-title">A focused choice at every turning point.</h2><p>Preview only. These controls show a future ballot shape and do not submit, store, or count votes.</p></div><div className="ballot-board">{ballotGroups.map(([label, first, second]) => <fieldset key={label}><legend>{label}</legend><label><input type="radio" name={label} defaultChecked readOnly /> <span>{first}</span></label><label><input type="radio" name={label} readOnly /> <span>{second}</span></label></fieldset>)}<button className="button" type="button">Preview ballot only</button></div></section>;
}
