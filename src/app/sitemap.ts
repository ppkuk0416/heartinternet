import type { MetadataRoute } from "next";
import { decks } from "@/lib/decks";
import { getSiteUrl } from "@/lib/site-url";

const publicRoutes = [
  "",
  "/decks",
  "/meta",
  "/about",
  "/rules",
  "/privacy",
  "/submit",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const staticPages = publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/decks" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/decks" ? 0.9 : 0.7,
  } satisfies MetadataRoute.Sitemap[number]));
  const deckPages = decks.map((deck) => ({
    url: `${siteUrl}/decks/${deck.slug}`,
    lastModified: parseKoreanDate(deck.updatedAt) ?? now,
    changeFrequency: "weekly",
    priority: 0.8,
  } satisfies MetadataRoute.Sitemap[number]));

  return [...staticPages, ...deckPages];
}

function parseKoreanDate(value: string) {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}
