export type ContentReadinessSeverity = "pass" | "warning" | "fail";

export type ContentReadinessCheck = {
  key: string;
  label: string;
  severity: ContentReadinessSeverity;
  value: number;
  target: number;
  detail: string;
};

export type ContentReadinessSummary = {
  unavailable: boolean;
  ready: boolean;
  generatedAt: string;
  currentPatch?: string;
  checks: ContentReadinessCheck[];
  totals: {
    published: number;
    currentPatchPublished: number;
    representedClasses: number;
    trustedCurrentDecks: number;
    beginnerCurrentDecks: number;
    guideCompleteCurrentDecks: number;
  };
};

export type ContentReadinessInput = {
  unavailable?: boolean;
  generatedAt?: string;
  currentPatch?: string;
  totals: ContentReadinessSummary["totals"];
};

const TARGETS = {
  currentPatchPublished: 30,
  representedClasses: 8,
  trustedCurrentDecks: 10,
  beginnerCurrentDecks: 5,
  guideCompleteRate: 100,
};

export function buildContentReadinessSummary(
  input: ContentReadinessInput,
): ContentReadinessSummary {
  const guideRate =
    input.totals.currentPatchPublished > 0
      ? Math.round(
          (input.totals.guideCompleteCurrentDecks /
            input.totals.currentPatchPublished) *
            100,
        )
      : 0;
  const checks: ContentReadinessCheck[] = [
    check({
      key: "current_patch_decks",
      label: "현재 패치 공개 덱",
      value: input.totals.currentPatchPublished,
      target: TARGETS.currentPatchPublished,
      detail: "공개 베타에서 빈 서비스처럼 보이지 않기 위한 최소 수량입니다.",
    }),
    check({
      key: "class_coverage",
      label: "직업 분포",
      value: input.totals.representedClasses,
      target: TARGETS.representedClasses,
      detail: "특정 직업 유저만 쓸 수 있는 서비스가 되지 않도록 확인합니다.",
    }),
    check({
      key: "trusted_decks",
      label: "출처 연결·운영진 확인 덱",
      value: input.totals.trustedCurrentDecks,
      target: TARGETS.trustedCurrentDecks,
      detail: "초기 신뢰 형성을 위한 최소 검증 콘텐츠입니다.",
    }),
    check({
      key: "beginner_decks",
      label: "초보 추천 현재 덱",
      value: input.totals.beginnerCurrentDecks,
      target: TARGETS.beginnerCurrentDecks,
      detail: "복귀·초보 유저가 첫 방문에서 바로 선택할 수 있어야 합니다.",
    }),
    check({
      key: "guide_complete",
      label: "가이드 완성률",
      value: guideRate,
      target: TARGETS.guideCompleteRate,
      detail: "현재 패치 공개 덱은 운영법과 멀리건을 갖춰야 합니다.",
    }),
  ];

  return {
    unavailable: input.unavailable ?? false,
    ready: checks.every((item) => item.severity === "pass"),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    currentPatch: input.currentPatch,
    checks,
    totals: input.totals,
  };
}

function check({
  key,
  label,
  value,
  target,
  detail,
}: {
  key: string;
  label: string;
  value: number;
  target: number;
  detail: string;
}): ContentReadinessCheck {
  return {
    key,
    label,
    value,
    target,
    detail,
    severity:
      value >= target
        ? "pass"
        : value >= Math.ceil(target * 0.7)
          ? "warning"
          : "fail",
  };
}
