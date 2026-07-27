const links = ["Discover", "Build a Movie", "Results", "Creator Studio"];

export function SiteHeader() {
  return <header className="site-header"><a className="wordmark" href="#top" aria-label="Viewers Cut home">VIEWERS <span>CUT</span></a><nav aria-label="Primary navigation">{links.map((link) => <a href={`#${link.toLowerCase().replaceAll(" ", "-")}`} key={link}>{link}</a>)}</nav><a className="button button-small" href="#ballot">Start Voting</a></header>;
}
