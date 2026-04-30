# Project Handoff Summary

Last updated: 2026-04-29

## Current State

This repository is a Jenkins-driven, multi-environment EKS microservices platform with:

- Node.js/Express microservices for users, orders, payments, products, search, and healing.
- Kubernetes namespaces for `dev`, `test`, and `prod`.
- Shared Kafka, Zookeeper, PostgreSQL, Prometheus, Alertmanager, and healer-service in `default`.
- Jenkins builds changed services once, deploys to `dev` and `test`, and promotes existing image tags to `prod` through `jenkins/promotion.env`.
- ECR image versioning with short Git SHA tags.
- Prometheus, Grafana, Alertmanager, and Slack alerting.
- Git-versioned Grafana dashboard and datasource provisioning.
- Controlled rollback using `jenkins/rollback.env`.
- Policy-based self-healing with audit history in `healerdb.healing_actions`.
- Jenkins runs automatically every 2 minutes; changed-file detection uses the previous successful commit when Jenkins provides it.

## Current Planning Focus

The active next phase is Control Plane backend implementation. Frontend planning is captured, but frontend implementation comes after backend behavior is verified.

- Frontend remains prod-facing and user-centric.
- Existing frontend foundation is `C:\Users\ranja\Documents\projects\cloudpulse-ui`.
- Control Panel will be part of the main frontend as an admin-only top tab hidden unless `user.role === "admin"`.
- Backend implementation must happen before frontend implementation.
- Frontend implementation should consume `.context/control-plane-frontend-plan.md` after backend APIs are verified.
- Control Plane V1 uses live prod data, not mocks.
- Control Plane V1 supports guarded prod service Down/Up demo actions by scaling allowlisted app deployments to `0` or `1`.
- All manual Control Panel actions must be audited.
- Demo polish, observability polish, warm pause scripts, and AI features are backlog/pipeline items for now.

## Recent Changes

- Prometheus scrape alignment now focuses on `dev` and `prod` only.
- `test` is intentionally excluded from Prometheus scraping and Grafana alignment for now.
- App scrape targets in `prometheus-values.yaml` include consistent `deployment`, `namespace`, `environment`, and `service` labels.
- HTTP metrics were standardized across app services:
  - `http_requests_total`
  - `http_request_duration_seconds`
- Alertmanager routes `ServiceDown` alerts for `dev` and `prod` to healer-service.
- Alertmanager webhook URL points to healer-service port `7000`.
- Prod alerts still route to Slack.
- Healer policy allows `dev` and `prod`:

```js
allowedNamespaces: ["dev", "prod"]
```

- Healer RBAC now allows `get` and `patch` on deployments in both `dev` and `prod`.
- `docs/healer-runbook.md` was added.
- Grafana dashboard provisioning was added under `k8s/monitoring/grafana/`.
- `k8s/monitoring/grafana-values.yaml` now provisions Prometheus and Healer PostgreSQL datasources.
- `docs/grafana-runbook.md` was added.
- The previously exposed Slack webhook was rotated.
- Final prod healer + Slack alert validation was completed.
- `docs/rollback-runbook.md` was added.
- `docs/jenkins-promotion-runbook.md` was updated for Git-controlled promotion.
- `jenkins/promotion.env` was added for promotion requests.
- Normal Jenkins service builds now deploy to `dev` and `test`.
- Promotion to `prod` now deploys an existing image tag without rebuilding.
- Git-controlled prod promotion was tested successfully.
- Services promoted through the new flow were verified healthy in `prod`.
- Baseline secrets, probes/resources, and SLO/alert hardening were completed per operator update.
- Control Plane backend planning was captured in `.context/control-plane-backend-plan.md`.
- `docs/control-plane-backend-plan.md` was added as the docs-facing planning reference.
- Control Plane frontend planning was captured in `.context/control-plane-frontend-plan.md`.
- `docs/control-plane-frontend-plan.md` was added as the docs-facing planning reference.
 - Control Panel frontend UI scaffolding was implemented (UI-only) and committed to the frontend repo on 2026-04-30. Changes include:
   - `src/layouts/control-panel/*`: `index.js`, `Overview.js`, `Services.js`, `ServiceDetail.js`, `Logs.js`, `Incidents.js`, `Audit.js` (UI-only pages and navigation).
   - Route updated to `/control-panel/*` to support nested Control Panel routes.
   - `AuthProvider` updates: normalization of wrapped profile responses from localStorage/API, and `loading` initialization when a token exists but profile is not yet loaded to avoid premature redirecting.
   - `src/services/authService.js` login helper updated to use ingress-relative `/api/users/login` via `userApi`.
   - ESLint/Prettier auto-fixes applied and temporary debug logs removed after verification.

## Verified Behavior

Prod self-healing was validated successfully:

- `payment-service` in `prod` was scaled to `0`.
- Prometheus/Alertmanager triggered `ServiceDown`.
- healer-service scaled `payment-service` back to `1`.
- `/history` recorded audit id `36` with:
  - `namespace: prod`
  - `deployment: payment-service`
  - `action: scale`
  - `result: success`
  - `reason: replicas were 0`
- Final prod healer + Slack alert validation was completed after Slack webhook rotation.

Grafana provisioning was validated successfully:

- Grafana Helm release upgraded to revision `12`.
- Grafana deployment rolled out successfully in `monitoring`.
- Grafana pod was `1/1 Running` with `0` restarts after the upgrade.
- Dashboard ConfigMap `grafana-dashboard-self-healing-platform` existed in `monitoring`.
- Grafana logs showed `Prometheus` and `Healer PostgreSQL` datasources inserted from configuration.
- Grafana logs showed dashboard provisioning completed.
- In-cluster Prometheus query from Grafana returned all expected `dev` and `prod` service targets as `up=1`.
- Grafana pod could reach PostgreSQL at `postgres.default.svc.cluster.local:5432`.

Jenkins Git-controlled promotion was validated successfully:

- Normal service builds deployed to `dev` and `test`.
- Prod promotion used `jenkins/promotion.env`.
- Promotion skipped image rebuild and deployed an existing short Git SHA image tag to `prod`.
- Tested promoted services were healthy in `prod`.
- `payment-service` logs showed successful PostgreSQL connection, Kafka connection, prod topic subscription, and consumer group join.

## Important Files

- `prometheus-values.yaml`: active Prometheus and Alertmanager source of truth.
- `k8s/monitoring/grafana-values.yaml`: active Grafana datasource and dashboard provider source of truth.
- `k8s/monitoring/grafana/dashboards/self-healing-platform.json`: provisioned Grafana dashboard JSON.
- `k8s/monitoring/grafana/kustomization.yaml`: generates dashboard ConfigMap.
- `k8s/monitoring/alert-rules.yaml`: legacy/backup only.
- `services/healer-service/src/config/actions.js`: healer allowlist and safety policy.
- `k8s/healer-service/rbac.yaml`: healer Kubernetes permissions.
- `docs/healer-runbook.md`: operational runbook for healer validation and troubleshooting.
- `docs/grafana-runbook.md`: operational runbook for Grafana dashboard provisioning and validation.
- `docs/rollback-runbook.md`: operational runbook for image rollback through Jenkins.
- `docs/jenkins-promotion-runbook.md`: operational runbook for Git-controlled Jenkins prod promotion.
- `docs/control-plane-backend-plan.md`: docs-facing reference for the planned Control Plane backend.
- `docs/control-plane-frontend-plan.md`: docs-facing reference for the planned Control Plane frontend.
- `.context/control-plane-backend-plan.md`: canonical planning handoff for Control Plane backend implementation.
- `.context/control-plane-frontend-plan.md`: canonical planning handoff for deferred frontend implementation.
- `jenkins/promotion.env`: controlled promotion configuration.
- `jenkins/rollback.env`: controlled rollback configuration.

## Known Issues And Follow-Ups

- Alertmanager does not expand `${SLACK_WEBHOOK_URL}` inside its config file.
- Helm upgrades may need `--server-side=true --force-conflicts` because Alertmanager ConfigMap was previously edited manually.
- Grafana persistence is disabled; provisioned dashboards survive through Git/Helm, but UI-only edits can be lost on pod replacement.
- Grafana PostgreSQL datasource depends on Secret `grafana-postgres-datasource` in namespace `monitoring`.
- Jenkins UI approval buttons were unreliable, so prod promotion now uses Git commits through `jenkins/promotion.env`.
- Control Plane backend is planned but not implemented yet.
- `user-service` does not yet have `role` support for admin-only Control Panel visibility.
- `controlplanedb`, `control_plane_actions`, and prod-only `control-plane-service` RBAC are planned but not implemented yet.
- `cloudpulse-ui` is a separate frontend repo; no monorepo migration is planned unless explicitly requested.
- Frontend API integration still needs cleanup when implementation begins, including ingress-relative `/api/...` paths, auth path consistency, and loading profile/role after login.

## Next Steps

1. Add `user-service` role support and manually bootstrap the first admin with SQL.
2. Create `services/control-plane-service` with admin JWT enforcement.
3. Add `controlplanedb.control_plane_actions` for manual action audit.
4. Add prod-only RBAC for live reads, logs, events, and deployment patch only.
5. Implement live read-only APIs before guarded scale actions.
6. Implement typed-confirmed scale `0/1` actions for allowlisted prod app deployments.
7. Verify auth, live data, logs, actions, and RBAC safety.
8. After backend behavior is verified, integrate `cloudpulse-ui` from `.context/control-plane-frontend-plan.md`.

## Backlog / Pipeline

- Frontend implementation and deployment integration after backend behavior is verified.
- Final project demo assets and README walkthrough.
- Screenshots for Grafana, Jenkins promotion, Slack alerting, healer history, and Control Panel.
- Demo polish.
- Observability polish, SLO dashboards, and alert noise tuning.
- Warm pause scripts for demo lifecycle.
- Optional Grafana persistence decision if UI-only editing becomes important.
- AI incident assistant.
- Log analyzer.
- AI cost advisor.
- RAG over runbooks/docs/incidents.

## Command Preference

Use Bash commands in future instructions unless the user explicitly asks for PowerShell.
