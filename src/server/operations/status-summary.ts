export type OperationsSeverity = "ok" | "warning" | "critical";

export type OperationsStatusCard = {
  key: string;
  label: string;
  severity: OperationsSeverity;
  value: string;
  detail: string;
  href?: string;
};

export type OperationsStatusSummary = {
  unavailable: boolean;
  generatedAt: string;
  overall: OperationsSeverity;
  cards: OperationsStatusCard[];
};

export type OperationsStatusInput = {
  generatedAt?: string;
  unavailable?: boolean;
  tracking: {
    recentRuns: number;
    failedRuns: number;
    runningRuns: number;
    staleActiveSources: number;
    activeSources: number;
  };
  moderation: {
    openReports: number;
    reviewingReports: number;
  };
  content: {
    reviewCandidates: number;
    needsValidationCandidates: number;
    staleCandidates: number;
  };
  cards: {
    latestStatus: "running" | "succeeded" | "failed" | "missing";
    latestFinishedAt?: string;
  };
  patch: {
    currentVersion?: string;
    latestTransitionAt?: string;
    requiresCardReview: boolean;
  };
  analytics: {
    events24h: number;
  };
};

export function buildOperationsStatusSummary(
  input: OperationsStatusInput,
): OperationsStatusSummary {
  const cards: OperationsStatusCard[] = [
    trackingCard(input),
    moderationCard(input),
    contentCard(input),
    cardSyncCard(input),
    patchCard(input),
    analyticsCard(input),
  ];

  return {
    unavailable: input.unavailable ?? false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    overall: worst(cards.map((card) => card.severity)),
    cards,
  };
}

function trackingCard(input: OperationsStatusInput): OperationsStatusCard {
  const severity =
    input.tracking.failedRuns > 0 || input.tracking.staleActiveSources > 0
      ? "critical"
      : input.tracking.runningRuns > 0 || input.tracking.recentRuns === 0
        ? "warning"
        : "ok";

  return {
    key: "tracking",
    label: "최근 덱 수집",
    severity,
    value: `${input.tracking.recentRuns}회`,
    detail:
      input.tracking.activeSources === 0
        ? "활성 수집 출처가 없습니다."
        : `24시간 실패 ${input.tracking.failedRuns}회 · 실행 중 ${input.tracking.runningRuns}회 · 지연 출처 ${input.tracking.staleActiveSources}개`,
    href: "/admin/deck-candidates",
  };
}

function moderationCard(input: OperationsStatusInput): OperationsStatusCard {
  const openTotal = input.moderation.openReports + input.moderation.reviewingReports;
  const severity =
    openTotal >= 10 ? "critical" : openTotal > 0 ? "warning" : "ok";

  return {
    key: "moderation",
    label: "신고 처리",
    severity,
    value: `${openTotal}건`,
    detail: `신규 ${input.moderation.openReports}건 · 검토 중 ${input.moderation.reviewingReports}건`,
    href: "/admin/reports",
  };
}

function contentCard(input: OperationsStatusInput): OperationsStatusCard {
  const actionable =
    input.content.reviewCandidates + input.content.needsValidationCandidates;
  const severity =
    input.content.needsValidationCandidates > 0
      ? "warning"
      : actionable > 20
        ? "warning"
        : "ok";

  return {
    key: "content",
    label: "후보 큐",
    severity,
    value: `${actionable}개`,
    detail: `검토 가능 ${input.content.reviewCandidates}개 · 검증 필요 ${input.content.needsValidationCandidates}개 · stale ${input.content.staleCandidates}개`,
    href: "/admin/deck-candidates",
  };
}

function cardSyncCard(input: OperationsStatusInput): OperationsStatusCard {
  const severity =
    input.cards.latestStatus === "failed" || input.cards.latestStatus === "missing"
      ? "critical"
      : input.cards.latestStatus === "running"
        ? "warning"
        : "ok";

  return {
    key: "cards",
    label: "카드 데이터",
    severity,
    value: statusLabel(input.cards.latestStatus),
    detail: input.cards.latestFinishedAt
      ? `마지막 완료 ${formatDate(input.cards.latestFinishedAt)}`
      : "완료된 카드 동기화 기록이 없습니다.",
  };
}

function patchCard(input: OperationsStatusInput): OperationsStatusCard {
  const severity = input.patch.requiresCardReview ? "critical" : "ok";

  return {
    key: "patch",
    label: "패치 상태",
    severity,
    value: input.patch.currentVersion ?? "미설정",
    detail: input.patch.requiresCardReview
      ? "최근 패치 전환에 카드 합법성 검토가 필요합니다."
      : input.patch.latestTransitionAt
        ? `마지막 전환 ${formatDate(input.patch.latestTransitionAt)}`
        : "패치 전환 기록이 아직 없습니다.",
  };
}

function analyticsCard(input: OperationsStatusInput): OperationsStatusCard {
  const severity = input.analytics.events24h === 0 ? "warning" : "ok";

  return {
    key: "analytics",
    label: "분석 이벤트",
    severity,
    value: `${input.analytics.events24h}건`,
    detail:
      input.analytics.events24h === 0
        ? "최근 24시간 제품 이벤트가 없습니다."
        : "최근 24시간 제품 이벤트가 수집 중입니다.",
    href: "/admin/analytics",
  };
}

function worst(values: OperationsSeverity[]): OperationsSeverity {
  if (values.includes("critical")) return "critical";
  if (values.includes("warning")) return "warning";
  return "ok";
}

function statusLabel(status: OperationsStatusInput["cards"]["latestStatus"]) {
  return {
    running: "실행 중",
    succeeded: "정상",
    failed: "실패",
    missing: "없음",
  }[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
