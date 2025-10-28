# Copilot Redesign - Intent-Driven Quick Setup

## Current State vs Target State

### Current (What I Built - WRONG)
- ❌ Quick Setup button appears immediately before user input
- ❌ Hardcoded to "Research → Email" workflow
- ❌ Auto-triggers and builds immediately on pattern match
- ❌ Bypasses user confirmation
- ❌ One-size-fits-all approach
- ❌ No visual preview during configuration
- ❌ Pattern detection too strict (word boundaries fail on plurals)

### Target (What You Actually Want - CORRECT)
- ✅ No Quick Setup button - the flow itself is quick
- ✅ User describes ANY intent first
- ✅ System parses and shows what it understood
- ✅ Pre-fills pills based on parsed intent
- ✅ Shows ghost preview as user configures
- ✅ "Complete" button appears when ready
- ✅ Complete → builds workflow
- ✅ LLM handles complex/unclear intents

## The Fundamental Difference

**Current:** Button-driven, one workflow type, auto-trigger  
**Target:** Intent-driven, adaptive, confirmation-based

## Detailed Redesign

### 1. Remove Quick Setup Button

**Delete from WorkflowCopilotDock.jsx (lines ~1315-1383):**
```jsx
{/* Quick Setup CTA for DISCOVERY or empty BUILDING */}
{(mode === 'DISCOVERY' || ...) && (
    <Box sx={{ mb: 2, p: 2, border: '2px dashed #2196F3', ... }}>
        <Typography variant='h6'>⚡ Quick Setup</Typography>
        ...
        <LoadingButton ...>Quick Setup: Research → Email</LoadingButton>
    </Box>
)}
```

**Replace with simple greeting:**
```jsx
{messages.length === 0 && (
    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
        👋 Describe what you want to build and I'll help you set it up quickly.
    </Typography>
)}
```

### 2. Fix Regex Patterns (Already Done)

**Changed from:**
```javascript
const hasEmailDelivery = /\b(email|send|deliver)\b/.test(text)  // Fails on "emails"
```

**To:**
```javascript
const hasEmailDelivery = /(email|send|deliver)/i.test(text)  // Matches plurals
```

### 3. Redesign send() Logic

**Current send() flow:**
```javascript
// Tries to auto-trigger and build immediately
if (pattern matches) {
    autoFixApi.request() // Builds workflow without confirmation
}
```

**Target send() flow:**
```javascript
const send = async (text) => {
    // Always parse first
    const parsed = parseNaturalIntent(text)
    
    // Always call chat endpoint (it uses LLM for complex cases)
    const resp = await copilotApi.chat({ 
        message: text, 
        flowId, 
        context: { answers: parsed } 
    })
    
    // Show pills with pre-selections from parsed answers
    setAnswers(resp.data.answers) // Merged with parsed
    setSchema(resp.data.questionSchema)
    
    // Pills now show with pre-selections
    // "Complete" button shows if runnable
}
```

### 4. Add Ghost Preview

**New component showing draft workflow:**
```jsx
const GhostPreview = ({ answers }) => {
    const nodes = []
    if (answers.sources?.includes('Web')) nodes.push('Web Search')
    if (answers.topic) nodes.push(`Research: ${answers.topic}`)
    if (answers.delivery === 'Email') nodes.push('Email Sender')
    
    return (
        <Box sx={{ p: 1.5, border: '1px dashed #90caf9', borderRadius: 1, bgcolor: 'rgba(144, 202, 249, 0.05)', my: 2 }}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                Preview (building...)
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {nodes.map(node => (
                    <Chip 
                        key={node} 
                        label={node} 
                        size="small" 
                        sx={{ opacity: 0.7, fontSize: '0.7rem' }} 
                    />
                ))}
            </Stack>
        </Box>
    )
}
```

**Integrate in Dock:**
```jsx
{mode === 'BUILDING' && Object.keys(answers).length > 0 && (
    <GhostPreview answers={answers} />
)}
```

### 5. Visual Pill States

**Enhance pill rendering in displayQuestions section:**
```jsx
{displayQuestions.map((q) => {
    const isPreFilled = parsedFromIntent.includes(q.id) // Track which were parsed
    
    return (
        <Box key={q.id}>
            <Typography variant='caption' color='text.secondary'>
                {q.text} {isPreFilled && <Chip label="Pre-filled" size="small" color="success" sx={{ ml: 0.5 }} />}
            </Typography>
            <Stack direction='row' spacing={1}>
                {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt || answers[q.id]?.includes(opt)
                    return (
                        <Chip
                            key={opt}
                            label={opt}
                            variant={isSelected ? 'filled' : 'outlined'}
                            color={isPreFilled && isSelected ? 'success' : isSelected ? 'primary' : 'default'}
                            onClick={() => setAnswer(q.id, opt, true, q.multi)}
                        />
                    )
                })}
            </Stack>
        </Box>
    )
})}
```

### 6. Smart Complete Button

**Already exists but needs visibility refinement:**
```jsx
const canComplete = useMemo(() => {
    return required.every(r => {
        const val = answers[r]
        return val && (!Array.isArray(val) || val.length > 0)
    })
}, [required, answers])

// Show prominently when ready
{canComplete && (
    <LoadingButton
        variant="contained"
        color="success"
        size="large"
        fullWidth
        onClick={handleComplete}
        loading={applyApi.loading}
        sx={{ my: 2 }}
    >
        ✓ Complete & Build Workflow
    </LoadingButton>
)}
```

### 7. Add Tooltips

**For Sources pills:**
```jsx
import { Tooltip } from '@mui/material'

<Tooltip title="General search engines (Google, Bing, etc.)">
    <Chip label="Web" ... />
</Tooltip>
<Tooltip title="News-specific sites (Google News, news aggregators)">
    <Chip label="News" ... />
</Tooltip>
```

## Key Behavioral Changes

### Auto-Trigger Removed
**Before:** Pattern match → immediately call autoFixApi → build nodes  
**After:** Pattern match → parse → show pills → user confirms → clicks Complete → build nodes

### Pills Always Show (When Intent Understood)
**Before:** Only after answering questions one by one  
**After:** All pills show immediately with pre-selections

### Ghost Preview
**Before:** No preview until Applied  
**After:** Preview updates as each pill is answered

## Server Changes (Minimal)

The existing `/copilot/chat` endpoint already:
- ✅ Returns questionSchema
- ✅ Parses some patterns
- ✅ Merges answers
- ✅ Returns status (runnable/draft)

**What we use:**
- Tier 1: Client-side regex (instant)
- Tier 2: Existing chat endpoint
- Tier 3: Chat endpoint can call LLM if needed (future enhancement)

**No server changes needed for v1!**

## Migration Path

### Step 1: Remove Auto-Trigger
- Delete Quick Setup button
- Remove immediate autoFixAll call
- Keep pattern detection for parsing only

### Step 2: Enhance Pills Display
- Always show pills after first message
- Add visual states (pre-filled, required)
- Add tooltips

### Step 3: Add Ghost Preview
- Create GhostPreview component
- Show as answers are filled

### Step 4: Refine Complete Button
- Make more prominent
- Show when canComplete
- Change text to "Complete & Build Workflow"

## Risks & Mitigations

### Risk: Slower perceived flow
**Before:** Click button → instant build (but wrong workflow)  
**After:** Type → confirm pills → click Complete (but correct workflow)

**Mitigation:** If all pills are pre-filled correctly, it's still 1 click (Complete)

### Risk: Pattern parsing errors
**Before:** Didn't matter, hardcoded workflow  
**After:** Wrong parse = wrong pre-selections

**Mitigation:** 
- User can change any pill
- Ghost preview shows what will be built
- Fallback to LLM for unclear cases

### Risk: More complex UI state
**Before:** Simple button  
**After:** Pills + preview + smart Complete

**Mitigation:**
- Reuse existing pill rendering
- GhostPreview is simple component
- Complete button logic already exists

## Testing Strategy

After each change:
1. Rebuild UI: `cd packages/ui && rm -rf build && npm run build`
2. Restart server: `bash restart-server.sh`
3. Test at http://localhost:3000
4. Verify in browser console

### Test Cases:
1. "Send me AI research daily" → Should show all pills pre-filled, Complete enabled
2. "Email me research" → Should show pills, topic required
3. "Track competitors and notify team" → Should ask clarifying questions

## Current Build/Cache Issues

**Problems we've hit:**
- React Router v6.3.0 bug (fixed with useCallback)
- Vite build cache issues
- Browser aggressive caching
- PostCSS dev server crash

**Solutions applied:**
- useCallback for all functions
- Removed justCleared useEffect (caused React error #321)
- Fixed CORS credentials for dev mode
- Disabled PostCSS in vite.config
- Cache-busting timestamps in HTML

**Current status:**
- Server running on port 3000 ✅
- Latest build with regex fixes ✅
- Ready for redesign ✅

## Recommendation

Given the build/cache issues we've experienced, I recommend:

**Option A: Incremental Redesign (Safer)**
1. First: Just remove Quick Setup button, keep everything else
2. Test thoroughly
3. Then: Add ghost preview
4. Test thoroughly
5. Then: Enhance pills visual states
6. Final: Refine Complete button

**Option B: Full Redesign Now (Faster but riskier)**
- Make all changes at once
- One build/test cycle
- Higher risk of new issues

Which approach would you prefer?


