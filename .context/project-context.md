# Self-Healing Cloud Platform - Project Context And Rules

> Last updated: 2026-04-29
> Purpose: source-of-truth project note for architecture, current state, naming, environments, deployment flow, observability, self-healing, known issues, and next work.

---

## 1. Project Goal

Build a production-grade Self-Healing Cloud Platform demonstrating backend engineering, DevOps, Kubernetes, AWS/EKS, CI/CD, observability, SRE practices, rollback, and controlled automation.

Current maturity:

```text
Detect -> Notify -> Heal -> Guardrail -> Audit -> Visualize
```

The platform already demonstrates:

- Self-monitoring through Prometheus metrics.
- Alerting through Prometheus, Alertmanager, and Slack.
- Controlled self-healing through healer-service.
- Audit history through PostgreSQL and healer `/history`.
- Git-versioned Grafana dashboard provisioning for service health and healer history.
- Jenkins-based build, promotion, and rollback.

---

## 2. Architecture

```text
Users / Postman
-> Public Ingress ELB
-> Kubernetes NGINX Ingress
-> Microservices in dev/test/prod
-> Kafka event streaming
-> PostgreSQL / Redis
-> Prometheus + Grafana + Alertmanager
-> healer-service
-> Kubernetes API
```

Planned Control Plane flow:

```text
admin user
-> prod-facing frontend Control Panel tab
-> control-plane-service
-> Kubernetes API / Prometheus / healer-service / controlplanedb
```

Main service flow:

```text
user-service
-> order-service
-> Kafka order_created topic
-> payment-service / search-service / product-service consumers
-> service DB writes + metrics
```

Self-healing flow:

```text
Prometheus ServiceDown alert
-> Alertmanager webhook
-> healer-service /heal
-> policy, cooldown, rate-limit, circuit-breaker checks
-> Kubernetes deployment get/patch
-> healing_actions audit table
-> Grafana healer dashboard
```

---

## 3. Environment Model

| Environment | Namespace | Notes |
|---|---|---|
| `local` | N/A | Docker Compose local development |
| `dev` | `dev` | integration and healer validation |
| `test` | `test` | staging/QA-like validation |
| `prod` | `prod` | production-like stable environment |

Shared infrastructure stays in `default` unless explicitly changed:

- Kafka
- Zookeeper
- PostgreSQL
- Prometheus
- Alertmanager
- healer-service

Do not move shared infrastructure into `dev`, `test`, or `prod` unless explicitly requested.

---

## 4. Services And Ports

| Service | Purpose | Namespace(s) | Port |
|---|---|---|---:|
| `user-service` | users/auth | dev/test/prod | 3000 |
| `order-service` | orders/Kafka producer | dev/test/prod | 3003 |
| `payment-service` | order consumer/payments | dev/test/prod | 4000 |
| `product-service` | products/inventory | dev/test/prod | 3005 |
| `search-service` | search/indexing | dev/test/prod | 5003 |
| `healer-service` | alert webhook and recovery | default | 7000 |
| `control-plane-service` | planned admin-only platform control/read model | monitoring | TBD |

Other ports:

- Kafka: `9092`
- Zookeeper: `2181`
- PostgreSQL: `5432`
- Prometheus: `9090`
- Alertmanager: `9093`
- Grafana: `80`
- Jenkins: `8080`

---

## 5. Kubernetes And Ingress

Application services run in:

- `dev`
- `test`
- `prod`

Shared/platform namespaces include:

- `default`
- `jenkins`
- `monitoring`
- `ingress-nginx`
- `kube-system`

Public API route pattern:

```text
/dev/api/...   -> dev namespace
/test/api/...  -> test namespace
/api/...       -> prod namespace
```

Keep backend public routes under `/api/...`:

- `/api/users`
- `/api/orders`
- `/api/payment`
- `/api/products`
- `/api/search`

If Express returns `Cannot GET` or `Cannot POST`, check ingress path mapping before changing service code.

---

## 6. Databases

Shared PostgreSQL instance is used by services.

| Database | Owner service |
|---|---|
| `userdb` | user-service |
| `orderdb` | order-service |
| `paymentdb` | payment-service |
| `productdb` | product-service |
| `searchdb` | search-service |
| `healerdb` | healer-service |
| `controlplanedb` | control-plane-service (planned) |

Known tables:

- `users`
- `orders`
- `payments`
- `products`
- `orders_search`
- `healing_actions`
- `control_plane_actions` (planned)

`healing_actions` fields:

```text
id, alert_name, namespace, deployment, action, result, reason, created_at
```

Planned `control_plane_actions` fields:

```text
id, user_id, user_email, namespace, service, action, requested_replicas, previous_replicas, result, reason, created_at
```

Database rules:

- Use raw SQL with `pg`.
- Do not introduce an ORM unless explicitly requested.
- Keep SQL parameterized.
- Do not create dev/test/prod database duplication unless explicitly requested.

Control Plane database rules:

- Create `controlplanedb` for `control-plane-service`.
- Use `control_plane_actions` to audit all manual Control Panel actions, including blocked and failed attempts.
- Do not store JWTs, kubeconfigs, tokens, secrets, or typed confirmation values in audit rows.

---

## 7. Kafka

Kafka runs as shared infrastructure in `default`.

Topics:

| Environment | Main topic | DLQ topic |
|---|---|---|
| local | `order_created_local` | `order_created_dlq_local` |
| dev | `order_created_dev` | `order_created_dlq_dev` |
| test | `order_created_test` | `order_created_dlq_test` |
| prod | `order_created` | `order_created_dlq` |

Consumer groups:

| Service | Dev | Test | Prod |
|---|---|---|---|
| payment-service | `payment-group-dev` | `payment-group-test` | `payment-group` |
| search-service | `search-group-dev` | `search-group-test` | `search-group` |
| product-service | `product-group-dev` | `product-group-test` | `product-group` |

Kafka topics and consumer groups must come from env vars:

```text
ORDER_CREATED_TOPIC
ORDER_CREATED_DLQ_TOPIC
KAFKA_CONSUMER_GROUP
```

Never hardcode topic or consumer group names in service code.

---

## 8. Deployment And Jenkins

Current delivery behavior:

```text
Git push
-> Jenkins
-> Buildah builds image
-> tag with short Git SHA
-> push to ECR
-> deploy to dev
-> deploy same image to test

promotion.env commit
-> Jenkins skips build
-> deploy existing image tag to prod
```

Git-controlled prod promotion through `jenkins/promotion.env` replaces Jenkins UI approval buttons.

Rules:

- One Jenkins job is preferred.
- Build once and promote the same image.
- Use short Git SHA tags for EKS deployments.
- Do not use `latest` for EKS app images.
- Use Buildah, not Docker daemon/socket builds, unless explicitly requested.
- Avoid parallel pod-heavy Jenkins stages because cluster pod capacity has been an issue.
- Normal service changes deploy to `dev` and `test`.
- Promote to `prod` by committing a confirmed `jenkins/promotion.env` request with the existing short Git SHA image tag.
- Jenkins runs automatically every 2 minutes; changed-file detection compares against `GIT_PREVIOUS_SUCCESSFUL_COMMIT` when Jenkins provides it to avoid repeating successful work.

Jenkins files:

- `Jenkinsfile`
- `jenkins/common.groovy`
- per-service Groovy files
- `jenkins/promotion.env`
- `jenkins/rollback.env`

Rollback is explicit through `jenkins/rollback.env`.
Promotion is explicit through `jenkins/promotion.env`.
Rollback and Jenkins promotion procedures are documented in:

```text
docs/rollback-runbook.md
docs/jenkins-promotion-runbook.md
```

---

## 9. Observability

Active source of truth:

```text
prometheus-values.yaml
```

Legacy/backup only:

```text
k8s/monitoring/alert-rules.yaml
```

Recent observability alignment is complete for `dev` and `prod` only:

- Prometheus scrapes app services in `dev` and `prod`.
- `test` scraping is intentionally excluded for now.
- Grafana alignment is provisioned for `dev` and `prod` unless explicitly changed.
- App targets use labels: `deployment`, `namespace`, `environment`, and `service`.
- Prometheus self-scrape must remain `localhost:9090`.

Grafana source of truth:

```text
k8s/monitoring/grafana-values.yaml
k8s/monitoring/grafana/
docs/grafana-runbook.md
```

Provisioned dashboard:

```text
Self-Healing Cloud Platform
```

Provisioned datasource UIDs:

```text
prometheus
healer-postgres
```

Grafana PostgreSQL datasource credentials come from Secret `grafana-postgres-datasource` in namespace `monitoring` with keys:

```text
GRAFANA_POSTGRES_USER
GRAFANA_POSTGRES_PASSWORD
```

Grafana persistence is currently disabled. This is acceptable for Git-provisioned dashboards, but UI-only changes can be lost when the Grafana pod is replaced.

Services expose `/metrics`.

HTTP metrics:

```text
http_requests_total
http_request_duration_seconds
```

Kafka metrics:

```text
kafka_messages_consumed_total
kafka_processing_errors_total
kafka_retry_attempts_total
kafka_dlq_messages_total
kafka_processing_duration_seconds
```

Alertmanager notes:

- Slack webhook must not be committed or printed.
- Use Kubernetes Secret `alertmanager-secrets` key `SLACK_WEBHOOK_URL`.
- Alertmanager does not expand `${SLACK_WEBHOOK_URL}` inside the config file.
- Helm may need `--server-side=true --force-conflicts` after manual `kubectl edit`.

---

## 10. Self-Healing

Current healer state:

- healer-service runs in `default`.
- healer-service listens on port `7000`.
- Alertmanager sends `ServiceDown` webhooks for `dev` and `prod`.
- `test` is intentionally excluded from healer automation.
- Healer RBAC permits only `get` and `patch` on deployments in `dev` and `prod`.
- Healer does not have permission to delete pods, mutate PVCs, restart Kafka/PostgreSQL, or delete namespaces.

Allowed ServiceDown policy:

```text
namespaces: dev, prod
deployments: user-service, order-service, payment-service, product-service, search-service
action: scale-or-restart
```

Behavior:

- If replicas are `0`, scale deployment to `1`.
- If replicas are already running, rollout restart.
- Record all success, blocked, and error outcomes in `healing_actions`.

Safety controls:

- allowlisted alerts
- allowlisted namespaces
- allowlisted deployments
- cooldown
- rate limiting
- circuit breaker
- retry
- audit history

Verified milestone:

- Prod `payment-service` was scaled to `0`.
- Healer automatically scaled it back to `1`.
- `/history` showed audit id `36` with `namespace=prod`, `deployment=payment-service`, `result=success`, and `reason=replicas were 0`.

Runbook:

```text
docs/healer-runbook.md
```

---

## 11. Control Plane Backend And Frontend Plans

Active handoffs:

```text
.context/control-plane-backend-plan.md
docs/control-plane-backend-plan.md
.context/control-plane-frontend-plan.md
docs/control-plane-frontend-plan.md
```

Planning rules:

- Backend implementation comes before frontend implementation.
- Frontend planning is now captured, but frontend implementation starts after backend behavior is verified.
- The frontend remains prod-facing and user-centric.
- The Control Panel will be hidden unless `user.role === "admin"`.
- Control Panel V1 is prod-focused only.
- Control Panel data must be live, not mocked.
- Mutation is limited to guarded scale `0` or `1` for allowlisted prod app deployments.

Existing frontend foundation:

```text
C:\Users\ranja\Documents\projects\cloudpulse-ui
```

Frontend plan:

- Preserve the Creative Tim Material Dashboard 2 React app.
- Normal users see sign in, sign up, home/categories, products by category, cart/checkout, orders, and profile.
- Admins see normal user pages plus a `Control Panel` top tab.
- Control Panel pages are Overview, Services, Logs, Incidents, and Audit.
- Frontend API integration should use prod ingress-relative `/api/...` paths when deployed.
- Auth must load profile after login so `user.role` can gate the Control Panel tab.

Planned `user-service` changes:

- Add `role VARCHAR(20) DEFAULT 'user'`.
- Include `role` in JWT payload.
- Include `role` in profile response.
- Keep registration default as `user`.
- Do not allow profile updates to change `role`.
- Bootstrap the first admin manually with SQL.

Planned new service:

```text
services/control-plane-service
```

Responsibilities:

- Admin JWT enforcement for all `/api/control-plane/*` routes.
- Live prod deployment and pod status.
- Separate service log viewer.
- Combined prod app service log viewer.
- Kubernetes events and diagnostics.
- Prometheus health and alert-style state.
- healer-service `/history` read model.
- Manual action audit through `controlplanedb.control_plane_actions`.

Planned prod-only RBAC for `control-plane-service`:

- `get/list/watch` deployments, pods, replicasets, and events in `prod`.
- `get` pods/log in `prod`.
- `patch` deployments in `prod`.
- No secrets access.
- No delete, create, namespace, PVC, Kafka, PostgreSQL application-data, Jenkins, Grafana, Prometheus, or Alertmanager mutation permissions.

Other phases are backlog/pipeline until backend implementation is verified:

- Frontend implementation and deployment integration.
- Demo polish and screenshots.
- Observability polish.
- Warm pause scripts.
- AI incident assistant and log analyzer.

---

## 12. Security

Never expose, print, commit, or reuse secrets:

- Slack webhooks
- JWT secrets
- AWS keys
- DB passwords
- GitHub tokens
- Jenkins secrets
- kubeconfigs
- Kubernetes tokens

Security follow-up state:

- The previously exposed Slack webhook has been rotated.
- If any webhook or secret is exposed again, rotate it immediately.

Use Kubernetes Secrets or Jenkins credentials for sensitive values.

---

## 13. Debugging Rules

Identify the failing layer first:

```text
code -> Docker -> Kubernetes -> Kafka -> PostgreSQL -> Prometheus -> Jenkins -> Ingress -> AWS/ECR/EKS
```

Prefer Bash commands in future instructions unless the user explicitly asks for PowerShell.

Common commands:

```bash
kubectl get pods -n <namespace>
kubectl logs deployment/<service> -n <namespace>
kubectl describe pod <pod> -n <namespace>
kubectl get svc -n <namespace>
kubectl get endpoints <service> -n <namespace>
kubectl rollout status deployment/<service> -n <namespace>
```

For Git Bash path conversion issues inside `kubectl exec`, use:

```bash
kubectl exec -it <pod> -n <namespace> -- sh -c "<command>"
```

---

## 14. Current Documentation

Important docs:

- `docs/architecture.md`
- `docs/healer-runbook.md`
- `docs/grafana-runbook.md`
- `docs/rollback-runbook.md`
- `docs/jenkins-promotion-runbook.md`
- `docs/control-plane-backend-plan.md`
- `docs/control-plane-frontend-plan.md`
- `.context/project-handoff.md`
- `.context/control-plane-backend-plan.md`
- `.context/control-plane-frontend-plan.md`

Context files:

- `AGENTS.md`
- `.context/project-context.md`
- `.context/control-plane-backend-plan.md`
- `.context/control-plane-frontend-plan.md`

---

## 15. Current Phase And Next Steps

Completed recently:

- Grafana provisioning and documentation/context updates were committed and pushed.
- Slack webhook rotation after prior exposure.
- Final prod healer + Slack alert validation.
- Observability alignment for `dev` and `prod`.
- Standard HTTP metrics across app services.
- Alertmanager route to healer on port `7000`.
- Dev/prod healer operations and prod RBAC.
- Prod self-healing validation.
- Healer runbook.
- Grafana dashboard and datasource provisioning for `dev` and `prod`.
- Grafana provisioned dashboard smoke validation.
- Rollback runbook.
- Jenkins promotion runbook and Git-controlled prod promotion flow.
- Git-controlled prod promotion was tested successfully.
- Services promoted through the new flow were verified healthy in `prod`.
- Baseline secrets, probes/resources, and SLO/alert hardening were completed per operator update.
- Control Plane frontend planning was captured for the existing `cloudpulse-ui` Creative Tim React app.

Active next phase:

1. Implement `user-service` role support and first-admin bootstrap documentation.
2. Create `services/control-plane-service`.
3. Add `controlplanedb` and `control_plane_actions`.
4. Add prod-only `control-plane-service` RBAC.
5. Implement live read-only Control Panel APIs.
6. Implement guarded prod scale `0/1` actions with typed confirmation and audit.
7. Verify auth, live data, logs, actions, and RBAC safety.
8. After backend behavior is verified, integrate the `cloudpulse-ui` frontend from `.context/control-plane-frontend-plan.md`.

Backlog/pipeline until the Control Plane backend is verified:

- Frontend implementation and deployment integration.
- Final project demo assets and README walkthrough.
- Screenshots for Grafana, Jenkins promotion, Slack alerting, healer history, and Control Panel.
- Demo polish.
- Observability polish, SLO dashboards, and alert noise tuning.
- Version dashboard in Grafana.
- Optional Grafana persistence decision if UI-only editing becomes important.
- Warm pause scripts for demo lifecycle.
- Network policies and deeper RBAC review.
- Optional Jenkins UI approval gates only if fixed and explicitly preferred over Git-controlled prod promotion.
- Enterprise access layer with domain and HTTPS.
- AI incident assistant.
- Log analyzer.
- AI cost advisor.
- RAG over runbooks/docs/incidents.
- GitOps with ArgoCD only if it adds value later.

---

## 16. Forbidden Unless Explicitly Asked

Do not:

- introduce an ORM
- expose Kafka/PostgreSQL publicly
- use `latest` for EKS app deployments
- hardcode dev/test/prod values permanently in manifests
- create duplicate env YAMLs when Jenkins substitution is the chosen path
- bypass Jenkins promotion flow
- add `test` Prometheus/Grafana coverage unless requested
- store Grafana datasource credentials in committed values files
- remove observability or metrics
- delete namespaces or shared infrastructure casually
- commit secrets
- grant healer broad cluster permissions
- grant control-plane-service secret access, delete permissions, namespace permissions, or broad cluster permissions
- replace the architecture without discussion

---

## 17. One-Line Summary

This project is a versioned, Jenkins-driven, multi-environment EKS microservices platform with Kafka event streaming, Prometheus/Grafana/Alertmanager observability, Git-provisioned Grafana dashboards, Slack alerting, rollback, verified policy-based self-healing in `dev` and `prod` with audit history, an active next phase to implement a narrowly guarded admin-only Control Plane backend, and a captured frontend plan for the existing `cloudpulse-ui` Creative Tim React app.
