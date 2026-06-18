const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 12_000;
const REPORT_TIMEOUT_MS = 3_000;

export type ServerErrorReport = {
  error: unknown;
  request: { path: string; method: string };
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource?: string;
    revalidateReason?: string;
    renderType?: string;
  };
};

type ErrorMonitoringConfig = {
  endpoint: string;
  token?: string;
  environment: string;
  release?: string;
};

export function getErrorMonitoringConfig(
  env: Record<string, string | undefined> = process.env,
): ErrorMonitoringConfig | null {
  const endpoint = env.ERROR_MONITORING_ENDPOINT?.trim();
  if (!endpoint) return null;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") return null;

  return {
    endpoint: url.toString(),
    token: env.ERROR_MONITORING_TOKEN?.trim() || undefined,
    environment: env.APP_ENV?.trim() || env.VERCEL_ENV?.trim() || "development",
    release:
      env.APP_RELEASE?.trim() || env.VERCEL_GIT_COMMIT_SHA?.trim() || undefined,
  };
}

export function isErrorMonitoringConfigured(env: Record<string, string | undefined> = process.env) {
  return getErrorMonitoringConfig(env) !== null;
}

export async function reportServerError(
  report: ServerErrorReport,
  options: {
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
    occurredAt?: string;
  } = {},
): Promise<"sent" | "disabled" | "failed"> {
  const config = getErrorMonitoringConfig(options.env);
  if (!config) return "disabled";

  const payload = {
    schemaVersion: 1,
    service: "hearthdeck-hub",
    environment: config.environment,
    release: config.release,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    error: normalizeError(report.error),
    request: {
      method: report.request.method.slice(0, 16),
      path: safePath(report.request.path),
    },
    context: {
      routerKind: report.context.routerKind,
      routePath: report.context.routePath,
      routeType: report.context.routeType,
      renderSource: report.context.renderSource,
      revalidateReason: report.context.revalidateReason,
      renderType: report.context.renderType,
    },
  };

  try {
    const response = await (options.fetcher ?? fetch)(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
      cache: "no-store",
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

function normalizeError(value: unknown) {
  if (value instanceof Error) {
    const digest =
      "digest" in value && typeof value.digest === "string"
        ? value.digest.slice(0, 256)
        : undefined;
    return {
      name: value.name.slice(0, 200),
      message: value.message.slice(0, MAX_MESSAGE_LENGTH),
      stack: value.stack?.slice(0, MAX_STACK_LENGTH),
      digest,
    };
  }

  return {
    name: "UnknownError",
    message: String(value).slice(0, MAX_MESSAGE_LENGTH),
  };
}

function safePath(value: string) {
  const path = value.split(/[?#]/, 1)[0] || "/";
  return path.startsWith("/") ? path.slice(0, 2_000) : "/";
}
