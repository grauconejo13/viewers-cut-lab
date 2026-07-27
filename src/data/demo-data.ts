/** Fictional demo content only. It does not represent real films, votes, or demand. */
export type MovieConcept = {
  title: string;
  genre: string;
  logline: string;
  tones: string[];
  status: string;
  demoBallots: string;
  posterClass: string;
  posterMark: string;
};

export const movieConcepts: MovieConcept[] = [
  { title: "The Luminous Archive", genre: "Mystery / Science Fiction", logline: "A night archivist finds a city map that redraws itself around forgotten memories.", tones: ["Atmospheric", "Tender", "Uncanny"], status: "Round open · Fictional demo", demoBallots: "1,248 fictional ballots", posterClass: "archive", posterMark: "LA" },
  { title: "Low Tide, High Wire", genre: "Coastal Thriller", logline: "Two estranged siblings trace a missing ferry across a storm-struck island chain.", tones: ["Tense", "Human", "Salt-worn"], status: "Round open · Fictional demo", demoBallots: "876 fictional ballots", posterClass: "tide", posterMark: "TH" },
  { title: "After the Ovation", genre: "Drama / Magical Realism", logline: "A retiring stagehand learns each final curtain can alter one choice from the past.", tones: ["Intimate", "Hopeful", "Theatrical"], status: "Voting preview · Fictional demo", demoBallots: "642 fictional ballots", posterClass: "ovation", posterMark: "AO" },
];

export const ballotGroups = [
  ["Lead character", "A guarded mapmaker", "A relentless archivist"],
  ["Setting", "A city after midnight", "An island ferry terminal"],
  ["Central conflict", "Protect the truth", "Expose the disappearance"],
  ["Relationship direction", "Former friends reunite", "Siblings learn to trust"],
  ["Ending style", "Bittersweet revelation", "Earned hopeful turn"],
];

export const resultOptions = [
  ["The city after midnight", 58],
  ["A vanished coastal station", 27],
  ["A theater between seasons", 15],
] as const;
