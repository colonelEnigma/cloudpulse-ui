# Project Handoff Summary

Last updated: 2026-05-01

---

## New .context Structure

Use these files going forward:

- `.context/Planbackend.md` - backend contract + integration status
- `.context/Planfrontend.md` - frontend implementation plan
- `.context/ProjectContext.md` - shared platform context

Older file names (`control-plane-backend-plan.md`, `control-plane-frontend-plan.md`, `project-context.md`) were replaced by the new naming.

---

## What Was Completed In This Chat

### 1) Control Panel live backend integration (frontend)

Control Panel is wired to live `/api/control-plane/*` APIs with no mock data.

Implemented:

- live client in `src/services/controlPlaneService.js`
- live pages:
  - `src/layouts/control-panel/Overview.js`
  - `src/layouts/control-panel/Services.js`
  - `src/layouts/control-panel/ServiceDetail.js`
  - `src/layouts/control-panel/Logs.js`
  - `src/layouts/control-panel/Incidents.js`
  - `src/layouts/control-panel/Audit.js`
- reusable state/UI helpers:
  - `src/layouts/control-panel/components/ControlPanelState.js`
  - `src/layouts/control-panel/components/ServiceSelector.js`
  - `src/layouts/control-panel/components/LogBlock.js`

Guardrails in UI are in place:

- Control Panel visible only for `user.role === "admin"` (routes + sidenav + route redirect).
- Only allowed mutation exposed: `POST /api/control-plane/actions/scale`.
- Scale action restricted in UI to replicas `0` or `1` with typed service confirmation.

### 2) Relative API path strategy and local proxy

Frontend calls use relative `/api/...` paths for ingress compatibility.

Local dev proxy mapping exists in `src/setupProxy.js`:

- `/api/users` -> `http://localhost:3000`
- `/api/control-plane` -> `http://localhost:7100`
- `/api/orders` -> `http://localhost:3003`
- `/api/payment` -> `http://localhost:4000`
- `/api/products` -> `http://localhost:3005`
- `/api/search` -> `http://localhost:5003`

### 3) Frontend Jenkins/EKS deployment pipeline implemented

Added and validated:

- `Dockerfile` (Node build stage + nginx runtime stage)
- `nginx.conf` with SPA fallback (`try_files ... /index.html`)
- `k8s/frontend/deployment.yml`
- `k8s/frontend/service.yml`
- `k8s/frontend/ingress.yml`
- root `Jenkinsfile` frontend pipeline

Pipeline behavior:

- uses short git SHA image tags (no `latest`)
- builds and pushes with Buildah in Kubernetes Jenkins agents
- deploys to `prod` namespace
- waits for `kubectl rollout status deployment/frontend -n prod`
- ingress apply is conditional and now RBAC-aware

### 4) Orders payment-status source-of-truth fix

Fixed Order Details so payment status is read from payment-service lookup by order id.

Updated:

- `src/services/paymentService.js` (`getPaymentByOrderId`)
- `src/layouts/orders/index.js` (live payment status fetch + safe fallback states)
- `src/layouts/home/index.js` (removed stale import)

Behavior now:

- shows DB-backed payment status when available
- shows `Not Found` on payment 404
- shows `Unavailable` on other payment lookup errors
- no forced `"pending"` fallback on errors

### 5) Control Panel Resilience diagnostics page

Added a read-only Resilience tab/page wired to the backend route:

- `GET /api/control-plane/resilience`

Updated:

- `src/services/controlPlaneService.js` (`getResilience`)
- `src/layouts/control-panel/Resilience.js`
- `src/layouts/control-panel/index.js` (tab + nested route)

Behavior:

- renders healer-service `ServiceDown` policy safeguards
- renders per-service healer circuit breaker/rate-limit state
- renders retry and cooldown settings
- renders order-service -> product-service circuit breaker diagnostics
- renders product HTTP retry behavior
- renders manual scale guardrails
- shows API `warnings[]` as non-blocking warnings
- remains read-only with no new mutation controls

---

## Current Runtime Notes

1. Frontend deployment to EKS succeeded (`frontend` pod running in `prod`).
2. If ingress is not visible in `prod`, it may have been skipped due to Jenkins service account RBAC.
3. To fully automate ingress apply from Jenkins, grant ingress verbs in `prod` to `system:serviceaccount:jenkins:jenkins-deployer`.

---

## Known Follow-ups

1. Lockfile consistency:
   - Dockerfile currently uses `npm install --legacy-peer-deps`.
   - Preferred hardening: sync `package-lock.json` and switch back to `npm ci`.
2. Keep references updated to new `.context` file names in all future notes/prompts.
3. Optional: make namespace configurable in Jenkins if multi-namespace frontend deployment is needed later.

---

## Resume Checklist For Next Chat

1. Read:
   - `.context/Planbackend.md`
   - `.context/Planfrontend.md`
   - `.context/ProjectContext.md`
   - `AGENTS.md`
2. Check git status for pending file-name migration and frontend edits.
3. Decide whether to:
   - commit current frontend/Jenkins/payment/resilience fixes as-is, or
   - do a lockfile hardening pass before commit.
