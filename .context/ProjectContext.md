# ProjectContext

Shared context file. Lives at `.context/ProjectContext.md` in both the frontend and backend repositories.

---

## What Is This Project

CloudPulse is a prod-facing e-commerce platform with a self-healing infrastructure layer. Normal users can browse products, manage a cart, place orders, and view payment status. Admins get an additional **Control Panel** — a live operational console for monitoring prod Kubernetes deployments, viewing logs/alerts/healer history, and performing tightly guarded scale actions with full audit trails.

---

## Repositories

| Repo | Purpose |
|---|---|
| `cloudpulse-ui` | Frontend — React app (Material Dashboard 2) |
| Backend repo | All backend microservices including `control-plane-service` |

Frontend local path: `C:\Users\ranja\Documents\projects\cloudpulse-ui`

---

## Services

| Service | Description | Namespace |
|---|---|---|
| `user-service` | Auth, JWT, user profile, role management | `prod` |
| `order-service` | Order management | `prod` |
| `payment-service` | Payment processing | `prod` |
| `product-service` | Product catalog | `prod` |
| `search-service` | Search functionality | `prod` |
| `healer-service` | Self-healing automation; exposes `/history` endpoint | `prod` |
| `control-plane-service` | Admin-only Control Panel backend | `monitoring` |

---

## Ports

| Service | Local Port |
|---|---|
| `control-plane-service` | `7100` (Docker Compose: `7100:7100`) |
| `cloudpulse-ui` | `3001` (also used as CORS origin in `control-plane-service`) |

---

## Databases

| Database | Used By | Notes |
|---|---|---|
| App DB (existing) | `user-service` | `users` table has `role VARCHAR(20) DEFAULT 'user'` |
| `controlplanedb` | `control-plane-service` | Audit DB; initialized on service startup |

### `control_plane_actions` schema (in `controlplanedb`)

```
id, user_id, user_email, namespace, service, action,
requested_replicas, previous_replicas, result, reason, created_at
```

> Do not store JWTs, tokens, kubeconfigs, secrets, or typed confirmation values in this table.

---

## Infrastructure & Tools

| Tool | Role |
|---|---|
| **Kubernetes** | Orchestration; `prod` namespace for app services, `monitoring` for `control-plane-service` |
| **Prometheus** | Metrics and alert-style health state for prod services |
| **Kafka** | Messaging (used by `order-service`, `product-service`) |
| **Jenkins** | CI/CD; deployment integration implemented for `control-plane-service` |
| **Docker Compose** | Local dev environment |

---

## Tech Stack

### Backend (`control-plane-service`)
- Node.js + Express (CommonJS)
- `pg` for PostgreSQL
- Kubernetes API client
- HTTP client for Prometheus and `healer-service` reads
- JWT auth with admin-only middleware and service allowlist middleware

### Frontend (`cloudpulse-ui`)
- React 18
- Material UI 5 (Creative Tim Material Dashboard 2)
- Create React App / `react-scripts`
- `axios` for API calls
- `react-router-dom` for routing

---

## Auth Model

- JWT is issued by `user-service` on login and includes `role`.
- `role` is also returned by `GET /api/users/profile`.
- `role` cannot be changed via profile update endpoints.
- Admin bootstrap requires a manual SQL run after DB setup:

```sql
UPDATE users SET role = 'admin' WHERE email = '<admin-email>';
```

- All `/api/control-plane/*` routes require a valid JWT **and** `role === "admin"`.
- Normal users receive a denied response for all Control Panel APIs — frontend hiding is UX only.

---

## Control Plane Allowlisted Services (V1)

Only these services can be read or scaled via the Control Panel:

- `user-service`
- `order-service`
- `payment-service`
- `product-service`
- `search-service`

---

## Kubernetes RBAC (`control-plane-service`)

Scoped to namespace `prod` only.

**Allowed reads:** `get/list/watch` on deployments, replicasets, pods, events; `get` on pods/log.

**Allowed mutation:** `patch` deployments only (scale to `0` or `1` for allowlisted services).

**Forbidden:** secrets access, pod/deployment delete or create, namespace permissions, PVC mutation, Kafka mutation, PostgreSQL app-data mutation, Jenkins/Grafana/Prometheus/Alertmanager mutation, broad cluster-admin or cluster-wide write permissions.

---

## Safety Rules (Non-negotiable)

- API and UI must enforce `prod` namespace only.
- Scale replicas must be exactly `0` or `1`.
- Typed confirmation must exactly match the service name.
- All manual actions must be audited — including blocked and errored ones.
- No generic Kubernetes mutation exposed anywhere.