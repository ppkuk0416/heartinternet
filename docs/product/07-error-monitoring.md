# Error Monitoring Rollout

Status: implementation ready, staging evidence required  
Owner: Engineering / Operations  
Updated: 2026-06-10

## Required deployment variables

Configure these values in staging and production deployment settings. Do not commit real tokens.

- `ERROR_MONITORING_ENDPOINT`: HTTPS collector endpoint that accepts JSON `POST` requests.
- `ERROR_MONITORING_TOKEN`: optional Bearer token for the collector.
- `APP_ENV`: deployment environment such as `staging` or `production`.
- `APP_RELEASE`: immutable release identifier. When omitted, Vercel or GitHub commit SHA is used.
- `ERROR_MONITORING_TIMEOUT_MS`: optional request timeout; defaults to 3000 ms.

The application treats a missing or non-HTTPS endpoint as a warning on `/admin/operations`.

## Privacy boundary

Server error events contain only:

- timestamp, environment, and release identifier
- error name, bounded message, and bounded stack
- request method and URL path without query or fragment
- Next.js route metadata

The adapter does not copy request headers, cookies, request bodies, email fields, comments, or raw deck codes. Collector access logs and retention settings must follow the same restriction.

## Staging verification

1. Configure the endpoint, token, `APP_ENV=staging`, and release identifier.
2. Deploy the branch or merged release to staging.
3. Run `npm run monitoring:test` with the same deployment variables.
4. Confirm one event named `HearthDeck Hub monitoring smoke test` in the collector.
5. Confirm the event includes the staging environment and expected release.
6. Confirm no query string, token, email, comment body, or raw deck code is present.
7. Save the collector screenshot or event URL in GitHub issue #2.
8. Verify `/admin/operations` shows error monitoring as configured.

## Failure behavior

Monitoring delivery has a three-second default timeout and never replaces the original application response with a collector failure. A collector outage is logged as a warning. Repeated delivery failures should be handled as a P1 operational incident and investigated through deployment and collector logs.

## Completion boundary

Merging the implementation does not complete issue #2. Completion still requires a staging test event, a verified P0/P1 notification route, and privacy evidence from the external collector.
