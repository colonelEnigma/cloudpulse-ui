# CloudPulse UI

Frontend application for the CloudPulse platform.

## Canonical Repo

- Local path: `C:\Users\ranja\Documents\projects\cloudpulse-ui`
- This repo is the source of truth for UI implementation and frontend docs.

## Stack

- React + Vite
- Tailwind CSS
- shadcn/ui
- React Router

## Core Areas

- Shop experience: auth, catalog, cart, checkout, orders.
- Admin Control Panel (role-gated):
  - `/admin/overview`
  - `/admin/deployments`
  - `/admin/services/:service`
  - `/admin/logs`
  - `/admin/incidents`
  - `/admin/resilience`
  - `/admin/ai`
  - `/admin/audit`

## Control Plane Rules

- Admin views are prod-focused and live-data-only.
- Only allowed mutation is guarded scale to replicas `0` or `1` via:
  - `POST /api/control-plane/actions/scale`
- Typed confirmation must exactly match service name.
- No secrets/delete/unsafe mutation paths in UI.

## Local Run

```bash
npm install
npm run dev
npm run build
```

## Important Docs

- `AGENTS.md` - UI working rules and constraints.
- `.context/ProjectContext.md` - shared frontend/backend context.
- `.context/Planbackend.md` - backend contract and integration status.
