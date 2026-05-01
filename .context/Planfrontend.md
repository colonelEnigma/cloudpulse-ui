# PlanFrontend

Lives at `.context/PlanFrontend.md` in the `cloudpulse-ui` repository.
Project-wide context (services, ports, DB schema, RBAC, tools): `.context/ProjectContext.md`
Backend API contract this plan integrates against: backend repo → `.context/PlanBackend.md`

Last updated: 2026-04-30

---

## Current Status

UI-only Control Panel scaffolding is in place. Backend APIs are fully implemented. Active phase is **live data integration and guarded action wiring**.

---

## Foundation

- Do not replace `cloudpulse-ui` or start a new app from scratch.
- Base: Creative Tim Material Dashboard 2 React (React 18, Material UI 5, CRA / `react-scripts`).
- API calls via `axios`; routing via `react-router-dom`.
- All deployed API calls use ingress-relative `/api/...` paths (not hardcoded hosts).
- Control Panel API calls use `/api/control-plane/...`.

---

## Phase 1 — Auth Fixes

| Task | Status |
|---|---|
| Fix `src/services/authService.js` — `loginUser` helper referenced undefined `API`; update to use `/api/users/login` | ✅ Done |
| After login, fetch `GET /api/users/profile` and store full user identity + `role` in auth state | ✅ Done |
| `AuthProvider` stores token + user identity/role (not token only) | ✅ Done |
| Normalize wrapped profile payloads from `localStorage` and API responses | ✅ Done |
| Wait for profile load when a token exists before routing — avoids redirect races | ✅ Done |

---

## Phase 2 — Control Panel UI Scaffolding

| Task | Status |
|---|---|
| Add `src/layouts/control-panel/` with navigation and nested routing | ✅ Done |
| Update routing to `/control-panel/*` for correct nested route rendering | ✅ Done |
| Add placeholder pages: Overview, Services (with drill-down), Logs, Incidents, Audit | ✅ Done |
| Hide `Control Panel` tab unless `user.role === "admin"` (UX guard only; backend auth remains required) | ✅ Done |

---

## Phase 3 — Live Data Integration

All Control Panel pages currently show placeholder/mock UI. This phase wires them to live backend APIs.
Backend routes reference: backend repo → `.context/PlanBackend.md` → Implemented API Routes table.

### Overview Page (`GET /api/control-plane/overview`)

| Task | Status |
|---|---|
| Fetch and render prod platform health summary | ⏳ Pending |
| Show service counts, degraded services, active alert-style states | ⏳ Pending |
| Show recent healer history incidents | ⏳ Pending |
| Show recent manual Control Panel actions | ⏳ Pending |

### Services Page (`GET /api/control-plane/deployments`)

| Task | Status |
|---|---|
| Fetch and render allowlisted prod deployments | ⏳ Pending |
| Show per-deployment: image tag, desired replicas, ready replicas, available replicas, pod readiness | ⏳ Pending |
| Service detail drill-down route/panel (`GET /api/control-plane/services/:service`) | ⏳ Pending |
| Service detail shows: deployment state, pods, image, events, recent logs, health, recent healer actions, recent manual actions | ⏳ Pending |

### Logs Page

| Task | Status |
|---|---|
| Single service log viewer (`GET /api/control-plane/logs/:service`) | ⏳ Pending |
| Combined prod app log viewer (`GET /api/control-plane/logs`) | ⏳ Pending |
| Combined logs must display service and pod identifier per entry | ⏳ Pending |

### Incidents Page

| Task | Status |
|---|---|
| Prometheus alert-style state (`GET /api/control-plane/alerts`) | ⏳ Pending |
| Kubernetes events and service diagnostics (`GET /api/control-plane/events/:service`) | ⏳ Pending |
| Healer history (`GET /api/control-plane/healing-history`) | ⏳ Pending |

### Audit Page (`GET /api/control-plane/actions`)

| Task | Status |
|---|---|
| Fetch and render paginated manual Control Panel action history from `controlplanedb.control_plane_actions` | ⏳ Pending |
| Show result per action: success / blocked / error | ⏳ Pending |

---

## Phase 4 — Guarded Scale Actions

Scale Down and Scale Up live on the **service detail** view, not as global controls.

| Task | Status |
|---|---|
| Scale Down button — submits `POST /api/control-plane/actions/scale` with `replicas: 0` | ⏳ Pending |
| Scale Up button — submits `POST /api/control-plane/actions/scale` with `replicas: 1` | ⏳ Pending |
| Typed confirmation dialog — user must type the service name exactly before action is submitted | ⏳ Pending |
| Surface failed/blocked action responses in the UI | ⏳ Pending |
| Audit page reflects new actions after backend refresh | ⏳ Pending |

Scale action payload shape (matches backend contract):

```json
{
  "namespace": "prod",
  "service": "<service-name>",
  "replicas": 0,
  "confirmation": "<service-name>"
}
```

---

## Phase 5 — Deployment

| Task | Status |
|---|---|
| Frontend Kubernetes/Jenkins deployment decision | ⏳ Pending |
| Frontend deployment integration | ⏳ Pending |

---

## Safety Constraints (UI Must Never Expose)

- No controls for: secrets, pod deletion, namespace deletion, PVC mutation, Kafka mutation, PostgreSQL app-data mutation, Jenkins/Grafana/Prometheus/Alertmanager mutation, or broad Kubernetes mutation.
- No mock data in the final Control Panel implementation.
- Admin route rendering must wait for profile/role load before showing or hiding the Control Panel tab.
- Direct `/control-panel/*` route access by a normal user is blocked both by frontend routing guard and by backend API authorization.

---

## Normal User Routes (Unchanged)

These exist and are not part of the active work, but must remain unaffected:

- Sign In / Sign Up
- Home / Categories
- Products by Category
- Cart / Checkout
- Orders
- Profile

---

## Deferred (Out of V1 Scope)

- Final visual polish and screenshots
- README demo walkthrough updates
- AI incident assistant and log analyzer UI