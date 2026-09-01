"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BallotAnswer, MovieConcept } from "@/data/demo-data";
import { initialAnswers, missingRequired, replaceAnswer } from "@/lib/ballot";
import type { VoteAggregate } from "@/lib/votes";
const steps = ["Story decisions", "Review Your Cut", "Your Cut Is Complete"];
export function BallotFlow({ concept }: { concept: MovieConcept }) {
  const router = useRouter();
  const [step, setStep] = useState(0),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<BallotAnswer>(initialAnswers),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [status, setStatus] = useState<"idle" | "pending" | "duplicate" | "failed">(
      "idle",
    ),
    [aggregate, setAggregate] = useState<VoteAggregate | null>(null),
    [exit, setExit] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    wasDialog = useRef(false);
  const question = concept.ballotQuestions[index];
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step, index]);
  useEffect(() => {
    if (exit) dialog.current?.focus();
    else if (wasDialog.current) trigger.current?.focus({ preventScroll: true });
    wasDialog.current = exit;
  }, [exit]);
  const invalid = (id: string) => {
    const el = document.getElementById(id);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  };
  const next = () => {
    if (!answers[question.id]?.length) {
      setError(question.id);
      invalid(question.id);
      return;
    }
    if (index < concept.ballotQuestions.length - 1) {
      setNote("The story follows your direction.");
      setIndex((i) => i + 1);
    } else {
      const missing = missingRequired(concept, answers);
      if (missing.length) {
        setError(missing[0]);
        invalid(missing[0]);
      } else setStep(1);
    }
  };
  const submit = async () => {
    setStatus("pending");
    try {
      const key = "viewers-cut-anonymous-session";
      const sessionId =
        localStorage.getItem(key) ??
        `session-${crypto.randomUUID().replaceAll("-", "")}`;
      localStorage.setItem(key, sessionId);
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ movieId: concept.id, answers, sessionId }),
      });
      const data = (await response.json()) as {
        status?: "submitted" | "duplicate";
        aggregate?: VoteAggregate;
      };
      if (response.status === 200 || response.status === 409) {
        setAggregate(data.aggregate ?? null);
        setStatus(data.status === "duplicate" ? "duplicate" : "idle");
        setStep(2);
      } else setStatus("failed");
    } catch {
      setStatus("failed");
    }
  };
  const leave = () => {
    setAnswers(initialAnswers());
    router.push("/");
  };
  return (
    <div className="story-shell">
      <header className="story-header">
        <Link className="wordmark" href="/">
          VIEWERS <span>CUT</span>
        </Link>
        <p>{concept.title}</p>
        <ol className="story-progress">
          {steps.map((s, i) => (
            <li
              key={s}
              className={i === step ? "active" : i < step ? "done" : ""}
            >
              <span>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <button
          ref={trigger}
          className="header-how"
          onClick={() =>
            Object.keys(answers).length ? setExit(true) : leave()
          }
        >
          Exit Story
        </button>
      </header>
      <main className="story-main">
        <section className="story-context">
          <p className="eyebrow">{concept.genre} - Fictional demo</p>
          <h1>{concept.title}</h1>
          <p>{concept.synopsis}</p>
        </section>
        <section className="story-panel">
          <h2 ref={heading} tabIndex={-1}>
            {steps[step]}
          </h2>
          <p aria-live="polite" className="story-announcement">
            Local prototype submissions are counted separately from fictional
            demo results.
          </p>
          {step === 0 && (
            <>
              <p className="scene-setup">{concept.sceneSetups[index]}</p>
              <fieldset id={question.id} tabIndex={-1}>
                <legend>{question.prompt}</legend>
                {question.options.map((o) => (
                  <label className="option-card" key={o.id}>
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id]?.[0] === o.id}
                      onChange={() => {
                        setAnswers((a) => replaceAnswer(a, question.id, o.id));
                        setError("");
                        setNote(
                          `You chose ${o.label}. That decision changes the next scene.`,
                        );
                      }}
                    />
                    <span>{o.label}</span>
                    <small>{o.description}</small>
                  </label>
                ))}
                {error === question.id && (
                  <p className="error" role="alert">
                    Choose what happens next before continuing.
                  </p>
                )}
              </fieldset>
              <p className="acknowledgment" aria-live="polite">
                {note}
              </p>
              <nav className="story-navigation">
                {index > 0 ? (
                  <button
                    className="button button-quiet"
                    onClick={() => setIndex((i) => i - 1)}
                  >
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button className="button" onClick={next}>
                  {index === concept.ballotQuestions.length - 1
                    ? "Review Your Cut"
                    : "Continue"}
                </button>
              </nav>
            </>
          )}
          {step === 1 && (
            <div className="review">
              <h3>Review Your Cut</h3>
              {concept.ballotQuestions.map((q, i) => (
                <div key={q.id}>
                  <span>Scene {i + 1}</span>
                  <strong>
                    {q.options.find((o) => o.id === answers[q.id]?.[0])?.label}
                  </strong>
                  <button
                    onClick={() => {
                      setIndex(i);
                      setStep(0);
                    }}
                  >
                    Edit
                  </button>
                </div>
              ))}
              {status === "failed" && (
                <p className="error" role="alert">
                  Your cut could not be submitted. Review your choices and try
                  again.
                </p>
              )}
              <nav className="story-navigation">
                <button
                  className="button button-quiet"
                  onClick={() => setStep(0)}
                >
                  Back
                </button>
                <button
                  className="button"
                  disabled={status === "pending"}
                  onClick={submit}
                >
                  {status === "pending" ? "Completing..." : "Complete My Cut"}
                </button>
              </nav>
            </div>
          )}
          {step === 2 && (
            <div className="confirmation">
              <h3>
                {status === "duplicate"
                  ? "Your cut was already complete."
                  : "Your cut is complete."}
              </h3>
              <p>
                {status === "duplicate"
                  ? "This anonymous session already submitted a cut for this film."
                  : "Your local prototype submission was counted once."}
              </p>
              {aggregate && (
                <div className="prototype-results">
                  <p>
                    REAL PROTOTYPE RESULTS - separate from fictional demo counts
                  </p>
                  <strong>
                    {aggregate.totalSubmissions} trusted local submission
                    {aggregate.totalSubmissions === 1 ? "" : "s"}
                  </strong>
                </div>
              )}
              <nav className="story-navigation">
                <button
                  className="button button-quiet"
                  onClick={() => setStep(1)}
                >
                  Review My Choices
                </button>
                <button
                  className="button button-quiet"
                  onClick={() => router.push("/#discover")}
                >
                  Back to Film Worlds
                </button>
                <button className="button" onClick={() => router.push("/")}>
                  Return Home
                </button>
              </nav>
            </div>
          )}
        </section>
      </main>
      {exit && (
        <div className="modal-backdrop">
          <div
            ref={dialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className="reset-dialog"
            onKeyDown={(e) => {
              if (e.key === "Escape") setExit(false);
            }}
          >
            <h2>Exit story?</h2>
            <p>
              Exiting will clear your current local story choices. They are not
              saved or submitted.
            </p>
            <nav className="story-navigation">
              <button
                className="button button-quiet"
                onClick={() => setExit(false)}
              >
                Cancel
              </button>
              <button className="button button-danger" onClick={leave}>
                Exit and Clear Choices
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
