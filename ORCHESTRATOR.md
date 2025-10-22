# Orchestrator Feature

## Overview

The Orchestrator is a new top-level feature that allows you to create multi-workflow orchestrations that can combine:
- Local Flowise flows (chatflows and agentflows)
- External workflows from n8n, Make, Zapier (Phase 2)
- Custom webhooks and API calls

This creates a powerful meta-workflow system where you can orchestrate the best tools from different platforms.

## Architecture

### UI Components (`packages/ui`)

- **Menu Item**: `src/menu-items/orchestrator.js`
- **Routes**: Added to `src/routes/MainRoutes.jsx`
- **Views**:
  - `src/views/orchestrator/index.jsx` - List view
  - `src/views/orchestrator/Canvas.jsx` - Canvas builder
  - `src/views/orchestrator/WorkflowBrowser.jsx` - Browse available workflows
  - `src/views/orchestrator/components/` - Node components
- **API Clients**:
  - `src/api/orchestrator.js` - CRUD operations
  - `src/api/orchestrator-providers.js` - Provider integrations

### Server Components (`packages/server`)

- **Database Entities**:
  - `src/database/entities/Orchestrator.ts` - Orchestrator definitions
  - `src/database/entities/OrchestratorRun.ts` - Execution runs
  - `src/database/entities/ProviderConnection.ts` - External provider credentials
  
- **Migrations**:
  - `src/database/migrations/sqlite/1762000000000-AddOrchestratorTables.ts`

- **Routes**:
  - `src/routes/orchestrator/index.ts` - Main CRUD + run endpoints
  - `src/routes/orchestrator/providers.ts` - Provider workflow browsing

- **Controllers**:
  - `src/controllers/orchestrator/index.ts` - Request handlers
  - `src/controllers/orchestrator/providers.ts` - Provider handlers

- **Services**:
  - `src/services/orchestrator/index.ts` - Business logic
  - `src/services/orchestrator/runner.ts` - Execution engine
  - `src/services/orchestrator/providers/index.ts` - Provider adapters

## Node Types (MVP)

1. **RemoteWebhook** - Call external HTTP endpoints
2. **LocalFlow** - Execute Flowise chatflows/agentflows
3. **DataMapper** - Transform data between steps
4. **WaitForCallback** - Pause and wait for external callback
5. **Condition** - Conditional branching (pass-through in MVP)
6. **ErrorBoundary** - Error handling (pass-through in MVP)
7. **Parallel** - Parallel execution (pass-through in MVP)

## API Endpoints

### Orchestrator CRUD
- `GET /api/v1/orchestrator` - List all orchestrators
- `POST /api/v1/orchestrator` - Create orchestrator
- `GET /api/v1/orchestrator/:id` - Get orchestrator
- `PUT /api/v1/orchestrator/:id` - Update orchestrator
- `DELETE /api/v1/orchestrator/:id` - Delete orchestrator

### Execution
- `POST /api/v1/orchestrator/:id/run` - Run orchestrator
- `GET /api/v1/orchestrator/:id/runs` - Get run history
- `POST /api/v1/orchestrator/callback/:token` - Callback endpoint

### Providers
- `GET /api/v1/orchestrator/providers` - List available providers
- `GET /api/v1/orchestrator/providers/:provider/workflows` - List workflows
- `GET /api/v1/orchestrator/providers/:provider/workflows/:id/preview` - Preview workflow

## Usage

### Creating an Orchestrator

1. Navigate to **Orchestrator** in the main menu
2. Click **New Orchestrator**
3. Drag nodes from the palette onto the canvas
4. Connect nodes to define execution flow
5. Configure each node (click to open config panel)
6. Save the orchestrator

### Adding Workflows

1. In the canvas, click **Add Workflow**
2. Browse available workflows by provider (tabs)
3. Click **Add to Canvas** to insert a pre-configured node
4. Connect and configure as needed

### Running an Orchestrator

1. From the list view, click the **Run** button
2. Or from the canvas, click **Run** in the toolbar
3. View execution logs in the runs history

## Data Format

### Orchestrator Definition

```json
{
  "nodes": [
    {
      "id": "node_123",
      "type": "orchestratorNode",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Call API",
        "nodeType": "RemoteWebhook",
        "config": {
          "url": "https://api.example.com/webhook",
          "method": "POST",
          "headers": {},
          "timeout": 30000
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_123",
      "source": "node_123",
      "target": "node_456"
    }
  ],
  "version": 1
}
```

## Permissions

The orchestrator reuses existing chatflow permissions:
- `chatflows:view` - View orchestrators
- `chatflows:create` - Create orchestrators
- `chatflows:update` - Update orchestrators
- `chatflows:delete` - Delete orchestrators

## Roadmap

### Phase 1 (MVP) ✅
- Menu item and UI
- CRUD operations
- Basic node types
- Local flow integration
- Workflow browser for local flows
- Simple linear execution

### Phase 2 (Planned)
- n8n adapter (list, preview, run)
- Make adapter (list, metadata, run)
- Zapier adapter (webhook-based)
- Polling support for async operations
- Run history UI with detailed logs
- Callback/correlation improvements

### Phase 3 (Future)
- Parallel execution
- Advanced error handling
- Circuit breakers and retries
- Analytics and monitoring
- Template marketplace
- Import/export orchestrations

## Development Notes

### Isolation Strategy

The orchestrator is completely isolated from existing features:
- No changes to chatflow/agentflow logic
- Separate database tables
- Separate routes namespace
- Separate UI views
- Reuses existing permissions (no RBAC changes)

### Testing

Run migrations:
```bash
npm run typeorm migration:run
```

Start the server:
```bash
npm run dev
```

The orchestrator menu will appear automatically (no feature flag needed for now).

### Adding New Node Types

1. Add node definition to `AddNodePanel.jsx`
2. Add icon to `OrchestratorNode.jsx`
3. Implement execution logic in `runner.ts` `executeNode()` method
4. Add configuration UI (future enhancement)

### Adding New Providers

1. Create adapter in `services/orchestrator/providers/`
2. Implement interface: `listWorkflows`, `getPreview`, `execute`
3. Add provider to `getProviders()` list
4. Add tab to `WorkflowBrowser.jsx`

## Troubleshooting

### Orchestrator menu not showing
- Check that you're logged in with proper permissions
- Verify migrations have run successfully

### Cannot run orchestrator
- Ensure orchestrator is saved first
- Check server logs for execution errors
- Verify node configurations are valid

### Local flows not appearing in browser
- Ensure you have created some chatflows/agentflows
- Check workspace permissions
- Verify API endpoint is accessible

## Support

For issues or questions, refer to the main Flowise documentation or create an issue in the repository.

