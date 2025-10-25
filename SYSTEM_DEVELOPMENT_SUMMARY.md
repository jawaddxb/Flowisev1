## System Development Summary (Flowisev1 Custom Fork)

Date: 2025-10-24

### Upstream Baseline

- Project: Flowise (Build AI Agents, Visually)
- Upstream repository: https://github.com/FlowiseAI/Flowise
- Architecture (upstream): monorepo with `packages/server` (Express/TypeScript), `packages/ui` (React/Vite), `packages/components` (node/credentials integrations), `packages/api-documentation`.
- Quick start (upstream): `pnpm install`, `pnpm build`, `pnpm start` on port 3000; dev mode `pnpm dev` with UI on port 8080.

This fork preserves upstream structure and adds a new first-class feature set (Orchestrator), enhancements to Copilot UX/state, and AgentFlow V2 generation utilities, along with documentation and operational guides.

---

## User-Facing New Features

### Orchestrator (visual workflow builder)
- New sidebar menu item (feature-flagged) to access Orchestrator
- Orchestrator list view: create, edit, duplicate, delete, and run orchestrators
- Canvas builder: drag-and-drop nodes, connect edges, zoom controls, mini‑map, grid
- Node palette with 7 types: Remote Webhook, Local Flow, Data Mapper, Wait for Callback, Condition, Error Handler, Parallel (MVP behavior for some)
- Node configuration drawer: per‑node settings (e.g., webhook URL/method/headers/body/timeout, flow selection, mappings)
- Workflow Browser dialog: tabs for Local Flows/n8n/Make/Zapier, provider status chips, search/filter, “Add to Canvas”
- Provider Connections: connect/test/disconnect providers via dialogs (n8n/Make/Zapier)
- Run orchestrator from canvas or list and receive success/error notifications
- Run History: view past runs with status badges, timestamps, and details/logs
- Edge‑aware execution respecting the connections drawn on the canvas

### Providers (n8n, Make.com, Zapier)
- Browse available provider workflows (when connected) and add them directly to the canvas
- Connection status surfaced in UI (connected/disconnected) with badges and disabled tabs when unavailable

### Execution options (per user configuration)
- Optional polling for async provider workflows (e.g., n8n)
- Retry with exponential backoff and configurable timeout on Remote Webhook nodes
- Callback/correlation support for resuming long‑running flows via callback endpoint

### Copilot (workflow assistant)
- Single adaptive primary action (smart CTA) with loading state
- Guidance surfacing: template intro, REVIEWING mode gap guidance, and “Fix & Test” walkthrough
- Auto‑open on canvas, context‑aware headers, and history auto‑clear for stale sessions
- Accessibility improvements (high‑contrast UI elements)

### AgentFlow V2 (generation improvements)
- Smarter AgentFlow scaffolding and tool selection behind the scenes, yielding better initial node/edge graphs and inputs

---

## What’s New in This Codebase (Diff-Style Overview)

### 1) Orchestrator (New Top-Level Feature)

Visual, graph-based orchestration of:
- Local Flowise flows (chatflows/agentflows)
- External provider workflows: n8n, Make.com, Zapier (Phase 2)
- Remote webhooks and APIs

Key capabilities:
- ReactFlow canvas editor with node palette and configuration drawer
- Edge-aware execution (BFS traversal) honoring graph connections
- Run history tracking and logs
- Provider connection management and workflow browsing with status badges
- Callback/correlation support; optional polling and retry/timeout configuration

UI additions (packages/ui):
- menu: `src/menu-items/orchestrator.js` (feature-flag gated display)
- routes/views: `src/views/orchestrator/`
  - `index.jsx` (list)
  - `Canvas.jsx` (builder)
  - `WorkflowBrowser.jsx` (+ `N8nConnectionDialog.jsx`)
  - `components/AddNodePanel.jsx`, `OrchestratorNode.jsx`, `NodeConfigDrawer.jsx`
  - `RunHistory.jsx` (run viewer)
- api clients: `src/api/orchestrator.js`, `src/api/orchestrator-providers.js`

Server additions (packages/server):
- entities: `Orchestrator.ts`, `OrchestratorRun.ts`, `ProviderConnection.ts`
- services: `services/orchestrator/runner.ts`, `services/orchestrator/providers/{base.ts,n8n.ts,make.ts,zapier.ts,index.ts}`
- controllers/routes: `controllers/orchestrator/{index.ts,providers.ts,connections.ts}`, `routes/orchestrator/{index.ts,providers.ts,connections.ts}`
- migrations (sqlite):
  - `1762000000000-AddOrchestratorTables.ts`
  - `1762000001000-AddOrchestratorRunFields.ts` (inputs/metadata)
  - `1762000002000-AddOrchestratorDescription.ts`

API surface (added):
- Orchestrators: CRUD, run, run history, callback
- Providers: list providers, list workflows, preview workflows
- Connections: connect/test/disconnect providers

Documentation (new):
- `ORCHESTRATOR.md` (feature docs)
- `QUICKSTART_ORCHESTRATOR.md` (5‑minute setup)
- `TEST_ORCHESTRATOR.md` (manual/API test guide)
- Status/audits: `ORCHESTRATOR_STATUS.md`, `ORCHESTRATOR_FINAL_AUDIT.md`, `FINAL_FIX_SUMMARY.md`, `AUDIT_AND_FIXES.md`, `PHASE2_COMPLETE_AUDIT.md`, `PHASE2_PLAN.md`, `IMPLEMENTATION_SUMMARY.md`, `ORCHESTRATOR_UI_GUIDE.md`

Implementation highlights:
- Feature-flagged menu (`VITE_ORCHESTRATOR_ENABLED`)
- Execution engine with BFS traversal, retry with exponential backoff, optional provider polling
- Provider adapters for n8n/Make/Zapier with workflow browsing and previews
- Run history UI and enhanced callback correlation methods

### 2) Copilot Enhancements

- Stabilization of hooks and dependency ordering
- Mode consolidation (BUILDING/REVIEWING/READY), single primary CTA, disabled states, guidance flow
- Known UI gap: guidance messages in REVIEWING mode not rendered (tracked with proposed fixes A/B/C)
- Files: `packages/ui/src/views/copilot/*` plus `COPILOT_STATUS.md`

### 3) AgentFlow V2 Generator (Components)

- Strongly-typed generator for AgentFlow v2 nodes/edges with Zod schemas
- Tool selection sub-flow and node data initialization utilities
- File: `packages/components/src/agentflowv2Generator.ts`

---

## Current Status Snapshot

- Build: server and UI builds passing
- Orchestrator: Phase 1 and Phase 2 completed; Phase 3 planned
- Providers: n8n full; Make/Zapier supported with API-related polling limitations
- DB: new tables present and migrations registered
- Security: provider credentials currently stored as JSON; encryption recommended (Phase 3)

See: `ORCHESTRATOR_STATUS.md`, `PHASE2_COMPLETE_AUDIT.md`, `FINAL_FIX_SUMMARY.md`.

---

## Detailed Changes

### Database Schema (New)

- `orchestrator`
  - id (uuid), name, description, definition (ReactFlow JSON), workspaceId, created/updated
- `orchestrator_run`
  - id, orchestratorId, status (PENDING/RUNNING/COMPLETED/FAILED/WAITING), logs, inputs, metadata, correlationToken, startedAt, finishedAt, created/updated
- `provider_connection`
  - id, workspaceId, provider (n8n/make/zapier), credentials (JSON), status, lastSync, created/updated

### API (New Endpoints)

Orchestrators:
- GET `/api/v1/orchestrator`
- POST `/api/v1/orchestrator`
- GET `/api/v1/orchestrator/:id`
- PUT `/api/v1/orchestrator/:id`
- DELETE `/api/v1/orchestrator/:id`
- POST `/api/v1/orchestrator/:id/run`
- GET `/api/v1/orchestrator/:id/runs`
- POST `/api/v1/orchestrator/callback/:token`

Providers:
- GET `/api/v1/orchestrator/providers`
- GET `/api/v1/orchestrator/providers/:provider/workflows`
- GET `/api/v1/orchestrator/providers/:provider/workflows/:id/preview`

Connections:
- GET `/api/v1/orchestrator/connections`
- POST `/api/v1/orchestrator/providers/:provider/connect`
- POST `/api/v1/orchestrator/providers/:provider/test`
- DELETE `/api/v1/orchestrator/connections/:id`

### Execution Engine

- Edge-aware traversal via BFS from entry nodes
- RemoteWebhook node supports:
  - Direct HTTP calls with templated bodies
  - Provider-based execution (n8n/Make/Zapier)
  - Optional polling (interval, attempts)
  - Retry attempts with exponential backoff and timeout settings
- LocalFlow node proxies executions to Flowise prediction API
- DataMapper node for field mapping and simple transforms
- WaitForCallback stores callback data and can resume runs

### UI & UX

- Canvas editor with toolbar (Back, Add Workflow, Run, Save)
- Node palette with seven node types (MVP)
- Node configuration drawer (per-node settings)
- Workflow browser with provider tabs and connection status chips
- Run History view with status chips, timestamps, and details

### Audits and Fixes

- Feature flag applied to menu
- Execution order fixed to honor edges (was JSON order)
- Provider status displayed with dynamic tabs
- Data normalization in UI to tolerate variant API payloads
- React Router v6.3.0 optional-parameter bug diagnosed; dual-route workaround documented

---

## Documents Inventory (Added in this fork)

- Architecture/feature: `ORCHESTRATOR.md`
- Quick start: `QUICKSTART_ORCHESTRATOR.md`
- Testing: `TEST_ORCHESTRATOR.md`
- Status/roadmap/audits: `ORCHESTRATOR_STATUS.md`, `PHASE2_PLAN.md`, `PHASE2_COMPLETE_AUDIT.md`, `ORCHESTRATOR_FINAL_AUDIT.md`
- Fix summaries: `FINAL_FIX_SUMMARY.md`, `AUDIT_AND_FIXES.md`, `ORCHESTRATOR_FIXED.md`
- UI guide: `ORCHESTRATOR_UI_GUIDE.md`
- General summary: `IMPLEMENTATION_SUMMARY.md`

---

## Build & Dev Notes

- Dev mode (recommended): `pnpm dev` → UI on 8080 (hot reload), server auto-restarts
- Production mode: `pnpm build` then `pnpm start` → UI served on 3000 from `packages/ui/build`
- UI rebuilds (when editing `packages/ui/src/**`):
  1) Clean caches: remove `packages/ui/build` and `packages/ui/node_modules/.vite`
  2) Rebuild UI: `cd packages/ui && npm run build`
  3) Hard refresh browser (Cmd/Ctrl+Shift+R) or use incognito

---

## Known Limitations / Risks

- Provider credentials not encrypted at rest (planned encryption in Phase 3)
- Make/Zapier: polling constrained by provider APIs
- No comprehensive automated test suite yet (unit/integration/E2E planned)
- React Router v6.3.0 optional parameter quirk (workaround in place; upgrade recommended)

---

## Next Steps (Phase 3 Preview)

- Security: credential encryption, rate limiting, audit logs, rotation policies
- UI: real-time execution updates, workflow preview panel, run comparison
- Execution: advanced error handling, parallel/conditional branches, scheduled runs
- Observability: detailed execution logs, analytics, monitoring
- Testing: unit/integration/E2E coverage and performance testing

---

## Verification Checklist

- [ ] Run migrations (server) and start dev servers
- [ ] Orchestrator menu visible (when feature flag enabled)
- [ ] Create/save/run orchestrator from canvas
- [ ] Browse local flows and add to canvas
- [ ] Connect to n8n and add a provider workflow
- [ ] Confirm run history lists runs with correct statuses
- [ ] Inspect DB tables for `orchestrator*` and `provider_connection`

---

## Upstream Reference

This fork is based on Flowise upstream main. For reference on original scope, setup, and architecture, see: https://github.com/FlowiseAI/Flowise


