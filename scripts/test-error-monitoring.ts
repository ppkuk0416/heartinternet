import { reportServerError } from "../src/server/observability/error-monitoring";

const smokeError = new Error("This message must not leave the application.");
smokeError.name = "HearthDeckMonitoringSmokeTest";

const sent = await reportServerError(
  smokeError,
  {
    method: "SMOKE_TEST",
    path: "/internal/monitoring-test",
    routePath: "/internal/monitoring-test",
    routerKind: "script",
    routeType: "monitoring_test",
  },
);

if (!sent) {
  console.error(
    "Monitoring smoke test failed. Check ERROR_MONITORING_ENDPOINT, token, and collector logs.",
  );
  process.exitCode = 1;
} else {
  console.log("Monitoring smoke test event accepted by the collector.");
}
