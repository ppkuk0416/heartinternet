import type { Instrumentation } from "next";
import { reportServerError } from "@/server/observability/error-monitoring";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  await reportServerError({
    error,
    request: {
      method: request.method,
      path: request.path,
    },
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  });
};
