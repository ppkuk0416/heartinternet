const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 12_000;

export type ErrorMonitoringConfig = {
  endpoint: string;
  token?: string;
  environment: string;
  release?: string;
  timeoutMs: number;
};

export type ErrorMonitoringStatus = {
  configured: boolean;
  valid: boolean;
  environment: string;
  release?: string;
  detail: string;
};

export type ServerErrorContext = {
  method?: string;
  path?: string;
  routePath?: string;
  routerKind?: string;
  routeType?: string;
};

export type ServerErrorEvent = {
  timestamp: string;
  environment: string;
  release?: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  request: {
    method?: string;
    path?: string;
  };
  context: {
    routePath?: string;
    routerKind?: string;
    routeType?: string;
  };
};

export function readErrorMonitoringConfig(
  env: NodeJS.ProcessEnv = process.env,
): ErrorMonitoringConfig | null {
  const endpoint = env.ERROR_MONITORING_ENDPOINT?.trim();
  if (!endpoint) return null;

  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new Error("ERROR_MONITORING_ENDPOINT must use HTTPS");
  }

  return {
    endpoint: url.toString(),
    token: env.ERROR_MONITORING_TOKEN?.trim() || undefined,
    environment: env.APP_ENV?.trim() || env.NODE_ENV || "development",
    release:
      env.APP_RELEASE?.trim() ||
      env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      env.GITHUB_SHA?.trim() ||
      undefined,
    timeoutMs: parseTimeout(env.ERROR_MONITORING_TIMEOUT_MS),
  };
}

export function getErrorMonitoringStatus(
  env: NodeJS.ProcessEnv = process.env,
): ErrorMonitoringStatus {
  const environment = env.APP_ENV?.trim() || env.NODE_ENV || "development";
  const release =
    env.APP_RELEASE?.trim() ||
    env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    env.GITHUB_SHA?.trim() ||
    undefined;

  try {
    const config = readErrorMonitoringConfig(env);
    if (!config) {
      return {
        configured: false,
        valid: false,
        environment,
        release,
        detail: "ERROR_MONITORING_ENDPOINT is not configured.",
      };
    }

    return {
      configured: true,
      valid: true,
      environment: config.environment,
      release: config.release,
      detail: "HTTPS error collector is configured.",
    };
  } catch (error) {
    return {
      configured: true,
      valid: false,
      environment,
      release,
      detail: error instanceof Error ? error.message : "Invalid monitoring configuration.",
    };
  }
}

export function createServerErrorEvent(
  error: unknown,
  context: ServerErrorContext = {},
  config: ErrorMonitoringConfig,
): ServerErrorEvent {
  const normalized = normalizeError(error);

  return {
    timestamp: new Date().toISOString(),
    environment: config.environment,
    release: config.release,
    error: {
      name: normalized.name,
      message: truncate(normalized.message, MAX_MESSAGE_LENGTH),
      stack: normalized.stack
        ? truncate(normalized.stack, MAX_STACK_LENGTH)
        : undefined,
    },
    request: {
      method: context.method,
      path: sanitizePath(context.path),
    },
    context: {
      routePath: sanitizePath(context.routePath),
      routerKind: context.routerKind,
      routeType: context.routeType,
    },
  };
}

export async function reportServerError(
  error: unknown,
  context: ServerErrorContext = {},
  options: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<boolean> {
  let config: ErrorMonitoringConfig | null;
  try {
    config = readErrorMonitoringConfig(options.env);
  } catch (configurationError) {
    console.warn("Error monitoring is misconfigured", configurationError);
    return false;
  }

  if (!config) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)(config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.token
          ? { authorization: `Bearer ${config.token}` }
          : {}),
      },
      body: JSON.stringify(createServerErrorEvent(error, context, config)),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`Error monitoring collector returned ${response.status}`);
      return false;
    }

    return true;
  } catch (reportingError) {
    console.warn("Failed to report server error", reportingError);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown server error",
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message: typeof error === "string" ? error : "Unknown server error",
    stack: undefined,
  };
}

function sanitizePath(value?: string) {
  if (!value) return undefined;

  try {
    const url = new URL(value, "https://monitoring.invalid");
    return url.pathname;
  } catch {
    return value.split(/[?#]/, 1)[0] || "/";
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function parseTimeout(value?: string) {
  if (!value) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
