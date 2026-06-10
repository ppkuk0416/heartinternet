import { reportServerError } from "@/server/observability/error-monitoring";

export function register() {
  return;
}

export async function onRequestError(
  error: unknown,
  request: {
    method: string;
    path: string;
  },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
  },
) {
  await reportServerError(error, {
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routerKind: context.routerKind,
    routeType: context.routeType,
  });
}
