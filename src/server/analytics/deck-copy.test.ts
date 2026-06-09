import { describe, expect, it } from "vitest";
import {
  createAnonymousDeckCopyHash,
  requestAddress,
} from "@/server/analytics/deck-copy";

const secret = "a-test-secret-that-is-longer-than-32-characters";

describe("anonymous deck copy identity", () => {
  it("is stable within a day and rotates on the next day", () => {
    const input = {
      address: "203.0.113.8",
      userAgent: "Example Browser",
      occurredOn: "2026-06-07",
      secret,
    };

    expect(createAnonymousDeckCopyHash(input)).toBe(
      createAnonymousDeckCopyHash(input),
    );
    expect(
      createAnonymousDeckCopyHash({
        ...input,
        occurredOn: "2026-06-08",
      }),
    ).not.toBe(createAnonymousDeckCopyHash(input));
    expect(createAnonymousDeckCopyHash(input)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires a deployment secret with enough entropy", () => {
    expect(() =>
      createAnonymousDeckCopyHash({
        address: "unknown",
        userAgent: "",
        occurredOn: "2026-06-07",
        secret: "short",
      }),
    ).toThrow("at least 32 characters");
  });

  it("prefers the platform-provided forwarded address", () => {
    expect(
      requestAddress(
        new Headers({
          "x-vercel-forwarded-for": "203.0.113.1, 10.0.0.1",
          "x-forwarded-for": "198.51.100.1",
        }),
      ),
    ).toBe("203.0.113.1");
  });
});
