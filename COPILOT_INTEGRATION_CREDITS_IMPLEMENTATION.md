# Copilot Integration & Credits System - Implementation Reference

**Status:** Phase 1-3 Complete  
**Date:** October 25, 2025  
**Architecture:** Single-Tenant SaaS (Zero Duplication)

---

## Executive Summary

Implemented a zero-configuration workflow system where 90% of Copilot-built workflows use platform-managed credentials (Serper, FireCrawl, Resend, OpenRouter) consuming from existing predictions quota, with seamless fallback to personal credentials (Gmail OAuth, Slack, Notion) for the 10% requiring user identity.

**Key Achievement:** 100% reuse of existing infrastructure - no new billing, quota, credential storage, OAuth, or execution systems.

---

## Architecture Overview

### Platform vs Personal Credentials

**Platform-Managed (Workspace Credentials):**
- Serper (web search)
- FireCrawl (web scraping)
- Resend (email sending from noreply@)
- OpenRouter (LLM routing)
- Brave Search

**Personal (User OAuth/API Keys):**
- Gmail (OAuth2)
- Outlook (Microsoft Graph)
- Slack (bot token)
- Notion (integration token)

### Credit System
- **Reuses existing:** `packages/server/src/utils/quotaUsage.ts`
- **Quota type:** Predictions (already tracked)
- **Pattern:** `checkPredictions()` → execute → `updatePredictionsUsage()`
- **No new tables or billing logic**

---

## Implementation Details

### Phase 1: CTA Consolidation ✅

**File:** `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`

**Changes:**
1. Modified `primaryCTA` useMemo (line ~1433) to prioritize `canComplete`:
   ```javascript
   if (mode === 'BUILDING' && canComplete) {
       return {
           label: 'Complete & Build Workflow',
           icon: <IconCheck size={16} />,
           onClick: handleComplete,
           color: 'success',
           disabled: isLoading,
           loading: applyApi.loading
       }
   }
   if (mode === 'BUILDING' && runnable) {
       return { label: 'Build & test', ... }
   }
   ```

2. Removed standalone "Complete & Build Workflow" button block (was lines ~1912-1928)

3. Updated dependencies: added `canComplete` and `handleComplete` to useMemo deps

**Result:** Only ONE button shows at a time based on state

---

### Phase 2: Platform Email Integration ✅

#### 2.1 Resend Credential

**File:** `packages/components/credentials/ResendApi.credential.ts` (NEW)

**Fields:**
- API Key (password, required)
- From Email (string, optional, default: noreply@yourdomain.com)

**Pattern:** Simple API key credential (like SlackApi)

#### 2.2 Resend Email Node

**File:** `packages/components/nodes/tools/Resend/Resend.ts` (NEW)

**Inputs:**
- To (recipient emails, comma-separated)
- From (sender, uses credential default if not provided)
- Subject
- Body (supports HTML)
- CC, BCC, Reply-To (all optional)

**Tool Function:** `send_email`
- Accepts JSON input or plain text
- Calls Resend API: `POST https://api.resend.com/emails`
- Returns success status and email ID

**Credential:** Links to `resendApi`

#### 2.3 Extended Company-Managed Credentials

**File:** `packages/server/src/services/copilot/CredentialValidator.ts`

**Line 65 changed:**
```typescript
const companyManagedCreds = [
    'braveSearchApi', 
    'openRouterApi', 
    'serperApi', 
    'serpApi',
    'firecrawlApi',    // ADDED
    'resendApi'        // ADDED
]
```

**Impact:** QuickConfigModal automatically detects these as workspace-managed and doesn't prompt users for them

---

### Phase 3: Email Provider Selection UI ✅

**File:** `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`

**Location:** Lines ~1884-1928 (after topic update, before email preview)

**UI Component:**
- Shows when `answers.delivery === 'Email'` and `mode === 'BUILDING'`
- Three chip options:
  1. "📧 Platform Email (Free)" - resend-platform (default)
  2. "📧 My Gmail (OAuth)" - gmail-personal
  3. "📧 My Outlook (OAuth)" - outlook-personal
- Selected chip highlighted with primary color
- Helper text below:
  - Platform: "✓ Sends from platform email (zero configuration)"
  - Personal: "Requires Gmail/Outlook OAuth connection"

**State:**
- Stored in `answers.emailProvider`
- Defaults to `resend-platform` if not set

---

### Phase 6: Platform Credential Provisioning ✅

**File:** `packages/server/scripts/setup-platform-credentials.ts` (NEW)

**Purpose:** One-time script to provision workspace credentials at deployment

**Credentials Provisioned:**
1. serperApi (PLATFORM_SERPER_KEY)
2. firecrawlApi (PLATFORM_FIRECRAWL_KEY)
3. resendApi (PLATFORM_RESEND_KEY + PLATFORM_FROM_EMAIL)
4. openRouterApi (PLATFORM_OPENROUTER_KEY)
5. braveSearchApi (PLATFORM_BRAVE_KEY)

**Pattern:**
- Reads API keys from environment variables
- Encrypts using existing encryption key
- Creates Credential entities with `workspaceId = 'platform'`
- Skips if credential already exists
- Provides summary of provisioned credentials

**Usage:**
```bash
# After building server
node dist/scripts/setup-platform-credentials.js
```

**Environment Variables Required (.env):**
```bash
PLATFORM_SERPER_KEY=your-serper-api-key
PLATFORM_FIRECRAWL_KEY=your-firecrawl-api-key
PLATFORM_RESEND_KEY=your-resend-api-key
PLATFORM_FROM_EMAIL=noreply@yourdomain.com
PLATFORM_OPENROUTER_KEY=your-openrouter-api-key
PLATFORM_BRAVE_KEY=your-brave-search-key
```

---

## Pending Implementation

### Phase 4: Server-Side Provider Mapping

**File:** Server copilot controller (where apply builds nodes)

**Needs:**
1. Map `answers.emailProvider` to correct node type:
   - `resend-platform` → Resend node with workspace credential
   - `gmail-personal` → Gmail node (triggers OAuth if credential missing)
   - `outlook-personal` → Outlook node (triggers OAuth if credential missing)

2. Enhance apply logic to include emailProvider in node selection

**Pseudocode:**
```typescript
if (answers.delivery === 'Email') {
    const provider = answers.emailProvider || 'resend-platform'
    
    if (provider === 'resend-platform') {
        // Add Resend node with workspace credential
        const resendNode = {
            type: 'resend',
            data: {
                name: 'resend',
                inputs: {
                    to: '{{user_email}}',
                    subject: `${answers.topic} - Daily Update`,
                    body: '{{summary}}'
                }
            }
        }
        nodes.push(resendNode)
        nodeNames.push('resend')
    } else if (provider === 'gmail-personal') {
        // Add Gmail node - CredentialValidator will check for gmailOAuth2
        const gmailNode = {
            type: 'gmail',
            data: {
                name: 'gmail',
                inputs: {
                    gmailType: 'messages',
                    messageActions: ['sendMessage'],
                    messageTo: '{{user_email}}',
                    messageSubject: `${answers.topic} - Daily Update`,
                    messageBody: '{{summary}}'
                }
            }
        }
        nodes.push(gmailNode)
        nodeNames.push('gmail')
    }
}

// Existing CredentialValidator.validateNodeCredentials(nodeNames, workspaceId)
// Returns gaps for missing credentials (personal or workspace)
```

### Phase 5: Quota Display

**File:** `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`

**Needs:**
1. Find existing quota API endpoint
2. Fetch quota when in REVIEWING mode
3. Display in Alert component

**Proposed UI:**
```jsx
{quotaApi.data && mode === 'REVIEWING' && (
    <Alert severity="info" sx={{ m: 1 }}>
        💳 {quotaApi.data.predictions.usage} / {quotaApi.data.predictions.limit} predictions used this month
    </Alert>
)}
```

---

## Integration Touchpoints (Zero Duplication Verified)

### ✅ Existing Systems Reused

1. **Quota System** (`quotaUsage.ts`)
   - checkPredictions() - preflight
   - updatePredictionsUsage() - post-execution
   - UsageCacheManager - quota tracking

2. **Workspace Credentials** (`credentials/index.ts`)
   - Credential entity with workspaceId
   - WorkspaceShared for sharing
   - getWorkspaceSearchOptions() for scoping

3. **Credential Validation** (`CredentialValidator.ts`)
   - companyManagedCreds list (extended)
   - isPersonal flag computation
   - validateNodeCredentials() method

4. **QuickConfigModal** (`QuickConfigModal.jsx`)
   - Auto-filters workspace credentials
   - Shows workspace creds in success alert
   - Only prompts for personal credentials
   - No changes needed!

5. **OAuth Flow** (`routes/oauth2/`)
   - Gmail OAuth callback
   - Auto-token refresh
   - No changes needed!

6. **Execution Pipeline** (`buildChatflow.ts`)
   - orgId, workspaceId, subscriptionId parameters
   - Credential resolution
   - Quota check/update hooks
   - No changes needed!

### ❌ What We Did NOT Build

- New billing tables/entities
- New quota system
- New credential storage
- New OAuth flows
- New execution pipeline
- New QuickConfig UI
- New workspace structure
- New sharing mechanism

All above already exist and work perfectly for our use case!

---

## User Journeys (Detailed)

### Journey 1: Zero-Config Workflow (90%)

```
User Intent: "Send me daily AI research via email"

1. Intent Parsed
   ├─ Tier 1 regex OR Tier 3 LLM
   ├─ answers.topic = "AI research"
   ├─ answers.sources = ["Web"]
   ├─ answers.delivery = "Email"
   ├─ answers.schedule = "Daily"
   └─ answers.emailProvider defaults to "resend-platform"

2. User Sees
   ├─ Real-time preview panel (left of Copilot)
   ├─ Pills showing answers
   ├─ Email provider picker with Platform Email selected
   └─ "✓ Sends from platform email (zero configuration)"

3. User Clicks "Complete & Build Workflow"
   ├─ copilot.apply({ flowId, answers, planType })
   ├─ CredentialValidator.validateNodeCredentials(['serper', 'firecrawl', 'resend', 'openai'])
   ├─ All workspace credentials found
   ├─ gaps = [] (no missing credentials!)
   └─ Workflow built successfully

4. Workflow Nodes Created
   ├─ Serper node (workspace credential)
   ├─ FireCrawl node (workspace credential)
   ├─ OpenAI summarize (workspace credential)
   └─ Resend email node (workspace credential)

5. First Run
   ├─ checkPredictions() passes
   ├─ Nodes execute with workspace credentials
   ├─ Email sent from noreply@yourdomain.com
   ├─ updatePredictionsUsage() increments counter
   └─ SUCCESS: Zero user configuration required!
```

### Journey 2: Personal Email Workflow (10%)

```
User Intent: Same as Journey 1

1. User Changes Provider
   ├─ Clicks "📧 My Gmail (OAuth)" chip
   └─ answers.emailProvider = "gmail-personal"

2. User Clicks "Complete & Build Workflow"
   ├─ copilot.apply() called
   ├─ CredentialValidator checks for ['serper', 'firecrawl', 'gmail', 'openai']
   ├─ Finds: workspace creds for serper, firecrawl, openai ✓
   ├─ Missing: gmailOAuth2 (personal) ✗
   └─ Returns gaps with isPersonal=true

3. QuickConfigModal Opens (Automatically)
   ├─ Success Alert: "Using workspace credentials for: Serper, FireCrawl, OpenAI"
   ├─ Prompts: "Add your personal credentials:"
   │   └─ Gmail - gmailOAuth2 [Credential] [Personal]
   └─ Message: "Please add this credential in Settings → Credentials, then retry."

4. User Clicks Link → OAuth Flow
   ├─ Redirects to Settings → Credentials
   ├─ Clicks "Add Credential" → "Gmail OAuth2"
   ├─ OAuth flow: Google consent screen
   ├─ Token stored in Credential table
   └─ Returns to workflow

5. User Retries Complete
   ├─ CredentialValidator now finds gmailOAuth2
   ├─ gaps = []
   ├─ Workflow built with mixed credentials:
   │   ├─ Serper (workspace)
   │   ├─ FireCrawl (workspace)
   │   ├─ OpenAI (workspace)
   │   └─ Gmail (user's personal OAuth)
   └─ Success!

6. First Run
   ├─ Gmail tool uses user's OAuth token
   ├─ refreshOAuth2Token() auto-refreshes if expired
   ├─ Email sent from user's Gmail inbox
   └─ updatePredictionsUsage() still increments (quota tracked)
```

### Journey 3: Insufficient Quota

```
User Intent: Same as Journey 1

1-3. Same as Journey 1

4. First Run Attempt
   ├─ checkPredictions(orgId, subscriptionId, usageCacheManager)
   ├─ Current usage: 1000 / 1000
   └─ THROWS: InternalFlowiseError('Predictions limit exceeded')

5. UI Shows Error
   ├─ Toast: "Predictions limit exceeded"
   ├─ Actionable message: "Upgrade your plan or wait for monthly quota renewal"
   └─ Alternative: "Switch to personal credentials to reduce platform usage"

6. User Switches to Personal
   ├─ Changes emailProvider to gmail-personal
   ├─ Changes search provider to personal SerpAPI (if implemented)
   └─ Reduces quota consumption
```

---

## Files Created

### 1. `packages/components/credentials/ResendApi.credential.ts`
```typescript
- Label: 'Resend API'
- Name: 'resendApi'
- Version: 1.0
- Inputs:
  - apiKey (password)
  - fromEmail (string, optional)
- Description: Links to Resend API keys page
```

### 2. `packages/components/nodes/tools/Resend/Resend.ts`
```typescript
- Label: 'Resend'
- Name: 'resend'
- Type: 'Resend'
- Category: 'Tools'
- Credential: 'resendApi'
- Inputs: to, from, subject, body, cc, bcc, replyTo
- Tool: send_email
  - Accepts JSON or plain text
  - Validates required fields
  - Calls Resend API
  - Returns email ID and status
```

### 3. `packages/server/scripts/setup-platform-credentials.ts`
```typescript
- Purpose: One-time provisioning of workspace credentials
- Provisions: serperApi, firecrawlApi, resendApi, openRouterApi, braveSearchApi
- WorkspaceId: 'platform'
- Encryption: Uses existing encryption key
- Run: node dist/scripts/setup-platform-credentials.js
```

---

## Files Modified

### 1. `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`

**Changes:**
- **Line ~1433:** Modified primaryCTA useMemo to include canComplete priority
- **Line ~1525:** Updated dependencies array
- **Lines ~1884-1928:** Added email provider picker UI
- **Removed:** Standalone Complete button block

**New UI Element:** Email provider picker
- Conditional: `answers.delivery === 'Email' && mode === 'BUILDING'`
- Three chip options with color coding
- Helper text for each option
- Stores choice in `answers.emailProvider`

### 2. `packages/server/src/services/copilot/CredentialValidator.ts`

**Changes:**
- **Line 65:** Extended companyManagedCreds array with `['firecrawlApi', 'resendApi']`

**Impact:** These credentials now flagged as workspace-managed (isPersonal=false)

---

## Testing Checklist

### Immediate Tests (Current Implementation)

- [ ] **CTA Consolidation**
  - Empty canvas → answers incomplete → "Keep answering..."
  - All required answers filled → ONE button: "Complete & Build Workflow"
  - No duplicate buttons visible

- [ ] **Email Provider Picker**
  - Delivery=Email → provider picker shows
  - Default: "Platform Email (Free)" selected
  - Click Gmail → changes to gmail-personal
  - Click Outlook → changes to outlook-personal
  - Helper text updates based on selection

- [ ] **Theme Consistency**
  - Light mode: subtle blue background for picker
  - Dark mode: proper contrast
  - Chip colors match theme

### Post-Integration Tests (After Phase 4)

- [ ] **Zero-Config Flow (Platform Email)**
  - Prerequisites: Workspace credentials provisioned
  - Build workflow with default emailProvider
  - No QuickConfigModal appears
  - Workflow builds successfully
  - Run workflow → email sent from platform

- [ ] **Personal Gmail Flow**
  - Select gmail-personal
  - QuickConfigModal shows: "Using workspace for: Serper, FireCrawl..."
  - Prompts for Gmail OAuth
  - Complete OAuth → credential stored
  - Retry Complete → workflow builds
  - Run workflow → email sent from user's Gmail

- [ ] **Personal Outlook Flow**
  - Same as Gmail but with Outlook OAuth

- [ ] **Quota Exceeded**
  - Mock quota limit reached
  - checkPredictions() throws error
  - UI shows actionable error message

- [ ] **Backward Compatibility**
  - Existing workflows without emailProvider → work unchanged
  - Manual workflows with credentials → work unchanged
  - Non-Copilot flows → unaffected

---

## Deployment Guide

### Step 1: Add Environment Variables

Add to `.env`:
```bash
PLATFORM_SERPER_KEY=sk_...
PLATFORM_FIRECRAWL_KEY=fc_...
PLATFORM_RESEND_KEY=re_...
PLATFORM_FROM_EMAIL=noreply@yourdomain.com
PLATFORM_OPENROUTER_KEY=sk-or-...
PLATFORM_BRAVE_KEY=BSA...
```

### Step 2: Build Components

```bash
cd packages/components
npm run build
```

### Step 3: Build Server

```bash
cd packages/server
npm run build
```

### Step 4: Provision Platform Credentials

```bash
cd packages/server
node dist/scripts/setup-platform-credentials.js
```

**Expected Output:**
```
🚀 Starting platform credential provisioning...
✅ Database connected
✅ Serper (Platform): Created successfully
✅ FireCrawl (Platform): Created successfully
✅ Resend (Platform): Created successfully
✅ OpenRouter (Platform): Created successfully
✅ Brave Search (Platform): Created successfully

🎉 Platform credential provisioning complete!

📝 Summary:
   - Serper (Platform) (serperApi)
   - FireCrawl (Platform) (firecrawlApi)
   - Resend (Platform) (resendApi)
   - OpenRouter (Platform) (openRouterApi)
   - Brave Search (Platform) (braveSearchApi)
```

### Step 5: Build & Deploy UI

```bash
cd packages/ui
rm -rf build node_modules/.vite
npm run build
```

### Step 6: Restart Server

```bash
pnpm start
```

### Step 7: Verify in Settings

1. Go to Settings → Credentials
2. Should see workspace credentials:
   - Serper (Platform)
   - FireCrawl (Platform)
   - Resend (Platform)
   - OpenRouter (Platform)
   - Brave Search (Platform)
3. All should show `workspaceId: platform`

### Step 8: Test Zero-Config Workflow

1. Open Copilot on empty canvas
2. Type: "Send me daily AI research via email"
3. Verify email provider defaults to "Platform Email (Free)"
4. Click "Complete & Build Workflow"
5. Should build successfully without prompts
6. Run workflow → email should be sent

---

## Monitoring & Analytics

### What to Monitor

1. **Quota Consumption**
   - Track: `predictions:${orgId}` in UsageCacheManager
   - Alert: When usage > 80% of limit
   - Action: Notify user to upgrade or optimize

2. **Provider Usage**
   - Track which providers are most used (Resend vs Gmail/Outlook)
   - Optimize: If 95% use platform email, it's working as designed

3. **Credential Gaps**
   - Track how often QuickConfigModal appears
   - Optimize: Should be < 10% of workflows

4. **OAuth Completion Rate**
   - Track: Started OAuth flows vs completed
   - Optimize: Streamline OAuth UX if abandonment rate > 20%

---

## Known Limitations & Future Work

### Current Limitations

1. **No YouTube API integration** - using web scraping for transcripts (Phase 2)
2. **No cost estimation** - quota shown but not per-run cost (Phase 5)
3. **Provider mapping incomplete** - needs Phase 4 server implementation
4. **No provider switching for search/scrape** - all use workspace defaults (future)

### Future Enhancements

1. **YouTube Data API Node**
   - OAuth2 credential for YouTube
   - Direct transcript access via API
   - Better quality than web scraping

2. **Cost Estimation**
   - Show "Est. 3 predictions per run" before building
   - Help users understand quota impact

3. **Provider Selection for All Steps**
   - Search: Serper vs Brave vs SerpAPI vs Personal
   - Scrape: FireCrawl vs Playwright vs Personal
   - LLM: OpenRouter vs OpenAI vs Personal

4. **Integration Analytics Dashboard**
   - Which providers are most popular
   - Cost per provider
   - Optimize platform spend

---

## Troubleshooting

### Issue: QuickConfigModal Shows Workspace Credentials

**Symptoms:** Modal prompts for Serper or Resend credentials

**Cause:** Workspace credentials not provisioned

**Fix:**
1. Check if provision script ran successfully
2. Verify credentials exist: `SELECT * FROM credential WHERE workspaceId = 'platform'`
3. Re-run provision script if missing

### Issue: Gmail OAuth Fails

**Symptoms:** OAuth redirect fails or token not stored

**Cause:** Existing OAuth flow issue (not related to this implementation)

**Fix:**
1. Check OAuth credentials in Settings
2. Verify redirect URIs configured in Google Console
3. Check server logs for OAuth errors

### Issue: Duplicate Buttons Still Showing

**Symptoms:** Both "Complete & Build" and "Build & test" visible

**Cause:** UI cache not cleared

**Fix:**
```bash
rm -rf packages/ui/build packages/ui/node_modules/.vite
cd packages/ui && npm run build
# Hard refresh browser: Cmd+Shift+R
```

### Issue: Resend Node Not Found

**Symptoms:** Error: "Node 'resend' not found"

**Cause:** Components not rebuilt

**Fix:**
```bash
cd packages/components
npm run build
# Restart server
```

---

## Success Metrics (Target)

- **90%+** workflows built without user credential input
- **< 2 minutes** average time-to-complete
- **100%** predictions quota accuracy
- **< 10%** QuickConfigModal appearance rate
- **< 1 minute** personal credential OAuth completion time
- **Zero** duplicate CTA button reports
- **Zero** quota system conflicts or errors

---

## Reference Links

### Code Locations

- **Quota System:** `packages/server/src/utils/quotaUsage.ts`
- **Credentials:** `packages/server/src/services/credentials/index.ts`
- **Validation:** `packages/server/src/services/copilot/CredentialValidator.ts`
- **QuickConfig:** `packages/ui/src/views/copilot/QuickConfigModal.jsx`
- **OAuth:** `packages/server/src/routes/oauth2/`
- **Execution:** `packages/server/src/utils/buildChatflow.ts`
- **Resend Node:** `packages/components/nodes/tools/Resend/Resend.ts`
- **Resend Cred:** `packages/components/credentials/ResendApi.credential.ts`
- **Provision Script:** `packages/server/scripts/setup-platform-credentials.ts`

### Existing Documentation

- Integration plan: `COPILOT_INTEGRATION_CREDITS_IMPLEMENTATION.md` (this file)
- Copilot redesign: `COPILOT_REDESIGN_PLAN.md`
- Quick setup: `COPILOT_QUICK_SETUP_FINAL.md`
- System summary: `SYSTEM_DEVELOPMENT_SUMMARY.md`

---

## Next Steps

1. **Implement Phase 4:** Server-side provider mapping in copilot.apply
2. **Implement Phase 5:** Quota display in Review mode
3. **Test:** All three user journeys
4. **Deploy:** Run provision script in production
5. **Monitor:** Track quota consumption and provider usage
6. **Iterate:** Based on user behavior and support tickets

---

**Implementation Status:**
- ✅ Phase 1: CTA Consolidation
- ✅ Phase 2: Resend Integration
- ✅ Phase 3: Email Provider Picker UI
- ⏳ Phase 4: Server Provider Mapping (pending)
- ⏳ Phase 5: Quota Display (pending)
- ✅ Phase 6: Provision Script

**Ready for:** Phase 4 implementation and end-to-end testing


