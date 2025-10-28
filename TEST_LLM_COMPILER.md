# Test LLM Workflow Compiler - Quick Start

**Status:** ✅ System Ready for Testing  
**URL:** http://localhost:3000

---

## 🚀 Quick Test (2 minutes)

### Step 1: Hard Refresh Browser
```
Press: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
Or: Open incognito window at http://localhost:3000
```

### Step 2: Create New Chatflow
1. Click "+ Add New" → Chatflow
2. Name it: "Test LLM Compiler"
3. Click "Save"

### Step 3: Open Copilot
1. Click Copilot icon (bottom right)
2. You should see: "👋 What would you like to build?"

### Step 4: Type Intent
```
Send me daily AI research via email
```
**Press Enter**

### Step 5: Observe LLM Compilation

**Browser Console (F12):**
```javascript
[COPILOT] Send triggered: {...}
[COPILOT] Compiling workflow from intent: "Send me daily AI research via email"
```

**Copilot Response:**
```
I understand you want to build: **Daily AI Research Email**

Search web for AI research daily and deliver via email

I need a few details to set this up:
```

### Step 6: Check Ghost Preview

**Should see:**
```
Preview (research_notify)
📥 Web Search | ⚙️ Web Scraper | 🤖 AI Summarizer | 📤 Email Sender
```

### Step 7: Fill Questions

**What topic should I research?**
```
AI trends in healthcare
```
Click "Set"

**How often?**
Click: **Daily**

### Step 8: Check Cost Estimate

**Should see alert:**
```
Estimated cost per run:
🤖 1 AI prediction • 📡 2 API calls • Complexity: low
~30 predictions/month
```

### Step 9: Click Complete

**Button should now be enabled:**
```
[Complete & Build Workflow]
```
Click it.

### Step 10: Verify Workflow Created

**Should see:**
- ✅ Success message: "Workflow applied! Added 4 nodes and 3 connections."
- ✅ 4 nodes appear on canvas
- ✅ Edges connecting them
- ✅ Credentials attached (platform credentials auto-assigned)

---

## 🎯 Advanced Tests

### Test 2: Content Pipeline (3 minutes)

**Input:**
```
When a new YouTube video is published → extract transcript with Whisper → summarize with GPT → post to blog
```

**Expected:**
- Pattern: `content_pipeline`
- Nodes: 4 (YouTube Monitor, Whisper, GPT, Blog Publisher)
- Questions: channel_id, blog_platform, blog_url
- Credentials: YouTube OAuth, Blog API (personal - should prompt)
- Cost: 2 predictions, 3 API calls, medium complexity

**Verification:**
- Ghost Preview shows 4 primitives with correct icons
- Credential prompts appear for YouTube + Blog
- After connecting, workflow builds successfully
- Canvas shows 4 nodes with proper connections

---

### Test 3: Social Automation (5 minutes)

**Input:**
```
Post my new Shopify product to Instagram, LinkedIn, and Twitter with AI-written captions
```

**Expected:**
- Pattern: `trigger_action`
- Nodes: 5 (Shopify, Caption Generator, Instagram, LinkedIn, Twitter)
- Parallel Execution: 3 social posts (should see parallel_group: 1)
- Credentials: Shopify + 3 social OAuth (personal)
- Cost: 1 prediction, 4 API calls, high complexity

**Verification:**
- Ghost Preview shows 5 primitives
- QuickConfigModal prompts for 4 credentials
- After connecting, workflow builds with parallel edges
- 3 social posts fan out from caption generator

---

### Test 4: Scheduled Report (3 minutes)

**Input:**
```
Every Friday, pull Stripe payments and send weekly summary to Slack
```

**Expected:**
- Pattern: `scheduled_report`
- Nodes: 3 (Stripe, Summarizer, Slack)
- Schedule: Detected "Every Friday"
- Credentials: Stripe API, Slack bot (personal)
- Cost: 1 prediction, 2 API calls, low complexity

---

### Test 5: CRM Sync (3 minutes)

**Input:**
```
When someone fills Typeform → add to Notion CRM → send welcome email via Gmail
```

**Expected:**
- Pattern: `crm_sync`
- Nodes: 3 (Typeform, Notion, Gmail)
- Credentials: Typeform, Notion, Gmail OAuth (all personal)
- Cost: 0 predictions, 3 API calls, low complexity

---

## Debug Checklist

### If Compilation Doesn't Trigger

**Check Browser Console:**
```javascript
// Should see this
[COPILOT] Send triggered: { content: "...", hasNodes: false, messagesLength: 0 }
[COPILOT] Compiling workflow from intent: "..."

// If you see this instead, compilation was skipped
[COPILOT] Pattern detection result: { matches: true, ... }
```

**Reasons:**
- Message too short (< 20 chars) → Increase length
- Already have workflowSpec → Clear conversation
- Messages length > 0 → Clear conversation first
- Hard refresh didn't work → Try incognito

**Fix:**
```javascript
// In browser console, clear state:
localStorage.clear()
sessionStorage.clear()
location.reload(true)
```

---

### If Questions Don't Appear

**Check Browser Console:**
```javascript
// After compilation, should see schema
console.log(schema)  // Should be an array of questions

// Check state
console.log(workflowSpec)  // Should be an object
console.log(costEstimate)  // Should be an object
```

**Reasons:**
- API call failed → Check Network tab
- Response parsing issue → Check response.data structure
- State not updated → Check setSchema() call

---

### If Ghost Preview Empty

**Check:**
```javascript
// workflowSpec should have nodes
console.log(workflowSpec?.workflow?.nodes)  // Should be array[4]

// Rendering condition
console.log(mode === 'BUILDING')  // Should be true
console.log(workflowSpec || answers.topic)  // Should be truthy
```

**Reasons:**
- workflowSpec not set → Check API response
- Rendering condition not met → Check mode state
- PropTypes error → Check console for warnings

---

### If Cost Estimate Not Showing

**Check:**
```javascript
console.log('Cost:', costEstimate)  // Should be object
console.log('canComplete:', canComplete)  // Should be true
console.log('mode:', mode)  // Should be 'BUILDING'
```

**Reasons:**
- costEstimate null → Check API response
- canComplete false → Fill all required fields
- mode not BUILDING → Check state transitions

---

### If Apply Fails

**Check Network Tab:**
```
POST /api/v1/copilot/apply
Payload should include:
{
  "flowId": "...",
  "answers": {...},
  "planType": "content_pipeline",
  "workflowSpec": {...},
  "useCompiler": true
}
```

**Server Logs:**
```
tail -f /tmp/flowise-phase5.log | grep -i "apply\|compiler\|primitive"
```

**Reasons:**
- workflowSpec missing → Check state before apply
- useCompiler not set → Check handleComplete code
- Credential validation failed → Check gaps in response

---

## Console Commands (Browser DevTools)

### Inspect State
```javascript
// Check if compiler is active
window.compileApi  // Should exist

// Check workflowSpec
// (React DevTools needed for direct state access)
```

### Force Compilation
```javascript
// Manually trigger (if needed for debugging)
fetch('http://localhost:3000/api/v1/copilot/compile-workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'YOUR_WORKFLOW_INTENT' })
})
.then(r => r.json())
.then(data => console.log('Compiled:', data))
```

### Clear All State
```javascript
localStorage.clear()
sessionStorage.clear()
location.reload(true)
```

---

## Expected vs Actual Comparison

### Simple Research Workflow

**Input:**
```
Send me daily AI research via email
```

**Expected Response:**
```json
{
  "workflowSpec": {
    "workflow": {
      "name": "Daily AI Research Email",
      "pattern": "research_notify",
      "nodes": [
        {"primitive": "data_source", "label": "Web Search"},
        {"primitive": "processor", "label": "Web Scraper"},
        {"primitive": "ai_agent", "label": "AI Summarizer"},
        {"primitive": "communicator", "label": "Email Sender"}
      ]
    }
  },
  "questions": [
    {"id": "topic", "text": "What topic should I research?", "type": "text"},
    {"id": "frequency", "text": "How often?", "type": "choice", "options": ["Daily", "Weekly"]}
  ],
  "costEstimate": {
    "predictions_per_run": 1,
    "external_api_calls": 2,
    "complexity": "low"
  }
}
```

**Actual (verified with curl):** ✅ Matches exactly

---

### Complex Social Workflow

**Input:**
```
Post my Shopify product to Instagram, LinkedIn, and Twitter with AI captions
```

**Expected Response:**
```json
{
  "workflowSpec": {
    "workflow": {
      "name": "Shopify Social Media Automation",
      "pattern": "trigger_action",
      "nodes": [
        {"primitive": "data_source", "label": "Shopify New Product"},
        {"primitive": "ai_agent", "label": "AI Caption Generator"},
        {"primitive": "communicator", "label": "Instagram Post", "parallel_group": 1},
        {"primitive": "communicator", "label": "LinkedIn Post", "parallel_group": 1},
        {"primitive": "communicator", "label": "Twitter Post", "parallel_group": 1}
      ]
    }
  },
  "costEstimate": {
    "predictions_per_run": 1,
    "external_api_calls": 4,
    "complexity": "high"
  }
}
```

**Actual (verified with curl):** ✅ Matches exactly (including parallel groups)

---

## Success Indicators

### ✅ System Working If You See:

1. **Console Log:** `[COPILOT] Compiling workflow from intent`
2. **Copilot Message:** `I understand you want to build: **[Name]**`
3. **Ghost Preview:** Shows primitive nodes with icons (📥🤖📤)
4. **Dynamic Questions:** Adapted to workflow type (not always topic/sources)
5. **Cost Estimate:** Alert shows before Complete button
6. **Apply Success:** Nodes appear on canvas after Complete

### ❌ Issues If You See:

1. **No compilation log** → Check message length, state, or hard refresh
2. **"I don't understand"** → Compiler failed, check API response
3. **Empty Ghost Preview** → workflowSpec not set, check state
4. **Hard-coded questions** → Using legacy path, check compileApi call
5. **No cost estimate** → Check costEstimate state and canComplete
6. **Apply fails** → Check useCompiler flag in request

---

## Server Health Check

### Verify Server Running
```bash
curl http://localhost:3000/api/v1/ping
# Should return: "pong"
```

### Check Compiler Initialized
```bash
tail -20 /tmp/flowise-phase5.log | grep -i "compiler\|openai"
# Should see: "[WorkflowCompiler] OpenAI client initialized with GPT-4o"
```

### Test Endpoint Directly
```bash
curl -X POST http://localhost:3000/api/v1/copilot/compile-workflow \
  -H "Content-Type: application/json" \
  -d '{"message": "Send me daily AI research via email"}' | python3 -m json.tool
```

---

## Report Issues

### Gather Debug Info

**Browser Console:**
1. Save console logs (right-click → Save as)
2. Check Network tab for failed requests
3. Note any error messages

**Server Logs:**
```bash
tail -100 /tmp/flowise-phase5.log
```

**State Snapshot:**
```javascript
// In browser console after compilation
console.log({
  workflowSpec,
  costEstimate,
  schema,
  answers,
  mode,
  canComplete
})
```

---

**Ready to test! Hard refresh browser and try your first workflow.** 🚀


