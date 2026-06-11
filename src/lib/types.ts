export type DeckClass =
  | "죽음의 기사"
  | "악마사냥꾼"
  | "드루이드"
  | "사냥꾼"
  | "마법사"
  | "성기사"
  | "사제"
  | "도적"
  | "주술사"
  | "흑마법사"
  | "전사";

export type EvidenceStatus = "운영진 확인" | "출처 연결" | "작성자 입력";
export type PatchStatus = "현재 패치" | "이전 패치";
export type Difficulty = "쉬움" | "보통" | "어려움";

export type DeckCardItem = {
  cost: number;
  name: string;
  quantity: number;
  legendary?: boolean;
};

export type Deck = {
  slug: string;
  title: string;
  className: DeckClass;
  archetype: string;
  strategy: string;
  author: string;
  authorRole: string;
  patch: string;
  patchStatus: PatchStatus;
  evidence: EvidenceStatus;
  sourceType: string;
  sourceLabel: string;
  sourceUrl?: string;
  rank?: string;
  record?: string;
  difficulty: Difficulty;
  tags: string[];
  summary: string;
  recommendedFor: string;
  strengths: string[];
  weaknesses: string[];
  gamePlan: string[];
  mulligan: { core: string[]; situational: string[] };
  cardChoices: string[];
  matchupNotes: string[];
  cards: DeckCardItem[];
  deckCode: string;
  recommendations: number;
  favorites?: number;
  comments: number;
  copies: number;
  recentCopies?: number;
  updatedAt: string;
  trendScore?: number;
  trackingSourceCount?: number;
  lastTrackedAt?: string;
  featuredReason?: string;
};
