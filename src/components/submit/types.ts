export type GuideValues = {
  title: string;
  summary: string;
  recommendedFor: string;
  difficulty: "easy" | "medium" | "hard";
  gamePlan: string;
  mulliganGuide: string;
  cardChoices: string;
  matchupNotes: string;
};

export type EvidenceValues = {
  sourceType:
    | "community"
    | "ranked"
    | "creator"
    | "tournament"
    | "external_stats";
  sourceUrl: string;
  sourceName: string;
  claimedRank: string;
  wins: number | null;
  losses: number | null;
  playedFrom: string;
  playedTo: string;
  evidenceNote: string;
};
