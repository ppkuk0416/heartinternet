import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("allows local absolute paths", () => {
    expect(safeNextPath("/submit?step=2")).toBe("/submit?step=2");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://example.com", "/decks")).toBe("/decks");
    expect(safeNextPath("//example.com", "/decks")).toBe("/decks");
  });
});
