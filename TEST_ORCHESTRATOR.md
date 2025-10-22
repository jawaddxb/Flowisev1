# Orchestrator Testing Guide

## Prerequisites

1. Build the server:
```bash
cd packages/server
npm run build
```

2. Run migrations:
```bash
npm run typeorm migration:run
```

3. Start the server:
```bash
npm run dev
```

4. Start the UI:
```bash
cd packages/ui
npm run dev
```

## Manual Testing Steps

### 1. Access the Orchestrator

1. Open the Flowise UI (typically http://localhost:8080)
2. Log in with your credentials
3. Look for the **Orchestrator** menu item in the left sidebar (with a merge icon)
4. Click on it to access the orchestrator list view

### 2. Create a New Orchestrator

1. Click the **New Orchestrator** button
2. You should see:
   - A blank canvas with ReactFlow
   - A left sidebar with node palette
   - Top toolbar with buttons: Back, Add Workflow, Run, Save

### 3. Add Nodes

1. Drag nodes from the left palette onto the canvas:
   - **Remote Webhook** - for calling external APIs
   - **Local Flow** - for executing Flowise flows
   - **Data Mapper** - for transforming data
   - **Wait for Callback** - for async operations
   - **Condition** - for branching logic
   - **Error Handler** - for error handling
   - **Parallel** - for parallel execution

2. Connect nodes by dragging from the bottom handle of one node to the top handle of another

### 4. Add a Local Flow

1. Click the **Add Workflow** button in the toolbar
2. A modal should open with tabs: Local Flows, n8n, Make, Zapier
3. The **Local Flows** tab should show your existing chatflows/agentflows
4. Click **Add to Canvas** on any flow
5. The flow should be added as a **LocalFlow** node

### 5. Save the Orchestrator

1. Click the **Save** button
2. Enter a name in the dialog
3. Click **Save**
4. You should be redirected to the canvas with an ID in the URL

### 6. Run the Orchestrator

1. Click the **Run** button in the toolbar
2. You should see a success message
3. The orchestrator will execute in the background

### 7. View Orchestrator List

1. Click **Back** to return to the list
2. You should see your orchestrator in the table with:
   - Name
   - Node count
   - Last updated date
   - Status badge
   - Action buttons (Run, Edit, Duplicate, Delete)

### 8. Test Actions

1. **Edit**: Click the edit icon to open the canvas
2. **Duplicate**: Click the duplicate icon to create a copy
3. **Delete**: Click the delete icon to remove (with confirmation)
4. **Run**: Click the run icon to execute

## API Testing

### Using curl

#### List all orchestrators
```bash
curl -X GET http://localhost:3000/api/v1/orchestrator \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Create an orchestrator
```bash
curl -X POST http://localhost:3000/api/v1/orchestrator \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Orchestrator",
    "definition": "{\"nodes\":[],\"edges\":[],\"version\":1}"
  }'
```

#### Get an orchestrator
```bash
curl -X GET http://localhost:3000/api/v1/orchestrator/ORCHESTRATOR_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Run an orchestrator
```bash
curl -X POST http://localhost:3000/api/v1/orchestrator/ORCHESTRATOR_ID/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Get providers
```bash
curl -X GET http://localhost:3000/api/v1/orchestrator/providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get local workflows
```bash
curl -X GET http://localhost:3000/api/v1/orchestrator/providers/local/workflows \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Results

### UI
- ✅ Orchestrator menu item appears in sidebar
- ✅ List view shows table with orchestrators
- ✅ Canvas loads with ReactFlow
- ✅ Node palette shows all node types
- ✅ Nodes can be dragged and connected
- ✅ Workflow browser shows local flows
- ✅ Save creates/updates orchestrator
- ✅ Run starts execution

### API
- ✅ GET /orchestrator returns array
- ✅ POST /orchestrator creates new record
- ✅ GET /orchestrator/:id returns single record
- ✅ PUT /orchestrator/:id updates record
- ✅ DELETE /orchestrator/:id removes record
- ✅ POST /orchestrator/:id/run creates run record
- ✅ GET /orchestrator/providers returns provider list
- ✅ GET /orchestrator/providers/local/workflows returns flows

### Database
- ✅ orchestrator table exists
- ✅ orchestrator_run table exists
- ✅ provider_connection table exists

## Troubleshooting

### Menu item not showing
- Check browser console for errors
- Verify you're logged in
- Check permissions (should have chatflows:view)

### Cannot save orchestrator
- Check server logs
- Verify database migrations ran
- Check network tab for API errors

### Nodes not dragging
- Check browser console
- Verify ReactFlow is loaded
- Try refreshing the page

### Local flows not showing in browser
- Ensure you have created some chatflows/agentflows first
- Check API endpoint: GET /api/v1/orchestrator/providers/local/workflows
- Verify workspace permissions

### Build errors
- Run `npm run build` in packages/server
- Check for TypeScript errors
- Verify all dependencies are installed

## Database Verification

Check tables exist:
```sql
-- SQLite
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%orchestrator%';

-- Should return:
-- orchestrator
-- orchestrator_run
-- provider_connection
```

Check orchestrator data:
```sql
SELECT * FROM orchestrator;
SELECT * FROM orchestrator_run;
```

## Next Steps

Once basic functionality is verified:

1. Test with actual local flows
2. Configure RemoteWebhook nodes with real endpoints
3. Test DataMapper transformations
4. Implement Phase 2 features (n8n, Make, Zapier)
5. Add comprehensive error handling
6. Add run history UI
7. Add node configuration panels

## Known Limitations (MVP)

- Execution is simple linear flow (no complex branching yet)
- No detailed run logs in UI (only in database)
- Condition/Parallel/ErrorBoundary nodes are pass-through
- No retry/timeout configuration UI
- External providers (n8n, Make, Zapier) show as "disconnected"
- No real-time execution status updates
- No callback resumption UI

These will be addressed in Phase 2 and Phase 3.

