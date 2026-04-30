# Repository Guidelines

## Project Structure & Module Organization

This is a Create React App dashboard built with React 18, Material UI, Creative Tim components, Axios, React Router, and Socket.IO. Application code lives in `src/`: `App.js` wires providers and routing, `routes.js` defines sidebar/page routes, `layouts/` contains route-level screens, `components/` contains shared `MD*` primitives, `examples/` holds dashboard template widgets, `services/` wraps API calls, and `context/`/`auth/` manage state and authentication. Static browser assets are in `public/`; theme assets and images are in `src/assets/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm start`: run the local CRA dev server, usually at `http://localhost:3000`.
- `npm run build`: create the production bundle in `build/`.
- `npm test -- --watchAll=false`: run the Jest test suite once in CI-style mode.
- `docker build -t cloudpulse-ui .`: build the nginx-served production image defined by `Dockerfile`.

Avoid `npm run eject` unless the team has agreed to own the generated CRA configuration.

## Coding Style & Naming Conventions

Use JavaScript/JSX with 2-space indentation, semicolons, double quotes, `printWidth: 100`, and ES5 trailing commas, matching `.prettierrc.json`. ESLint is configured in `.eslintrc.json`; check code with `npx eslint src --ext .js,.jsx` before larger changes. Keep component folders PascalCase, such as `MDButton/`, and service modules camelCase, such as `orderService.js`. Prefer existing `MDBox`, `MDTypography`, and theme tokens over ad hoc styles.

## Testing Guidelines

CRA provides Jest and React Testing Library support, but this repository currently has no committed `*.test.*` files. Add tests beside changed code using `ComponentName.test.js` or `serviceName.test.js`. Mock Axios clients and Socket.IO connections in service tests, and cover routing, authentication state, and error states for new screens. Run `npm test -- --watchAll=false` before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short, plain commit subjects such as `updating readme`; keep new subjects concise and imperative, optionally scoped, for example `orders: handle socket reconnects`. Pull requests should include a summary, linked issue when available, screenshots for UI changes, notes for `src/config.js` endpoint changes, and verification commands, especially `npm run build` and tests.

## Security & Configuration Tips

Do not commit secrets or environment-specific credentials. Current service base URLs are hardcoded in `src/config.js` for local development; document any endpoint changes in the PR and keep API access behind `src/services/` rather than scattering raw URLs through screens.


## Implementation rules:
- Preserve the Creative Tim Material Dashboard foundation.
- Main app is user-centric: auth, products, cart/checkout, orders, profile.
- Admins see user pages plus an admin-only `Control Panel` top tab.
- Hide Control Panel unless `user.role === "admin"`.
- Backend still enforces admin access; frontend hiding is UX only.
- Use live backend data only, no mocks for final Control Panel.
- Use ingress-relative `/api/...` paths for deployed API calls.
- Control Panel uses `/api/control-plane/*`.
- Do not add UI controls for secrets, deletes, pod deletion, namespace/PVC/Kafka/PostgreSQL app-data/Jenkins/Grafana/Prometheus/Alertmanager mutation.
- V1 mutation is only typed-confirmed scale `0` or `1` for allowlisted prod app deployments.

## Agent Customization

This repository supports lightweight agent customization files to define specialized Copilot/agent behaviours for common tasks (e.g., release assistant, frontend reviewer, security auditor). There are currently no `.agent.md`, `.instructions.md`, or `.prompt.md` files in the workspace; add one when you need a persistent, role-specific assistant.

Recommended locations:
- Root: `./my-agent.agent.md`
- VS Code settings: `.vscode/agents/<agent-name>.agent.md`

Minimal `.agent.md` template (copy and adapt):

```

Recent in-repo agent work (2026-04-29 → 2026-04-30):

- Implemented a short-lived interactive assistant workflow to help scaffold and debug the frontend Control Panel UI (UI-only).
- The assistant added a recommended `.agent.md` template to this file and helped apply focused code changes: auth profile normalization, Control Panel routes and UI scaffolding, and lint fixes.
- The assistant workflow is meant for developer convenience and does not modify production secrets or CI configuration.

If you want, I can commit a permanent agent file under `.vscode/agents/repo-assistant.agent.md` with the suggested template.
---
name: repo-assistant
description: Helpful assistant tailored to the cloudpulse-ui repository tasks (frontend, MUI, services).
when_to_use: Use this agent for PR reviews, code fixes, and repository-specific guidance.
persona: concise, technical, React/CRA/MUI-focused, friendly.
tools:
	allow: [read_file, apply_patch, file_search, run_in_terminal]
	avoid: [internet_fetch, github_repo]
constraints:
	- Follow repository coding style in AGENTS.md.
	- Don't expose secrets or modify production credentials.
examples:
	- "Run `npm test` and fix failing tests related to `MDButton`"
	- "Create a new `.agent.md` for deployment checklist"
---

Guidance:
- Keep instructions short and prescriptive.
- Specify exact allowed tools when safety is a concern.
- Provide example prompts to surface common tasks.

Next steps:
- Create an agent file from the template where needed.
- Add more specific tool permissions if the agent must perform CI or terminal tasks.

If you'd like, I can create a starter file in `.vscode/agents/repo-assistant.agent.md` and commit it for you.
```