import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyLibraryNav } from "@/components/my/my-library-nav";

describe("MyLibraryNav", () => {
  it("marks the selected library section", () => {
    render(<MyLibraryNav current="favorites" />);

    expect(screen.getByRole("link", { name: "저장한 덱" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "작성한 덱" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
