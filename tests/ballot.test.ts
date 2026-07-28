import assert from "node:assert/strict";
import test from "node:test";
import { movieConcepts } from "../src/data/demo-data";
import { createDemoBallot, initialAnswers, missingRequired, replaceAnswer } from "../src/lib/ballot";

const concept = movieConcepts[0];
test("required-question completeness", () => { assert.equal(missingRequired(concept, initialAnswers()).length, concept.ballotQuestions.length); });
test("single-choice answer replacement", () => { const a=replaceAnswer(initialAnswers(),"lead","mapmaker"); assert.deepEqual(replaceAnswer(a,"lead","archivist").lead,["archivist"]); });
test("demo ballot creation", () => { const ballot=createDemoBallot(concept.id,{},new Date("2026-01-01T00:00:00.000Z")); assert.equal(ballot.mode,"fictional-demo"); assert.equal(ballot.submittedAt,"2026-01-01T00:00:00.000Z"); });
test("initial state is resettable", () => { const a=initialAnswers(); a.lead=["mapmaker"]; assert.deepEqual(initialAnswers(),{}); });
