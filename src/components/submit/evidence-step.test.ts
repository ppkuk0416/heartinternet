import { describe, expect, it } from "vitest";
import { calculateRecord } from "@/components/submit/evidence-step";

describe("calculateRecord", () => {
  it("calculates win rate from wins and losses", () => {
    expect(calculateRecord("7", "3")).toEqual({ games: 10, winRate: 70 });
    expect(calculateRecord("2", "1")).toEqual({
      games: 3,
      winRate: 66.7,
    });
  });

  it("does not calculate incomplete or zero-game records", () => {
    expect(calculateRecord("7", "")).toBeNull();
    expect(calculateRecord("0", "0")).toBeNull();
  });
});
