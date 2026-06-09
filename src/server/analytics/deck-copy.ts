import { createHmac } from "node:crypto";

export function createAnonymousDeckCopyHash({
  address,
  userAgent,
  occurredOn,
  secret,
}: {
  address: string;
  userAgent: string;
  occurredOn: string;
  secret: string;
}) {
  if (secret.length < 32) {
    throw new Error("COPY_EVENT_HASH_SECRET must contain at least 32 characters");
  }

  return createHmac("sha256", secret)
    .update(`${occurredOn}\n${address}\n${userAgent}`, "utf8")
    .digest("hex");
}

export function requestAddress(headers: Headers) {
  return (
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
