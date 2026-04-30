---
title: Control Plane Backend Plan
status: in-progress
updated: 2026-04-30
tags:
  - control-plane
  - backend
  - planning
  - self-healing-platform
---

# Control Plane Backend Plan

This is the docs-facing planning and implementation reference for the active backend verification phase.

Canonical planning handoff:

```text
.context/control-plane-backend-plan.md
```

## Summary

The active area is a new `control-plane-service` for an admin-only Control Panel inside the main prod-facing frontend. Core backend implementation is now in place; frontend live data/action integration proceeds next using `.context/control-plane-frontend-plan.md`.

V1 goals:

- Add `role` support to `user-service`. Done locally and verified.
- Hide the Control Panel unless `user.role === "admin"`.
- Create `services/control-plane-service`. Implemented and deployed; local container runs on port `7100` for API tests.
- Use live prod data, not mocks.
- Show prod deployments, service health, separate logs, combined logs, Kubernetes events, Prometheus health, healer history, and manual action audit.
- Allow guarded Down/Up demo actions by scaling allowlisted prod app deployments to `0` or `1`.
- Audit all manual actions.

## Current Progress

- `user-service` role support is implemented: role column, default `user`, role in JWT, role in profile response, and profile updates do not change role.
- A first admin was bootstrapped manually in local PostgreSQL with SQL.
- `services/control-plane-service` exists with Express, CommonJS, JWT auth, admin-only middleware, service allowlist, `/health`, `/metrics`, and implemented protected `/api/control-plane/*` APIs.
- `docker-compose.yml` includes `control-plane-service` on `7100:7100` with frontend CORS origin `http://localhost:3001`.
- `controlplanedb` and `control_plane_actions` initialization is implemented in service startup.
- Kubernetes client wiring for prod deployments/pods/ReplicaSets/events/logs is implemented.
- Prometheus and healer-service read integrations are implemented.
- Guarded scale `0/1` with typed confirmation and audit writes is implemented.
- Kubernetes manifests, prod-only RBAC, and Jenkins deployment integration are implemented for `control-plane-service`.
- Local `product-service` and `order-service` now start HTTP before Kafka connection, so read endpoints remain available while Kafka is warming up.
- Separate frontend repo `cloudpulse-ui` now has UI-only Control Panel scaffolding. Live data wiring and guarded action UI remain deferred until backend APIs are implemented.

## Safety Boundary

The Control Plane must remain prod-focused and narrowly scoped:

- `prod` only in UI and API.
- allowlisted app services only.
- scale replicas must be exactly `0` or `1`.
- typed confirmation must exactly match the service name.
- no secret access.
- no pod deletion.
- no namespace deletion.
- no Kafka, PostgreSQL application-data, or PVC mutation.
- no Jenkins, Grafana, Prometheus, or Alertmanager mutation.
- no broad cluster permissions.

## Implemented Route Surface

Public endpoints:

| Method | Path | Current behavior |
|---|---|---|
| `GET` | `/health` | Returns service health |
| `GET` | `/metrics` | Returns Prometheus metrics |

Protected admin endpoints under `/api/control-plane`:

| Method | Path | Current behavior |
|---|---|---|
| `GET` | `/api/control-plane/status` | Implemented; returns service readiness, prod namespace scope, and allowlisted deployments |
| `GET` | `/api/control-plane/overview` | Implemented; returns prod overview (deployments, health, alerts, recent healing/manual actions) |
| `GET` | `/api/control-plane/deployments` | Implemented; returns allowlisted prod deployment status |
| `GET` | `/api/control-plane/services/:service` | Implemented with allowlist guard; returns per-service diagnostics |
| `GET` | `/api/control-plane/healing-history` | Implemented; returns healer history scoped to prod |
| `GET` | `/api/control-plane/alerts` | Implemented; returns Prometheus alert-style state scoped to prod/allowlist |
| `GET` | `/api/control-plane/logs` | Implemented; returns bounded combined recent logs |
| `GET` | `/api/control-plane/logs/:service` | Implemented with allowlist guard; returns bounded recent logs for one service |
| `GET` | `/api/control-plane/events/:service` | Implemented with allowlist guard; returns Kubernetes events |
| `POST` | `/api/control-plane/actions/scale` | Implemented; enforces prod+allowlist+`0/1`+typed confirmation and writes audit records |
| `GET` | `/api/control-plane/actions` | Implemented; returns paginated manual action audit history |

All `/api/control-plane/*` routes require a valid JWT and `role === "admin"`.

## Deferred Docs

Create these when route behavior and operational procedures are stable enough to publish:

- `docs/control-plane-runbook.md`
- `docs/control-plane-api.md`

## Next Backend Work

- Complete RBAC safety verification evidence (`kubectl auth can-i` checks and captured outputs).
- Publish `docs/control-plane-runbook.md` and `docs/control-plane-api.md`.
- Start frontend live Control Panel integration in `cloudpulse-ui` against implemented backend APIs.
