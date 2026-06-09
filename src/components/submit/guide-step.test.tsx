import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuideStep } from "@/components/submit/guide-step";

describe("GuideStep", () => {
  it("returns a structured guide without persisting before review", () => {
    const onContinue = vi.fn();
    render(
      <GuideStep
        className="전사"
        onBack={() => undefined}
        onContinue={onContinue}
      />,
    );

    fireEvent.change(screen.getByLabelText("덱 이름"), {
      target: { value: "테스트 전사 덱" },
    });
    fireEvent.change(screen.getByLabelText(/한 줄 요약/), {
      target: {
        value: "초반 필드와 중반 압박을 이어가는 테스트용 전사 덱입니다.",
      },
    });
    fireEvent.change(screen.getByLabelText("추천 대상"), {
      target: { value: "복귀 유저와 일반 등급전 유저" },
    });
    fireEvent.change(screen.getByLabelText(/핵심 운영법/), {
      target: {
        value: "초반에는 필드를 잡고 중반부터 상대 영웅에게 피해를 누적합니다.",
      },
    });
    fireEvent.change(screen.getByLabelText(/멀리건/), {
      target: { value: "1비용과 2비용 카드를 우선해서 찾습니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "플레이 근거 입력" }));

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "테스트 전사 덱",
        difficulty: "medium",
      }),
    );
  });
});
