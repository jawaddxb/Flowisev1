# Orchestrator Phase 2 Plan

## Overview

Phase 1 (MVP) is complete with:
- ✅ Feature-flagged menu item
- ✅ CRUD operations
- ✅ Edge-aware execution engine
- ✅ Node configuration drawer
- ✅ Provider-aware workflow browser
- ✅ Local flow integration

Phase 2 focuses on **external provider integrations** (n8n, Make, Zapier) and **enhanced execution capabilities**.

## Goals

1. Enable users to browse and execute workflows from n8n, Make, and Zapier
2. Add polling support for async operations
3. Implement run history UI with detailed logs
4. Add retry/timeout configuration
5. Improve callback/correlation handling

## Provider Adapters

### 1. n8n Integration

**Capabilities:**
- OAuth2 or API token authentication
- List workflows via API
- Fetch workflow JSON structure
- Execute workflows via webhook
- Poll for completion status

**Implementation:**

```typescript
// packages/server/src/services/orchestrator/providers/n8n.ts
export class N8nProvider implements ProviderAdapter {
    async authenticate(credentials: N8nCredentials): Promise<boolean>
    async listWorkflows(connectionId: string): Promise<Workflow[]>
    async getWorkflowPreview(workflowId: string): Promise<WorkflowPreview>
    async executeWorkflow(workflowId: string, data: any): Promise<ExecutionResult>
    async pollExecution(executionId: string): Promise<ExecutionStatus>
}
```

**API Endpoints:**
- `POST /orchestrator/providers/n8n/connect` - Store credentials
- `GET /orchestrator/providers/n8n/workflows` - List workflows
- `GET /orchestrator/providers/n8n/workflows/:id/preview` - Get workflow graph
- `POST /orchestrator/providers/n8n/workflows/:id/execute` - Run workflow

**UI Components:**
- Connection dialog for n8n credentials (URL + API key)
- Workflow list with n8n-specific metadata
- Preview panel showing n8n workflow structure
- Status polling indicator

### 2. Make (Integromat) Integration

**Capabilities:**
- API token authentication
- List scenarios via API
- Fetch scenario metadata
- Execute via webhook
- Manual webhook configuration

**Implementation:**

```typescript
// packages/server/src/services/orchestrator/providers/make.ts
export class MakeProvider implements ProviderAdapter {
    async authenticate(credentials: MakeCredentials): Promise<boolean>
    async listScenarios(connectionId: string): Promise<Workflow[]>
    async getScenarioMetadata(scenarioId: string): Promise<WorkflowMetadata>
    async executeScenario(webhookUrl: string, data: any): Promise<ExecutionResult>
}
```

**API Endpoints:**
- `POST /orchestrator/providers/make/connect` - Store API token
- `GET /orchestrator/providers/make/scenarios` - List scenarios
- `GET /orchestrator/providers/make/scenarios/:id/metadata` - Get metadata
- `POST /orchestrator/providers/make/execute` - Execute via webhook

**UI Components:**
- Connection dialog for Make API token
- Scenario list with status badges
- Metadata card showing inputs/outputs
- Webhook URL configuration

### 3. Zapier Integration

**Capabilities:**
- Manual webhook configuration (no list API in MVP)
- Execute via webhook
- Callback support for multi-step zaps

**Implementation:**

```typescript
// packages/server/src/services/orchestrator/providers/zapier.ts
export class ZapierProvider implements ProviderAdapter {
    async executeZap(webhookUrl: string, data: any): Promise<ExecutionResult>
    async registerCallback(zapId: string, callbackUrl: string): Promise<void>
}
```

**API Endpoints:**
- `POST /orchestrator/providers/zapier/execute` - Execute via webhook
- `POST /orchestrator/providers/zapier/callback` - Handle callbacks

**UI Components:**
- Manual webhook URL input
- "Test Webhook" button
- Callback URL display

## Enhanced Execution Features

### 1. Polling Support

For async operations that don't support callbacks:

```typescript
interface PollingConfig {
    url: string
    interval: number // ms between polls
    maxAttempts: number
    successCondition: string // JSONPath expression
    failureCondition?: string
}
```

**Implementation:**
- Add `PollingNode` type
- Runner checks status at intervals
- Updates run logs with polling attempts
- Fails after max attempts or on failure condition

### 2. Retry Configuration

Per-node retry settings:

```typescript
interface RetryConfig {
    enabled: boolean
    maxAttempts: number
    backoff: 'linear' | 'exponential'
    initialDelay: number
    maxDelay: number
}
```

**Implementation:**
- Add retry config to node drawer
- Runner wraps node execution in retry logic
- Logs each retry attempt
- Exponential backoff with jitter

### 3. Timeout Handling

Enhanced timeout configuration:

```typescript
interface TimeoutConfig {
    execution: number // per-node timeout
    total: number // total orchestration timeout
    onTimeout: 'fail' | 'continue' | 'default'
}
```

**Implementation:**
- Add timeout config to orchestrator settings
- Runner enforces timeouts with Promise.race
- Logs timeout events
- Configurable failure behavior

## Run History UI

### List View

**Location:** `/orchestrator/:id/runs`

**Features:**
- Table of all runs for an orchestrator
- Columns: Run ID, Status, Started, Duration, Trigger
- Status badges: PENDING, RUNNING, COMPLETED, FAILED
- Click row to view details

**Implementation:**
```jsx
// packages/ui/src/views/orchestrator/RunHistory.jsx
const RunHistory = () => {
    const { id } = useParams()
    const runs = useApi(orchestratorApi.getOrchestratorRuns)
    
    return (
        <Table>
            {runs.map(run => (
                <TableRow onClick={() => navigate(`/orchestrator/${id}/runs/${run.id}`)}>
                    <TableCell>{run.id}</TableCell>
                    <TableCell><StatusChip status={run.status} /></TableCell>
                    <TableCell>{formatDate(run.startedAt)}</TableCell>
                    <TableCell>{formatDuration(run)}</TableCell>
                </TableRow>
            ))}
        </Table>
    )
}
```

### Detail View

**Location:** `/orchestrator/:id/runs/:runId`

**Features:**
- Visual flow with node status indicators
- Timeline of execution events
- Logs panel with filtering
- Input/output data for each node
- Error details if failed
- Retry button

**Implementation:**
```jsx
// packages/ui/src/views/orchestrator/RunDetail.jsx
const RunDetail = () => {
    const { id, runId } = useParams()
    const run = useApi(orchestratorApi.getOrchestratorRun)
    
    return (
        <Box>
            <RunCanvas definition={run.definition} logs={run.logs} />
            <LogsPanel logs={run.logs} />
            <DataPanel input={run.input} output={run.output} />
        </Box>
    )
}
```

## Callback Improvements

### Enhanced Correlation

**Current:** UUID token in URL
**Phase 2:** Add metadata and security

```typescript
interface CorrelationToken {
    token: string // UUID
    orchestratorId: string
    runId: string
    nodeId: string
    expiresAt: Date
    metadata?: any
}
```

**Implementation:**
- Store correlation tokens in database
- Add expiration checking
- Include node context
- Support multiple callbacks per run

### Callback UI

**Features:**
- Copy callback URL button
- QR code for mobile testing
- Webhook tester (send test payload)
- Callback history log

**Implementation:**
```jsx
// packages/ui/src/views/orchestrator/components/CallbackPanel.jsx
const CallbackPanel = ({ node, runId }) => {
    const callbackUrl = `${baseUrl}/api/v1/orchestrator/callback/${token}`
    
    return (
        <Box>
            <TextField value={callbackUrl} InputProps={{
                endAdornment: <CopyButton value={callbackUrl} />
            }} />
            <QRCode value={callbackUrl} />
            <Button onClick={testCallback}>Test Callback</Button>
        </Box>
    )
}
```

## Database Changes

### New Tables

```sql
-- Provider connections
CREATE TABLE provider_connection (
    id VARCHAR PRIMARY KEY,
    workspace_id VARCHAR NOT NULL,
    provider VARCHAR NOT NULL, -- 'n8n', 'make', 'zapier'
    name VARCHAR NOT NULL,
    credentials TEXT NOT NULL, -- encrypted JSON
    status VARCHAR DEFAULT 'active',
    last_sync DATETIME,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Correlation tokens
CREATE TABLE correlation_token (
    token VARCHAR PRIMARY KEY,
    orchestrator_id VARCHAR NOT NULL,
    run_id VARCHAR NOT NULL,
    node_id VARCHAR NOT NULL,
    expires_at DATETIME NOT NULL,
    metadata TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Execution logs (detailed)
CREATE TABLE execution_log (
    id VARCHAR PRIMARY KEY,
    run_id VARCHAR NOT NULL,
    node_id VARCHAR,
    level VARCHAR DEFAULT 'info', -- 'info', 'warn', 'error'
    message TEXT NOT NULL,
    data TEXT, -- JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Migrations

```typescript
// packages/server/src/database/migrations/sqlite/1763000000000-AddPhase2Tables.ts
export class AddPhase2Tables1763000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create correlation_token table
        // Create execution_log table
        // Add indexes
    }
}
```

## API Endpoints (New)

### Provider Management
```
POST   /api/v1/orchestrator/providers/:provider/connect
DELETE /api/v1/orchestrator/providers/:provider/disconnect/:id
GET    /api/v1/orchestrator/providers/:provider/test
```

### Run Management
```
GET    /api/v1/orchestrator/:id/runs
GET    /api/v1/orchestrator/:id/runs/:runId
POST   /api/v1/orchestrator/:id/runs/:runId/retry
POST   /api/v1/orchestrator/:id/runs/:runId/cancel
```

### Execution Details
```
GET    /api/v1/orchestrator/runs/:runId/logs
GET    /api/v1/orchestrator/runs/:runId/nodes/:nodeId/data
```

## Testing Strategy

### Unit Tests

```typescript
// Provider adapters
describe('N8nProvider', () => {
    it('should authenticate with valid credentials')
    it('should list workflows')
    it('should execute workflow')
    it('should poll for completion')
})

// Retry logic
describe('RetryHandler', () => {
    it('should retry on failure')
    it('should use exponential backoff')
    it('should fail after max attempts')
})
```

### Integration Tests

```typescript
// End-to-end orchestration
describe('Orchestrator E2E', () => {
    it('should execute n8n workflow and continue')
    it('should poll Make scenario until complete')
    it('should handle callback from Zapier')
    it('should retry failed nodes')
})
```

### UI Tests

```typescript
// Cypress tests
describe('Provider Connection', () => {
    it('should connect to n8n')
    it('should list n8n workflows')
    it('should add n8n workflow to canvas')
})

describe('Run History', () => {
    it('should display run list')
    it('should show run details')
    it('should retry failed run')
})
```

## Rollout Plan

### Week 1-2: n8n Integration
- [ ] Implement n8n provider adapter
- [ ] Add n8n connection UI
- [ ] Test workflow listing and preview
- [ ] Test execution

### Week 3-4: Make Integration
- [ ] Implement Make provider adapter
- [ ] Add Make connection UI
- [ ] Test scenario listing
- [ ] Test execution

### Week 5: Zapier Integration
- [ ] Implement Zapier provider adapter
- [ ] Add webhook configuration UI
- [ ] Test execution

### Week 6: Enhanced Execution
- [ ] Implement polling support
- [ ] Add retry configuration
- [ ] Add timeout handling
- [ ] Test edge cases

### Week 7-8: Run History UI
- [ ] Build run list view
- [ ] Build run detail view
- [ ] Add visual flow with status
- [ ] Add logs panel

### Week 9: Callback Improvements
- [ ] Implement correlation token management
- [ ] Add callback UI components
- [ ] Add webhook tester
- [ ] Test callback flows

### Week 10: Testing & Polish
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write UI tests
- [ ] Performance testing
- [ ] Documentation updates

## Success Metrics

- ✅ Successfully connect to n8n, Make, Zapier
- ✅ List and preview workflows from each provider
- ✅ Execute workflows from each provider
- ✅ Poll async operations to completion
- ✅ Retry failed nodes automatically
- ✅ View run history with detailed logs
- ✅ Handle callbacks from external systems
- ✅ 95%+ test coverage for new code

## Documentation Updates

- Update ORCHESTRATOR.md with provider setup instructions
- Add provider-specific guides (n8n, Make, Zapier)
- Update API documentation
- Add troubleshooting section for providers
- Create video tutorials for each provider

## Phase 3 Preview

After Phase 2, Phase 3 will focus on:
- Parallel execution (Parallel node)
- Advanced error handling (ErrorBoundary node)
- Conditional branching (Condition node)
- Analytics and monitoring dashboard
- Template marketplace
- Import/export orchestrations
- Scheduled orchestrations
- Circuit breakers and rate limiting

---

**Status:** Ready to begin Phase 2
**Estimated Duration:** 10 weeks
**Team Size:** 1-2 developers
**Priority:** High (core USP feature)

