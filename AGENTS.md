# UI Repository Guidelines

## Scope

This `AGENTS.md` governs work in the UI app.

Primary UI direction:
- React + `shadcn/ui` + Tailwind.
- Shop flows plus admin Control Panel.
- Admin views are prod-focused and use live data (no mocks for control-plane screens).

## Current Status

Implemented areas include:
- Shop: auth, products, category filtering, cart, checkout, orders list/detail.
- Theme: light/dark + mobile navigation.
- Admin routes:
  - `/admin/overview`
  - `/admin/deployments`
  - `/admin/services/:service`
  - `/admin/logs`
  - `/admin/incidents`
  - `/admin/resilience`
  - `/admin/ai`
  - `/admin/audit`

## Non-Negotiable Admin Rules

- Admin routing must stay role-gated in UI (`role === "admin"`), with backend as final enforcement.
- Keep Control Panel prod-only and live-data-only.
- Only allowed mutation is guarded scale for allowlisted prod deployments:
  - endpoint: `POST /api/control-plane/actions/scale`
  - replicas allowed: `0` or `1` only
  - typed confirmation required (must match service name exactly)
  - show audit feedback (`auditId`, `auditedAt`, previous/requested replicas, `changed`)
- Do not add secret access, delete actions, or broader mutation paths.

## API / Routing Model

Local dev model:
- Shop services:
  - users: `http://localhost:3000`
  - orders: `http://localhost:3003`
  - payment: `http://localhost:4000`
  - products: `http://localhost:3005`
  - search: `http://localhost:5003`
- Control Plane proxy:
  - `/api/control-plane/*` -> `http://localhost:18080`
- AI proxy:
  - `/api/control-plane/ai/*` -> `http://localhost:7100`

Dev proxy env vars:
- `CONTROL_PLANE_PROXY_TARGET`
- `CONTROL_PLANE_AI_PROXY_TARGET`
- `PROD_INGRESS_LOCAL_PORT`

## Production Build Invariant

- API bases must remain relative (`""`) in production builds.
- Never embed `localhost:*` URLs in built output.

Recommended check:
- `npm run build`
- `rg -n "localhost:(3000|3003|4000|3005|5003|7100|18080)" dist`
- Expected: no matches.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`

`npm run dev` uses `scripts/start-dev.cjs` and may auto-start ingress port-forward unless disabled.

## Implementation Notes

- Keep section-level descriptive text in admin pages to explain operator intent.
- Logs page must support:
  - all-services shape (`services[].entries[]`)
  - single-service shape (`entries[]`)
- For long diagnostic text (JSON-ish values), ensure wrapping (`break-words`) to avoid overflow.

