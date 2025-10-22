# Orchestrator Feature - Current Status

**Last Updated:** October 22, 2025  
**Overall Status:** ✅ Phase 1 & Phase 2 Complete  
**Build Status:** ✅ All builds passing

---

## Quick Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Core Infrastructure | ✅ Complete | 100% |
| Phase 2: Provider Integrations | ✅ Complete | 100% |
| Phase 3: Advanced Features | ⏸️ Planned | 0% |

---

## What's Working

### ✅ Core Orchestrator
- Create, read, update, delete orchestrators
- ReactFlow canvas for visual workflow building
- Node types: RemoteWebhook, LocalFlow, DataMapper, WaitForCallback
- Edge-aware execution (BFS traversal)
- Run tracking and logging
- Callback/correlation handling

### ✅ Provider Integrations
- **n8n** - Full support (list, preview, execute, poll)
- **Make.com** - Full support (list, preview, execute)
- **Zapier** - Full support (list, preview, execute)
- Dynamic provider status based on connections
- Connection management UI

### ✅ Advanced Features
- Async workflow polling (n8n)
- Retry with exponential backoff
- Configurable timeouts
- Run history UI with detailed logs
- Correlation ID system for callbacks

### ✅ UI Components
- Orchestrator list view
- Canvas editor with drag-and-drop
- Node configuration drawer
- Workflow browser with provider tabs
- Connection dialogs (n8n, Make, Zapier)
- Run history viewer

---

## How to Use

### 1. Enable the Feature
Add to your `.env`:
```bash
VITE_ORCHESTRATOR_ENABLED=true
```

### 2. Connect a Provider
1. Navigate to Orchestrator menu
2. Click "Browse Workflows"
3. Select a provider tab (n8n, Make, or Zapier)
4. Click "Connect" and enter credentials
5. Test connection

### 3. Create an Orchestrator
1. Click "Add New Orchestrator"
2. Drag nodes from the palette
3. Connect nodes with edges
4. Configure each node (click to open drawer)
5. Save the orchestrator

### 4. Run an Orchestrator
1. Open an orchestrator
2. Click "Run" button
3. Provide input data (JSON)
4. Monitor execution in real-time
5. View results in run history

---

## Provider Credentials

### n8n
```json
{
  "baseUrl": "https://your-n8n-instance.com",
  "apiKey": "your-n8n-api-key"
}
```

### Make.com
```json
{
  "apiKey": "your-make-api-token",
  "baseUrl": "https://us1.make.com/api/v2"
}
```

### Zapier
```json
{
  "apiKey": "your-zapier-api-key"
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Flowise Orchestrator                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   n8n    │  │   Make   │  │  Zapier  │              │
│  │ Provider │  │ Provider │  │ Provider │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │              │                     │
│       └─────────────┴──────────────┘                     │
│                     │                                    │
│              ┌──────▼───────┐                           │
│              │    Runner    │                           │
│              │  (Executor)  │                           │
│              └──────┬───────┘                           │
│                     │                                    │
│       ┌─────────────┼─────────────┐                     │
│       │             │             │                     │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐                │
│  │ Remote  │  │  Local  │  │  Data   │                │
│  │ Webhook │  │  Flow   │  │ Mapper  │                │
│  └─────────┘  └─────────┘  └─────────┘                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Key Files

### Backend
```
packages/server/src/
├── controllers/orchestrator/
│   ├── index.ts              # CRUD operations
│   ├── providers.ts          # Provider listing
│   └── connections.ts        # Connection management
├── services/orchestrator/
│   ├── runner.ts             # Execution engine
│   └── providers/
│       ├── base.ts           # Provider interface
│       ├── n8n.ts            # n8n adapter
│       ├── make.ts           # Make adapter
│       ├── zapier.ts         # Zapier adapter
│       └── index.ts          # Provider registry
├── database/entities/
│   ├── Orchestrator.ts       # Orchestrator entity
│   ├── OrchestratorRun.ts    # Run entity
│   └── ProviderConnection.ts # Connection entity
└── routes/orchestrator/
    ├── index.ts              # Main routes
    ├── providers.ts          # Provider routes
    └── connections.ts        # Connection routes
```

### Frontend
```
packages/ui/src/
├── views/orchestrator/
│   ├── index.jsx             # List view
│   ├── Canvas.jsx            # Canvas editor
│   ├── RunHistory.jsx        # Run history viewer
│   ├── WorkflowBrowser.jsx   # Workflow browser
│   └── components/
│       ├── OrchestratorNode.jsx      # Node component
│       ├── AddNodePanel.jsx          # Node palette
│       ├── NodeConfigDrawer.jsx      # Config drawer
│       └── N8nConnectionDialog.jsx   # Connection dialog
├── api/
│   ├── orchestrator.js       # Orchestrator API
│   └── orchestrator-providers.js # Provider API
└── menu-items/
    └── orchestrator.js       # Menu item
```

---

## API Endpoints

### Orchestrators
- `GET /api/v1/orchestrator` - List all
- `POST /api/v1/orchestrator` - Create new
- `GET /api/v1/orchestrator/:id` - Get one
- `PUT /api/v1/orchestrator/:id` - Update
- `DELETE /api/v1/orchestrator/:id` - Delete
- `POST /api/v1/orchestrator/:id/run` - Execute
- `GET /api/v1/orchestrator/:id/runs` - Get runs
- `POST /api/v1/orchestrator/callback/:runId` - Callback

### Providers
- `GET /api/v1/orchestrator/providers` - List providers
- `GET /api/v1/orchestrator/providers/:provider/workflows` - List workflows
- `GET /api/v1/orchestrator/providers/:provider/workflows/:id/preview` - Preview

### Connections
- `GET /api/v1/orchestrator/connections` - List connections
- `POST /api/v1/orchestrator/providers/:provider/connect` - Connect
- `DELETE /api/v1/orchestrator/connections/:id` - Disconnect
- `POST /api/v1/orchestrator/providers/:provider/test` - Test

---

## Database Schema

### orchestrator
- `id` (UUID, PK)
- `name` (VARCHAR)
- `description` (TEXT)
- `definition` (TEXT) - JSON: { nodes, edges, version }
- `workspaceId` (VARCHAR)
- `createdDate` (TIMESTAMP)
- `updatedDate` (TIMESTAMP)

### orchestrator_run
- `id` (UUID, PK)
- `orchestratorId` (UUID, FK)
- `status` (VARCHAR) - PENDING, RUNNING, COMPLETED, FAILED, WAITING
- `logs` (TEXT) - JSON array
- `inputs` (TEXT) - JSON
- `metadata` (TEXT) - JSON
- `correlationToken` (VARCHAR)
- `startedAt` (TIMESTAMP)
- `finishedAt` (TIMESTAMP)
- `createdDate` (TIMESTAMP)
- `updatedDate` (TIMESTAMP)

### provider_connection
- `id` (UUID, PK)
- `workspaceId` (VARCHAR)
- `provider` (VARCHAR) - n8n, make, zapier
- `credentials` (TEXT) - JSON (⚠️ not encrypted yet)
- `status` (VARCHAR) - ACTIVE, INACTIVE
- `lastSync` (TIMESTAMP)
- `createdDate` (TIMESTAMP)
- `updatedDate` (TIMESTAMP)

---

## Configuration Options

### RemoteWebhook Node
```json
{
  "provider": "n8n",
  "workflowId": "123",
  "url": "https://...",
  "method": "POST",
  "headers": {},
  "bodyTemplate": "{{data}}",
  "timeout": 30000,
  "enablePolling": true,
  "pollingInterval": 2000,
  "maxPollingAttempts": 30,
  "retryAttempts": 3,
  "retryDelay": 1000
}
```

### LocalFlow Node
```json
{
  "flowId": "abc-123",
  "baseURL": "http://localhost:3000"
}
```

### DataMapper Node
```json
{
  "mappings": [
    { "from": "input.name", "to": "output.fullName" },
    { "from": "input.age", "to": "output.years" }
  ]
}
```

---

## Troubleshooting

### Provider Connection Fails
1. Check credentials are correct
2. Verify network connectivity
3. Check provider API status
4. Review server logs for details

### Workflow Execution Fails
1. Check webhook URL is valid
2. Verify provider workflow is active
3. Check input data format
4. Review run logs for errors

### Polling Timeout
1. Increase `maxPollingAttempts`
2. Increase `pollingInterval`
3. Check provider execution time
4. Consider disabling polling for long-running workflows

### UI Not Showing Orchestrator
1. Verify `VITE_ORCHESTRATOR_ENABLED=true` in `.env`
2. Rebuild UI: `npm run build`
3. Clear browser cache
4. Check user permissions

---

## Performance Tips

1. **Use Polling Sparingly** - Only enable for workflows that need it
2. **Optimize Retry Settings** - Don't over-retry failing endpoints
3. **Cache Workflow Lists** - Provider APIs can be slow
4. **Limit Run History** - Archive old runs periodically
5. **Use Timeouts** - Set reasonable timeout values

---

## Security Best Practices

1. **Credential Management**
   - Store credentials securely
   - Rotate API keys regularly
   - Use workspace isolation
   - Plan for encryption implementation

2. **Network Security**
   - Use HTTPS for all provider connections
   - Validate webhook URLs
   - Implement rate limiting
   - Monitor for suspicious activity

3. **Access Control**
   - Use existing Flowise permissions
   - Limit orchestrator access by role
   - Audit connection changes
   - Log all executions

---

## Known Issues & Limitations

### Current Limitations
- ⚠️ Credentials not encrypted (stored as JSON)
- ⚠️ No server-side feature flag
- ⚠️ Make.com polling not supported (API limitation)
- ⚠️ Zapier polling not supported (API limitation)
- ⚠️ No preview panel in workflow browser yet
- ⚠️ No unit tests yet

### Planned Improvements
- Credential encryption
- Real-time run status updates
- Workflow preview panel
- Comprehensive test suite
- Advanced error handling
- Performance optimizations

---

## Support & Documentation

### Documentation Files
- `ORCHESTRATOR.md` - Full feature documentation
- `TEST_ORCHESTRATOR.md` - Testing guide
- `QUICKSTART_ORCHESTRATOR.md` - Quick start guide
- `PHASE2_COMPLETE_AUDIT.md` - Phase 2 audit report
- `ORCHESTRATOR_STATUS.md` - This file

### Getting Help
1. Check documentation files
2. Review server logs
3. Check run history for errors
4. Test provider connections
5. Verify configuration

---

## Version History

### v1.0.0 (Phase 1) - Completed
- Core orchestrator infrastructure
- Basic node types
- Canvas editor
- Run tracking

### v2.0.0 (Phase 2) - Completed
- n8n provider integration
- Make.com provider integration
- Zapier provider integration
- Polling support
- Retry logic
- Run history UI
- Enhanced callbacks

### v3.0.0 (Phase 3) - Planned
- Credential encryption
- Preview panel
- Real-time updates
- Advanced features
- Comprehensive tests

---

**Status:** Production-ready for Phase 1 & 2 features  
**Next Review:** After Phase 3 planning  
**Maintainer:** Development Team

