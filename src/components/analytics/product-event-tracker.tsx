"use client";

import { useEffect } from "react";

export type ProductEventName =
  | "deck_list_viewed"
  | "deck_detail_viewed"
  | "deck_code_copied"
  | "deck_submit_started"
  | "deck_preview_succeeded"
  | "deck_draft_created";

type ProductEventPayload = {
  eventName: ProductEventName;
  deckSlug?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function ProductEventTracker(payload: ProductEventPayload) {
  const { eventName, deckSlug, metadata } = payload;
  const metadataKey = stableMetadata(metadata);

  useEffect(() => {
    trackProductEvent({
      eventName,
      deckSlug,
      metadata: metadataKey
        ? (JSON.parse(metadataKey) as ProductEventPayload["metadata"])
        : undefined,
    });
  }, [eventName, deckSlug, metadataKey]);

  return null;
}

export function trackProductEvent({
  eventName,
  deckSlug,
  metadata = {},
}: ProductEventPayload) {
  const body = JSON.stringify({
    eventName,
    deckSlug,
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
    metadata,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/analytics/events", blob)) return;
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  }).catch(() => undefined);
}

function stableMetadata(
  metadata: Record<string, string | number | boolean | null> | undefined,
) {
  if (!metadata) return "";
  return JSON.stringify(
    Object.keys(metadata)
      .sort()
      .reduce<Record<string, string | number | boolean | null>>((result, key) => {
        result[key] = metadata[key];
        return result;
      }, {}),
  );
}
