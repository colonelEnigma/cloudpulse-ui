# PlanBackend

Lives at `.context/Planbackend.md`.
Shared context: `.context/ProjectContext.md`
Frontend integration plan: `.context/Planfrontend.md`

Last updated: 2026-05-01

---

## Current Status

Control Plane backend APIs are implemented and deployed, and the frontend Control Panel is now wired to live `/api/control-plane/*` endpoints with admin-only gating and guarded scale actions.

As of 2026-05-01, the frontend also includes a read-only Resilience diagnostics page wired to `GET /api/control-plane/resilience`.

---

## Backend Contract (Implemented)

All routes require JWT + admin role:

- `GET /api/control-plane/status`
- `GET /api/control-plane/overview`
- `GET /api/control-plane/deployments`
- `GET /api/control-plane/services/:service`
- `GET /api/control-plane/logs`
- `GET /api/control-plane/logs/:service`
- `GET /api/control-plane/events/:service`
- `GET /api/control-plane/alerts`
- `GET /api/control-plane/healing-history`
- `GET /api/control-plane/resilience`
- `GET /api/control-plane/actions`
- `POST /api/control-plane/actions/scale`

Scale action guardrails:

- `namespace` must be `"prod"`
- `service` must be allowlisted:
  - `user-service`
  - `order-service`
  - `payment-service`
  - `product-service`
  - `search-service`
- `replicas` must be `0` or `1`
- typed confirmation must exactly match the service name

---

## Progress Captured In This Chat

### 1) Control Panel live integration in frontend completed

- Live Control Plane service client added and used with ingress-relative paths.
- Overview, Services, Service Detail, Logs, Incidents, and Audit pages now consume live APIs.
- Loading, empty, and error states are implemented across Control Panel pages.
- Service detail page supports only guarded `Scale Down (0)` and `Scale Up (1)`.
- After scale action, UI refreshes detail/events/logs/actions and shows backend feedback.
- Admin-only visibility remains enforced in:
  - route metadata (`adminOnly`)
  - sidenav filtering (`user.role === "admin"`)
  - route redirect protection in `App.js`

### 2) Local/prod API path strategy aligned

- Frontend uses relative `/api/...` paths (no hardcoded localhost inside components).
- `src/setupProxy.js` routes local dev traffic:
  - `/api/users` -> `http://localhost:3000`
  - `/api/control-plane` -> `http://localhost:7100`
  - `/api/orders` -> `http://localhost:3003`
  - `/api/payment` -> `http://localhost:4000`
  - `/api/products` -> `http://localhost:3005`
  - `/api/search` -> `http://localhost:5003`

### 3) Frontend CI/CD to EKS implemented and validated

- Added production Docker + nginx SPA serving:
  - `Dockerfile`
  - `nginx.conf` with `try_files $uri $uri/ /index.html;`
- Added frontend Kubernetes manifests:
  - `k8s/frontend/deployment.yml`
  - `k8s/frontend/service.yml`
  - `k8s/frontend/ingress.yml`
- Implemented root `Jenkinsfile` pipeline:
  - short SHA image tags (no `latest`)
  - buildah build/push in Kubernetes agent pod
  - deploy to namespace `prod`
  - rollout wait on `deployment/frontend`
- Ingress apply stage now checks RBAC and skips gracefully if ingress permissions are missing.
- Deployment run succeeded; frontend pod verified running in `prod`.

### 4) Orders payment-status correctness fix completed

- Order Details `Payment Status` now resolves from payment-service by order ID (source of truth from payment DB path).
- Removed fallback behavior that forced `"pending"` on every payment lookup failure.
- UI now shows:
  - live status when found
  - `Not Found` for payment 404
  - `Unavailable` for other errors

### 5) Resilience diagnostics frontend integration completed

- Added `getResilience()` client helper for `GET /api/control-plane/resilience`.
- Added `/control-panel/resilience` tab/page.
- Page renders healer safeguards, per-service circuit breaker/rate-limit state, order/product circuit breaker diagnostics, retry behavior, manual scale guardrails, and API warnings.
- Page is read-only and exposes no new mutation controls.

---

## Known Follow-ups

1. `jenkins-deployer` may not have ingress RBAC in `prod`; either:
   - grant ingress verbs (`get/create/patch/update`) in `prod`, or
   - keep manual ingress apply outside this job.
2. Docker build currently uses `npm install` (not `npm ci`) because lockfile sync was inconsistent in CI.
   - Follow-up hardening: regenerate/commit a clean lockfile and switch back to `npm ci`.
3. Keep only new `.context` naming in docs and future prompts:
   - `Planbackend.md`
   - `Planfrontend.md`
   - `ProjectContext.md`

---

## Next Suggested Actions

1. Commit and push the latest frontend changes (Control Panel live wiring + Jenkins + payment status fix + Resilience diagnostics).
2. If ingress should be fully pipeline-managed, add RBAC for ingress in `prod`.
3. Stabilize lockfile and move Docker build back to `npm ci` for deterministic installs.
