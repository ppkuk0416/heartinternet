// @vitest-environment node

import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

describe("FixedWindowRateLimiter", () => {
  it("blocks requests over the limit and resets after the window", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);

    expect(limiter.consume("user", 0)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.consume("user", 100)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.consume("user", 200).allowed).toBe(false);
    expect(limiter.consume("user", 1_000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("tracks different keys independently", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);

    expect(limiter.consume("a", 0).allowed).toBe(true);
    expect(limiter.consume("a", 1).allowed).toBe(false);
    expect(limiter.consume("b", 1).allowed).toBe(true);
  });
});
