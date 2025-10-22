# Orchestrator Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Migrations

```bash
cd packages/server
npm run typeorm migration:run
```

This creates the three new tables: `orchestrator`, `orchestrator_run`, and `provider_connection`.

### Step 2: Start the Application

```bash
# Terminal 1 - Start server
cd packages/server
npm run dev

# Terminal 2 - Start UI
cd packages/ui
npm run dev
```

### Step 3: Access the Orchestrator

1. Open your browser to http://localhost:8080
2. Log in with your credentials
3. Look for **Orchestrator** in the left sidebar (merge icon)
4. Click to open

### Step 4: Create Your First Orchestrator

1. Click **New Orchestrator**
2. Drag a **Local Flow** node from the left palette
3. Click **Add Workflow** button
4. Select one of your existing chatflows
5. Click **Add to Canvas**
6. Click **Save** and give it a name
7. Click **Run** to execute

**Congratulations!** You've created and run your first orchestrator.

## 📋 What You Can Do Now

### Basic Operations

- ✅ Create orchestrators
- ✅ Add local Flowise flows as nodes
- ✅ Connect nodes to create workflows
- ✅ Save and edit orchestrators
- ✅ Run orchestrators
- ✅ Duplicate orchestrators
- ✅ Delete orchestrators

### Available Node Types

1. **Remote Webhook** - Call external APIs
2. **Local Flow** - Execute your Flowise chatflows/agentflows
3. **Data Mapper** - Transform data between steps
4. **Wait for Callback** - Handle async operations
5. **Condition** - Conditional logic (Phase 2)
6. **Error Handler** - Error handling (Phase 2)
7. **Parallel** - Parallel execution (Phase 2)

## 🎯 Example Use Cases

### Use Case 1: Multi-Step Research Flow

```
[Local Flow: Web Search] 
    → [Data Mapper: Extract URLs] 
    → [Local Flow: Scrape & Summarize]
    → [Remote Webhook: Send to Slack]
```

### Use Case 2: Customer Support Automation

```
[Local Flow: Classify Ticket]
    → [Condition: Route by Priority]
    → [Local Flow: Generate Response]
    → [Remote Webhook: Update CRM]
```

### Use Case 3: Content Generation Pipeline

```
[Local Flow: Generate Ideas]
    → [Data Mapper: Format Topics]
    → [Local Flow: Write Content]
    → [Local Flow: Review & Edit]
    → [Remote Webhook: Publish]
```

## 🔧 Configuration Tips

### Remote Webhook Node

Configure with:
- **URL**: Your webhook endpoint
- **Method**: GET, POST, PUT, DELETE
- **Headers**: Authentication, content-type, etc.
- **Timeout**: Default 30 seconds

### Local Flow Node

Configure with:
- **Flow ID**: Selected from your existing flows
- **Base URL**: Usually auto-detected
- **Session**: New or continue

### Data Mapper Node

Configure with:
- **Mappings**: Source field → Target field
- **Transforms**: Optional data transformations

## 📊 Monitoring

### View Run History

```bash
# Query the database
sqlite3 flowise.db "SELECT * FROM orchestrator_run ORDER BY createdDate DESC LIMIT 10;"
```

### Check Logs

Run logs are stored in the `logs` field of `orchestrator_run` table as JSON.

## 🐛 Troubleshooting

### Menu Not Showing

**Problem**: Orchestrator menu item not visible

**Solution**:
- Ensure you're logged in
- Check you have `chatflows:view` permission
- Refresh the page

### Cannot Save

**Problem**: Save button doesn't work

**Solution**:
- Check browser console for errors
- Verify migrations ran successfully
- Check server logs

### Run Fails

**Problem**: Orchestrator run fails immediately

**Solution**:
- Check node configurations are complete
- Verify local flows exist and are accessible
- Check server logs for detailed error

## 📚 Next Steps

1. **Read the Docs**: See `ORCHESTRATOR.md` for full documentation
2. **Run Tests**: See `TEST_ORCHESTRATOR.md` for testing guide
3. **Explore Examples**: Try the use cases above
4. **Phase 2**: Look forward to n8n, Make, Zapier integrations

## 🎉 You're Ready!

The Orchestrator is now part of your Flowise installation. Start building multi-workflow orchestrations that combine the best of all platforms!

---

**Need Help?**
- Check `ORCHESTRATOR.md` for detailed documentation
- Review `IMPLEMENTATION_SUMMARY.md` for technical details
- See `TEST_ORCHESTRATOR.md` for comprehensive testing guide

