# Control Plane Backend Plan

Last updated: 2026-04-29

Status: active backend implementation handoff. Backend implementation comes before frontend implementation; frontend planning is captured in `.context/control-plane-frontend-plan.md`.

## Purpose

The next phase is a prod-facing frontend with an admin-only Control Panel tab. The Control Panel is backed by a new `control-plane-service` that reads live platform state and supports tightly guarded demo actions against prod application deployments.

This is not a mock UI phase. The Control Panel should show real prod deployment status, logs, alerts, healing history, and manual action audit records.

## Agreed Decisions

- The main frontend remains prod-facing for normal users.
- The Control Panel is part of the main frontend but hidden unless `user.role === "admin"`.
- Backend implementation must be completed and verified before frontend implementation starts.
- Frontend implementation should consume `.context/control-plane-frontend-plan.md` after this backend contract is available.
- Control Panel V1 is prod-focused only.
- Control Panel data is live, not mocked.
- V1 mutation is limited to scaling allowlisted prod app deployments to `0` or `1`.
- Down/Up actions are accepted for demo purposes but must require typed confirmation.
- Every manual action must be audited.
- Other services do not need V1 feature changes except `user-service` role support.

## Existing Service Changes

### user-service

Planned changes:

- Add `role VARCHAR(20) DEFAULT 'user'` to the `users` table.
- Keep registration default as `user`.
- Include `role` in the JWT payload.
- Include `role` in the profile response.
- Do not allow profile update endpoints to change `role`.
- Bootstrap the first admin manually with SQL after deployment.

Example first-admin bootstrap:

```sql
UPDATE users
SET role = 'admin'
WHERE email = '<admin-email>';
```

### Other Existing Services

No required V1 changes are planned for:

- `order-service`
- `payment-service`
- `product-service`
- `search-service`
- `healer-service`

The Control Plane should read existing service state through Kubernetes, Prometheus, healer-service `/history`, and its own audit database.

## New Service

Create:

```text
services/control-plane-service
```

Expected stack:

- Node.js
- Express
- CommonJS
- `pg` for PostgreSQL access
- Kubernetes API client for live cluster state
- HTTP client for Prometheus and healer-service reads

Auth model:

- All `/api/control-plane/*` routes require a valid user JWT.
- All `/api/control-plane/*` routes require `role === "admin"`.
- Normal users must receive a denied response for all Control Panel APIs.

Primary integrations:

- Kubernetes API for prod deployments, pods, ReplicaSets, events, and logs.
- Prometheus for prod service health and alert-style status.
- healer-service `/history` for self-healing audit history.
- `controlplanedb` for manual Control Panel action audit.

## API Sketch

All routes are under:

```text
/api/control-plane
```

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/control-plane/overview` | Summary of prod platform health, service counts, degraded services, active alerts, and recent actions |
| `GET` | `/api/control-plane/deployments` | Prod app deployments with image tag, desired replicas, ready replicas, pod readiness, and age |
| `GET` | `/api/control-plane/services/:service` | One prod service detail view with deployment, pods, image, events, health, and recent logs |
| `GET` | `/api/control-plane/healing-history` | Recent healer actions from healer-service `/history`, filtered to prod where possible |
| `GET` | `/api/control-plane/alerts` | Prometheus-derived prod alert and health state |
| `GET` | `/api/control-plane/logs/:service` | Recent logs for one allowlisted prod app service |
| `GET` | `/api/control-plane/logs` | Combined recent logs for all allowlisted prod app services |
| `GET` | `/api/control-plane/events/:service` | Recent Kubernetes events and diagnostics for one allowlisted prod app service |
| `POST` | `/api/control-plane/actions/scale` | Guarded Down/Up demo action for prod service scale `0` or `1` |
| `GET` | `/api/control-plane/actions` | Manual Control Panel action audit history |

Example scale request:

```json
{
  "namespace": "prod",
  "service": "payment-service",
  "replicas": 0,
  "confirmation": "payment-service"
}
```

Rules for the scale endpoint:

- `namespace` must be exactly `prod`.
- `service` must be an allowlisted app deployment.
- `replicas` must be exactly `0` or `1`.
- `confirmation` must exactly match the service name.
- The service records previous replicas before patching.
- Success, blocked, and error results are all written to audit history.

## Allowlisted App Services

Control Plane V1 may read and scale only:

- `user-service`
- `order-service`
- `payment-service`
- `product-service`
- `search-service`

Do not expose generic deployment mutation in V1.

## New Database

Create:

```text
controlplanedb
```

Create audit table:

```text
control_plane_actions
```

Planned fields:

```text
id
user_id
user_email
namespace
service
action
requested_replicas
previous_replicas
result
reason
created_at
```

Audit requirements:

- Record successful actions.
- Record blocked actions.
- Record Kubernetes/API errors.
- Include the authenticated admin identity.
- Do not store JWTs, tokens, kubeconfigs, secrets, or typed confirmation values.

## Kubernetes Deployment

Deploy `control-plane-service` in:

```text
monitoring
```

Reasoning:

- It is an operational service, not a customer-facing app service.
- It needs access to observability and cluster diagnostics.
- The UI is prod-facing, but the service itself belongs with platform tooling.

## Kubernetes RBAC

RBAC must be scoped to prod only.

Required read permissions in namespace `prod`:

- `get/list/watch` deployments
- `get/list/watch` replicasets
- `get/list/watch` pods
- `get/list/watch` events
- `get` pods/log

Required mutation permission in namespace `prod`:

- `patch` deployments

Forbidden permissions:

- No secrets access.
- No pod deletion.
- No deployment delete/create.
- No namespace permissions.
- No PVC mutation.
- No Kafka mutation.
- No PostgreSQL application-data mutation; only `control_plane_actions` audit writes are allowed.
- No Jenkins, Grafana, Prometheus, or Alertmanager mutation.
- No broad cluster-admin or cluster-wide write permissions.

## Safety Rules

- UI must show prod only.
- API must enforce prod only.
- Services must be allowlisted.
- Scale mutations must allow only replicas `0` and `1`.
- Typed confirmation must exactly match the service name.
- Manual actions must be audited even when blocked.
- The service must not expose raw Kubernetes write access.
- The service must not provide pod deletion, namespace deletion, secret reads, Kafka mutation, PostgreSQL application-data mutation, PVC mutation, Jenkins mutation, Grafana mutation, Prometheus mutation, or Alertmanager mutation endpoints.

## Live Data Views

V1 should support:

- Overview of prod service health.
- Deployment list with desired, ready, available, image tag, and pod status.
- Single service diagnostics.
- Separate recent log viewer for one prod service.
- Combined recent log viewer for all prod app services.
- Kubernetes events and failure diagnostics.
- Prometheus health and alert-style state.
- Healer history.
- Manual Control Panel action audit.

Log behavior:

- V1 can return recent logs rather than live streaming logs.
- Logs should be bounded by service allowlist, namespace `prod`, and reasonable line limits.
- Combined logs should identify service and pod for each entry.

## Future Implementation Test Plan

Auth:

- Normal user cannot see or use Control Panel APIs.
- Admin JWT can access Control Panel APIs.

Live data:

- Deployment endpoint returns prod services, image tags, replicas, and pod readiness.
- Prometheus health reflects prod service health.
- Healer history returns prod actions.

Logs:

- Service log endpoint returns recent logs for one prod service.
- Combined log endpoint returns recent logs for all prod app services.

Actions:

- Down button scales a prod service to `0` only with typed confirmation.
- Up button scales a prod service to `1` only with typed confirmation.
- Invalid service, namespace, replica value, or confirmation is blocked and audited.
- Audit records success, blocked, and error outcomes.

Safety:

- No endpoint can mutate Kafka, PostgreSQL application data, PVCs, namespaces, pods, secrets, Jenkins, Grafana, Prometheus, or Alertmanager.
- RBAC verification confirms no secret access and no delete permission.

## Deferred

These are intentionally outside the immediate backend planning scope:

- Frontend implementation.
- `docs/control-plane-runbook.md`.
- `docs/control-plane-api.md`.
- Warm pause scripts.
- Demo screenshot polish.
- Observability polish.
- AI incident assistant and log analyzer.
