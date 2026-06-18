import {
  isErrorMonitoringConfigured,
  reportServerError,
} from "../src/server/observability/error-monitoring";

if (!isErrorMonitoringConfigured()) {
  console.error("ERROR_MONITORING_ENDPOINT is not configured.");
  process.exitCode = 1;
} else {
  const result = await reportServerError({
    error: new Error("HearthDeck Hub error monitoring test event"),
    request: { method: "TEST", path: "/operations/error-monitoring-test" },
    context: {
      routerKind: "App Router",
      routePath: "/operations/error-monitoring-test",
      routeType: "route",
    },
  });

  if (result !== "sent") {
    console.error(`Error monitoring test event was not accepted: ${result}`);
    process.exitCode = 1;
  } else {
    console.log("Error monitoring test event accepted.");
  }
}
