# PlanFrontend

Lives at `.context/Planfrontend.md` in the `cloudpulse-ui` repository.
Project-wide context: `.context/ProjectContext.md`
Backend API contract: `.context/Planbackend.md`

Last updated: 2026-05-01

---

## Current Status

Control Panel frontend integration is implemented against live `/api/control-plane/*` APIs with admin-only visibility, guarded scale actions, and a read-only Resilience diagnostics page.

---

## Foundation

- Do not replace `cloudpulse-ui` or start a new app from scratch.
- Base: Creative Tim Material Dashboard 2 React (React 18, Material UI 5, CRA / `react-scripts`).
- API calls use `axios`; routing uses `react-router-dom`.
- Deployed API calls use ingress-relative `/api/...` paths.
- Control Panel API calls use `/api/control-plane/...`.
- Final Control Panel pages use live backend data only, not mocks.

---

## Completed Implementation

### Auth And Admin Gating

| Task                                                                                          | Status |
| --------------------------------------------------------------------------------------------- | ------ |
| `loginUser` uses `/api/users/login`                                                           | Done   |
| Login/profile flow fetches `GET /api/users/profile` and stores full user identity plus `role` | Done   |
| `AuthProvider` stores token and normalized user identity/role                                 | Done   |
| Existing tokens wait for profile load before protected/admin route decisions                  | Done   |
| Control Panel sidebar/route visibility is admin-only (`user.role === "admin"`)                | Done   |

### Control Panel Live Pages

| Page           | Route                              | Backend APIs                                                          | Status |
| -------------- | ---------------------------------- | --------------------------------------------------------------------- | ------ |
| Overview       | `/control-panel/overview`          | `GET /api/control-plane/status`, `GET /api/control-plane/overview`    | Done   |
| Services       | `/control-panel/services`          | `GET /api/control-plane/deployments`                                  | Done   |
| Service Detail | `/control-panel/services/:service` | service detail, logs, events, actions                                 | Done   |
| Logs           | `/control-panel/logs`              | `GET /api/control-plane/logs`, `GET /api/control-plane/logs/:service` | Done   |
| Incidents      | `/control-panel/incidents`         | alerts, service events, healer history                                | Done   |
| Audit          | `/control-panel/audit`             | `GET /api/control-plane/actions`                                      | Done   |
| Resilience     | `/control-panel/resilience`        | `GET /api/control-plane/resilience`                                   | Done   |

### Guarded Scale Actions

Scale Down and Scale Up live only on the service detail view.

| Task                                                                          | Status |
| ----------------------------------------------------------------------------- | ------ |
| Scale Down submits `POST /api/control-plane/actions/scale` with `replicas: 0` | Done   |
| Scale Up submits `POST /api/control-plane/actions/scale` with `replicas: 1`   | Done   |
| Typed confirmation must exactly match the service name                        | Done   |
| Failed/blocked backend responses are surfaced in the UI                       | Done   |
| Detail data refreshes after scale action                                      | Done   |

Scale action payload:

```json
{
  "namespace": "prod",
  "service": "<service-name>",
  "replicas": 0,
  "confirmation": "<service-name>"
}
```

---

## Resilience Diagnostics Page

Implemented files:

- `src/services/controlPlaneService.js` - `getResilience()`
- `src/layouts/control-panel/Resilience.js`
- `src/layouts/control-panel/index.js` - Resilience tab and nested route

The page is read-only and renders:

- Healer `ServiceDown` safeguard summary
- Per-service healer circuit breaker state for allowlisted prod services
- Per-service healer rate-limit state
- Healer retry and cooldown settings
- Recent blocked reason counts and last healer action when present
- `order-service` to `product-service` circuit breaker diagnostics
- Product HTTP retry behavior
- Control Plane manual scale guard policy
- API `warnings[]` as non-blocking warnings
- Loading, empty, and error states consistent with existing Control Panel pages

Display rules:

- If `orderProductCircuitBreaker` is `null`, keep the page usable and show the warning/empty diagnostic.
- If `serviceState` is empty, show a real empty state.
- Treat circuit breaker state values (`closed`, `open`, `half_open`) as live status labels.
- Do not add controls for changing thresholds, resetting circuit breakers, mutating healer policy, RBAC, or external tools.

---

## Deployment

Frontend Kubernetes/Jenkins delivery is implemented:

- `Dockerfile`
- `nginx.conf`
- `k8s/frontend/deployment.yml`
- `k8s/frontend/service.yml`
- `k8s/frontend/ingress.yml`
- root `Jenkinsfile`

Pipeline behavior:

- builds and pushes short SHA image tags
- deploys to namespace `prod`
- waits for `deployment/frontend` rollout
- applies ingress only when RBAC allows it, otherwise skips gracefully

---

## Safety Constraints

- No controls for secrets, pod deletion, namespace deletion, PVC mutation, Kafka mutation, PostgreSQL app-data mutation, Jenkins/Grafana/Prometheus/Alertmanager mutation, or broad Kubernetes mutation.
- Control Panel remains prod-only and allowlist-only.
- V1 mutation is only typed-confirmed scale to `0` or `1` for allowlisted prod app deployments.
- Admin route rendering must wait for profile/role load.
- Direct `/control-panel/*` route access by a normal user is blocked by frontend routing and backend API authorization.
- Resilience diagnostics are read-only.

---

## Normal User Routes

These routes remain unchanged:

- Sign In / Sign Up
- Home / Categories
- Products by Category
- Cart / Checkout
- Orders
- Profile

---

## Known Follow-ups

1. Lockfile consistency:
   - Dockerfile currently uses `npm install --legacy-peer-deps`.
   - Preferred hardening: sync `package-lock.json` and switch back to `npm ci`.
2. If ingress should be fully pipeline-managed, grant ingress verbs in `prod` to `system:serviceaccount:jenkins:jenkins-deployer`.
3. Optional final polish: screenshots and README walkthrough updates.
