"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const howTrigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const wasHowOpen = useRef(false);

  useEffect(() => {
    if (howOpen) dialog.current?.focus();
    if (!howOpen && wasHowOpen.current) howTrigger.current?.focus({ preventScroll: true });
    wasHowOpen.current = howOpen;
  }, [howOpen]);

  const closeHowItWorks = () => setHowOpen(false);
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { closeHowItWorks(); return; }
    if (event.key !== "Tab") return;
    const focusable = dialog.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const chooseFilmWorld = () => {
    closeHowItWorks();
    window.requestAnimationFrame(() => {
      document.getElementById("discover")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  };
  const openHowItWorks = () => { setMenuOpen(false); setHowOpen(true); };

  return <header className="site-header"><a className="wordmark" href="#top" aria-label="Viewers Cut home">VIEWERS <span>CUT</span></a><nav id="header-menu" className={menuOpen ? "header-nav open" : "header-nav"} aria-label="Primary navigation"><a href="#discover" onClick={() => setMenuOpen(false)}>Film Worlds</a><a href="#ballot" onClick={() => setMenuOpen(false)}>Your Cut</a><a href="#results" onClick={() => setMenuOpen(false)}>Demo Results</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>Behind the Scenes</a><button className="header-how mobile-only" type="button" onClick={openHowItWorks}>How it works</button></nav><div className="header-actions"><button ref={howTrigger} className="header-how desktop-only" type="button" onClick={openHowItWorks}>How it works</button><a className="button button-small" href="#discover">Enter the Story</a><button className="menu-toggle mobile-only" type="button" aria-expanded={menuOpen} aria-controls="header-menu" onClick={() => setMenuOpen((open) => !open)}>Menu</button></div>{howOpen && <div className="how-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeHowItWorks(); }}><div className="how-dialog" role="dialog" aria-modal="true" aria-labelledby="how-title" tabIndex={-1} ref={dialog} onKeyDown={trapFocus}><p className="eyebrow">Viewers Cut</p><h2 id="how-title">How it works</h2><ol><li><strong>Enter a film world</strong><span>Pick one unfinished movie concept.</span></li><li><strong>Direct the story</strong><span>Make meaningful choices about characters, setting, conflict, and outcome.</span></li><li><strong>Shape the final cut</strong><span>Your choices join the audience signal used to build a coherent, creator-approved story.</span></li></ol><div className="how-actions"><button className="button" type="button" onClick={chooseFilmWorld}>Choose a Film World</button><button className="button button-quiet" type="button" onClick={closeHowItWorks}>Close</button></div></div></div>}</header>;
}
