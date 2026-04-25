# 🖥️ Self-Healing Cloud Platform — Frontend

> Control Plane UI for monitoring, managing, and operating the Self-Healing Cloud Platform in real time.

![Status](https://img.shields.io/badge/status-in--development-orange)
![Phase](https://img.shields.io/badge/phase-9%20%E2%80%94%20Control%20Plane%20UI-blue)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Tailwind-blueviolet)
![Backend](https://img.shields.io/badge/backend-Self--Healing%20Cloud%20Platform-green)

---

## 📖 Overview

The frontend is the **Control Plane UI** for the Self-Healing Cloud Platform — a real-time operations dashboard that gives engineers and operators full visibility into the health, activity, and behavior of all running microservices.

Instead of SSH-ing into a cluster or reading raw Prometheus output, operators get a single interface to:

- See every service and whether it is up or down
- Watch live Kafka event flow across the system
- Read and acknowledge active alerts
- Trigger restarts or scaling actions directly from the browser
- Track the full order lifecycle end-to-end

This UI is the human face of a platform that is evolving toward self-healing — and when the healer service acts automatically, this dashboard shows you exactly what it did and why.

---

## ✨ Features

### Phase 9 (Current Scope)
- **Service Health Dashboard** — live status of all five microservices with uptime indicators
- **Alert Feed** — real-time view of active Prometheus alerts with severity and timestamp
- **Service Actions** — restart a deployment or scale replicas directly from the UI
- **Kafka Event Monitor** — live stream of events flowing through topics with consumer lag indicators
- **Order Tracker** — trace a single order through its full lifecycle (order → payment → search index)

### Phase 10 (Self-Healing UI — Upcoming)
- **Healer Activity Log** — audit trail of every automated recovery action taken
- **Recovery Policy View** — see what rules are configured for each failure type
- **Manual Override** — approve, reject, or delay a pending healer action
- **Incident Timeline** — alert fired → healer acted → service recovered, visualized on a timeline

### Future
- **Anomaly Detection Panel** — AI-flagged metric anomalies before alerts fire
- **Cost Optimization View** — resource usage vs spend per service
- **Multi-cluster View** — monitor dev, test, and prod side by side

---

## 🏗️ UI Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Control Plane UI                   │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Service    │  │   Alert      │  │   Kafka    │  │
│  │  Dashboard  │  │   Feed       │  │   Monitor  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Order     │  │   Healer     │  │  Service   │  │
│  │   Tracker   │  │   Activity   │  │  Actions   │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└──────────────────────────┬──────────────────────────┘
                           │ REST / WebSocket
                    ┌──────┴──────┐
                    │  Backend    │
                    │  API        │
                    └──────┬──────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    Kubernetes API    Prometheus API    Kafka Metrics
```

---

## 🧩 Pages & Views

### `/dashboard` — Service Overview
The landing page. Shows all five services as health cards:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ● user-service   │  │ ● order-service  │  │ ● payment-service│
│ Running  ✅      │  │ Running  ✅      │  │ Down     ❌      │
│ Pods: 1/1        │  │ Pods: 1/1        │  │ Pods: 0/1        │
│ [Restart] [Logs] │  │ [Restart] [Logs] │  │ [Restart] [Logs] │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### `/alerts` — Alert Feed
Live list of active Prometheus alerts. Each alert shows:
- Alert name and severity (`warning` / `critical`)
- Which service triggered it
- How long it has been firing
- Link to relevant Grafana dashboard

### `/kafka` — Kafka Event Monitor
- Topic list with message count and consumer lag per group
- Live event stream — shows `ORDER_CREATED` events as they flow through
- DLQ monitor — flags messages stuck in dead letter queues

### `/orders/:id` — Order Tracker
Trace a single order through its full journey:

```
[Order Created] ──► [Kafka Published] ──► [Payment Processed] ──► [Search Indexed]
     ✅                    ✅                      ✅                      ✅
  12:01:04              12:01:04               12:01:05               12:01:05
```

### `/healer` — Healer Activity *(Phase 10)*
Audit log of every automated recovery action:

```
12:04:22  payment-service  Pod crash detected  →  rollout restart triggered  ✅ Recovered
11:58:10  search-service   Consumer lag spike  →  scaled to 2 replicas       ✅ Resolved
```

### `/settings` — Platform Config
- View active namespaces (`dev` / `test` / `prod`)
- Inspect currently deployed image SHA per service
- View Slack webhook status

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State management | React Query (server state) + Zustand (UI state) |
| Charts & graphs | Recharts |
| Real-time updates | WebSocket / polling |
| HTTP client | Axios |
| Routing | React Router v6 |
| Icons | Lucide React |
| Build tool | Vite |
| Containerization | Docker |
| Deployment | Kubernetes (EKS) via Helm |

---

## 📁 Project Structure

```
frontend/
├── public/
├── src/
│   ├── api/                  # API client functions (Axios)
│   │   ├── services.ts       # Service health endpoints
│   │   ├── alerts.ts         # Prometheus alert endpoints
│   │   ├── kafka.ts          # Kafka metrics endpoints
│   │   └── orders.ts         # Order tracking endpoints
│   ├── components/
│   │   ├── ServiceCard/      # Health card per microservice
│   │   ├── AlertFeed/        # Live alert list
│   │   ├── KafkaMonitor/     # Topic + consumer lag view
│   │   ├── OrderTimeline/    # Order lifecycle trace
│   │   ├── HealerLog/        # Healer activity audit
│   │   └── shared/           # Buttons, badges, layout
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Alerts.tsx
│   │   ├── Kafka.tsx
│   │   ├── OrderTracker.tsx
│   │   ├── Healer.tsx
│   │   └── Settings.tsx
│   ├── hooks/                # Custom React hooks
│   ├── store/                # Zustand global state
│   ├── types/                # TypeScript interfaces
│   ├── utils/                # Helpers and formatters
│   ├── App.tsx
│   └── main.tsx
├── Dockerfile
├── docker-compose.yml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## ⚙️ Local Development

### Prerequisites

- Node.js 18+
- Backend platform running (Docker Compose or Kubernetes)

### Install & Run

```bash
git clone https://github.com/<your-username>/self-healing-cloud-platform.git
cd self-healing-cloud-platform/frontend

npm install
npm run dev
```

App runs at `http://localhost:5173`

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_PROMETHEUS_URL=http://localhost:9090
VITE_WS_URL=ws://localhost:3000
VITE_ENV=local
```

---

## 🐳 Docker

### Build & Run

```bash
docker build -t self-healing-cloud-platform-frontend:local .
docker run -p 5173:5173 self-healing-cloud-platform-frontend:local
```

### With Docker Compose (full stack)

```bash
# From project root
docker-compose up --build
```

---

## 🚢 Deploy to Kubernetes

```bash
# Tag and push to ECR
docker tag self-healing-cloud-platform-frontend:local \
  <ecr-url>/frontend:<git-sha>
docker push <ecr-url>/frontend:<git-sha>

# Apply manifests
kubectl apply -f k8s/frontend/deployment.yml
kubectl apply -f k8s/frontend/service.yml

# Verify
kubectl rollout status deployment/frontend -n dev
kubectl logs deployment/frontend -n dev --tail=50
```

---

## 🔗 Backend API Contract

The frontend consumes these backend endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/services` | GET | Health status of all microservices |
| `/api/services/:name/restart` | POST | Trigger rollout restart |
| `/api/services/:name/scale` | POST | Scale replicas |
| `/api/alerts` | GET | Active Prometheus alerts |
| `/api/kafka/topics` | GET | Kafka topic list and consumer lag |
| `/api/kafka/events` | WS | Live event stream |
| `/api/orders/:id/trace` | GET | Full order lifecycle trace |
| `/api/healer/log` | GET | Healer action audit log |

> The frontend never calls Prometheus, Kafka, or Kubernetes APIs directly. All cluster interaction goes through the backend API layer.

---

## 🧠 Design Principles

- **Frontend knows nothing about the cluster** — all Kubernetes and Prometheus calls go through the backend API
- **Read-heavy, action-light** — the UI primarily observes; destructive actions require confirmation
- **Real-time where it matters** — service status and alerts refresh automatically; non-critical views are on-demand
- **Environment-aware** — the UI clearly shows which environment (dev / test / prod) it is connected to at all times

---

## 🗺️ Roadmap

| Phase | Feature | Status |
|---|---|---|
| 9 | Service health dashboard | 🔜 In Development |
| 9 | Alert feed | 🔜 In Development |
| 9 | Service restart / scale actions | 🔜 In Development |
| 9 | Kafka event monitor | 🔜 In Development |
| 9 | Order lifecycle tracker | 🔜 In Development |
| 10 | Healer activity log | ⏳ Planned |
| 10 | Recovery policy viewer | ⏳ Planned |
| 10 | Manual override for healer actions | ⏳ Planned |
| 11 | Anomaly detection panel | ⏳ Future |
| 11 | Cost optimization view | ⏳ Future |

---

## 👤 Author

**Praveen Ranjan** — built as part of the Self-Healing Cloud Platform project, a hands-on systems engineering effort to demonstrate production-grade cloud infrastructure, observability, and self-healing architecture.

- GitHub: [@colonelEnigma](https://github.com/colonelEnigma)