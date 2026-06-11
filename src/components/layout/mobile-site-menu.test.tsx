import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileSiteMenu } from "@/components/layout/mobile-site-menu";

describe("MobileSiteMenu", () => {
  it("offers public navigation and login to signed-out users", () => {
    render(<MobileSiteMenu signedIn={false} isModerator={false} />);

    expect(screen.getByRole("link", { name: "덱 찾기" })).toHaveAttribute(
      "href",
      "/decks",
    );
    expect(screen.getByRole("link", { name: "덱 등록" })).toHaveAttribute(
      "href",
      "/submit",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("offers the library, operations, and sign-out to moderators", () => {
    render(<MobileSiteMenu signedIn isModerator />);

    expect(screen.getByRole("link", { name: "내 라이브러리" })).toHaveAttribute(
      "href",
      "/my/decks",
    );
    expect(screen.getByRole("link", { name: "운영 상태" })).toHaveAttribute(
      "href",
      "/admin/operations",
    );
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });
});
