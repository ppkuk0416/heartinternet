const DEFAULT_LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitUrl) return normalizeSiteUrl(explicitUrl);

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return normalizeSiteUrl(`https://${vercelUrl}`);

  return DEFAULT_LOCAL_SITE_URL;
}

function normalizeSiteUrl(value: string) {
  try {
    const url = new URL(value);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_LOCAL_SITE_URL;
  }
}
