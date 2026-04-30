# Control Plane Frontend Plan

Last updated: 2026-04-30

Status: in-progress (UI-to-live transition). UI scaffolding is in place and backend APIs are implemented; frontend live data integration and guarded action wiring are next.

## Purpose

The frontend will use the existing Creative Tim Material Dashboard React app as the foundation for a prod-facing, user-centric product/order experience with an admin-only Control Panel.

Existing frontend source:

```text
C:\Users\ranja\Documents\projects\cloudpulse-ui
```

Backend contract reference:

```text
.context/control-plane-backend-plan.md
```

Docs-facing reference:

```text
docs/control-plane-frontend-plan.md
```

## Existing Frontend Foundation

Use the existing `cloudpulse-ui` app. Do not replace it or start a new frontend from scratch unless explicitly requested.

Current foundation:

- Creative Tim Material Dashboard 2 React.
- React 18.
- Material UI 5.
- Create React App / `react-scripts`.
- `axios` for API calls.
- `react-router-dom` for routing.
- Existing user-centric routes and layouts for sign in, sign up, home/categories, products by category, cart/checkout, orders, and profile/template pages.

Observed implementation notes to address when frontend work begins:

- Deployed API calls should use ingress-relative `/api/...` paths.
- Existing auth paths need cleanup, including `/users/login` versus backend `/api/users/login`.
- `src/services/authService.js` currently has a `loginUser` helper that references undefined `API`.
- After login, the app must load `/api/users/profile` so auth state includes the authenticated user and `role`.
- `AuthProvider` should store token plus user identity/role, not token only.

## App Shape

The normal app remains user-centric.

Normal authenticated users see:

- Sign In.
- Sign Up.
- Home / Categories.
- Products by Category.
- Cart / Checkout.
- Orders.
- Profile.

Admins see all normal user pages plus an admin-only top navigation tab named:

```text
Control Panel
```

The Control Panel tab must be hidden unless `user.role === "admin"`. Backend authorization remains required for all `/api/control-plane/*` calls; frontend hiding is UX only.

## Control Panel Layout

Use a five-page operational console inside the existing Material Dashboard layout:

- `Overview`: prod platform health summary, service counts, degraded services, active alert-style states, recent incidents, and recent manual actions.
- `Services`: allowlisted prod deployments with image, desired replicas, ready replicas, available replicas, pod readiness, and service detail drill-down.
- `Logs`: recent logs for one prod service plus combined recent logs for all allowlisted prod app services.
- `Incidents`: Prometheus alert-style state, Kubernetes events, service diagnostics, and healer history.
- `Audit`: manual Control Panel action history from `controlplanedb.control_plane_actions`.

Service detail should live under the Services area as a drill-down route or panel. It should show deployment state, pods, image, events, recent logs, health, recent healer actions, recent manual actions, and guarded Down/Up controls.

## Fixed Constraints

- The main frontend is prod-facing.
- Control Panel data must come from live backend APIs, not mocks.
- Control Panel V1 is prod-focused only.
- Control Panel V1 may read and act only on allowlisted prod app deployments:
  - `user-service`
  - `order-service`
  - `payment-service`
  - `product-service`
  - `search-service`
- V1 mutation is limited to typed-confirmed scale actions with replicas exactly `0` or `1`.
- Typed confirmation must match the service name.
- Scale Down and Up actions should live on service detail, not in generic global mutation controls.
- The frontend must not expose generic Kubernetes mutation.
- The frontend must not provide controls for secrets, pod deletion, namespace deletion, PVC mutation, Kafka mutation, PostgreSQL application-data mutation, Jenkins mutation, Grafana mutation, Prometheus mutation, or Alertmanager mutation.
- Manual Control Panel actions must be audited by the backend.
- Backend RBAC remains narrow: prod reads/logs/events plus patch deployments only.

## Backend Readiness

Frontend live data/action integration now proceeds against the implemented backend contract:

- `user-service` supports `role`, includes it in JWT/profile responses, and keeps registration default as `user`. This is locally implemented and verified.
- `control-plane-service` exposes guarded `/api/control-plane/*` APIs. `/health`, `/metrics`, status/overview/deployments/service-detail/logs/events/alerts/healing-history/actions, and guarded scale `0/1` with typed confirmation + audit are implemented.
- Control Plane APIs use live prod Kubernetes, Prometheus, healer-service, and audit DB data.
- Guarded scale `0` or `1` works only for allowlisted prod app deployments.
- RBAC verification confirms no secrets, deletes, namespace permissions, pod deletion, broad mutation, or non-prod mutation.

## Recent Progress (UI-only)

- 2026-04-30: Control Panel UI scaffolding added to the frontend repo (UI-only). Files added under `src/layouts/control-panel/` provide navigation and placeholder pages for Overview, Services (with drill-down), Logs, Incidents, and Audit.
- Auth handling on the frontend improved to normalize wrapped profile payloads stored in `localStorage` and to wait for profile load when a token exists to avoid redirect races.
- Routing updated to use `/control-panel/*` so nested routes render correctly.
- `src/services/authService.js` login helper updated to use ingress-relative `/api/users/login` (backend API endpoint canonicalized).
- Backend progress: `user-service` role support is verified and `services/control-plane-service` now provides implemented admin-guarded live `/api/control-plane/*` APIs (local on `7100`, cluster in `monitoring`).

Note: These are UI-only changes. Backend APIs are implemented; frontend live data, guarded action wiring, and audit view integration now move from planning to implementation work in `cloudpulse-ui`.

Expected frontend API usage:

- User auth/profile/products/orders/payment calls use the existing app service APIs through prod ingress-relative `/api/...` routes.
- Control Panel calls use `/api/control-plane/...`.
- Admin route rendering waits for profile/role loading before showing or hiding the Control Panel tab.
- Failed or blocked Control Panel actions are surfaced in the UI and are visible in the Audit page after backend refresh.

## Future Implementation Test Plan

User flow:

- User can register and sign in.
- User can browse live product categories and products.
- User can add products to cart and create an order.
- User can view their orders and payment status where available.

Admin visibility:

- Normal user does not see the Control Panel tab.
- Admin user sees normal user pages plus the Control Panel tab.
- Direct Control Panel route access by a normal user is blocked by frontend routing and by backend API authorization.

Control Panel:

- Overview, Services, Logs, Incidents, and Audit render live backend data.
- Service detail shows prod deployment status, pods, logs, events, health, and recent action context.
- Scale Down submits only replicas `0` after typed confirmation.
- Scale Up submits only replicas `1` after typed confirmation.
- Invalid namespace, service, replica value, or confirmation is blocked and shown without exposing unsafe controls.

Safety:

- No UI control exists for secrets, pod deletion, namespace deletion, PVC mutation, Kafka mutation, PostgreSQL application-data mutation, Jenkins mutation, Grafana mutation, Prometheus mutation, or Alertmanager mutation.
- No mock Control Panel data is used for final implementation.

## Deferred

- Live Control Panel data integration.
- Guarded scale action UI wiring.
- Frontend Kubernetes/Jenkins deployment decision.
- Final visual polish and screenshots.
- README demo walkthrough updates.
- AI incident assistant and log analyzer UI.
