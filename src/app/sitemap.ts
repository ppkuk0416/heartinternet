import type { MetadataRoute } from "next";
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

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/decks" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/decks" ? 0.9 : 0.7,
  }));
}
