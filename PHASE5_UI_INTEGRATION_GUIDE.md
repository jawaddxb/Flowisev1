# Phase 5: UI Integration Guide

**Status:** Backend Complete, UI Integration In Progress  
**Target File:** `packages/ui/src/views/copilot/WorkflowCopilotDock.jsx`

---

## Overview

The LLM Workflow Compiler backend is complete and tested. Now we need to wire it into the UI to enable dynamic workflow building for ANY user intent.

**Current State:**
- Hard-coded schema for research workflows (topic, sources, timeframe, delivery)
- Fixed pill questions in UI
- GhostPreview shows only research workflow nodes

**Target State:**
- Dynamic schema from LLM compiler
- Adaptive questions based on workflow type
- GhostPreview shows any workflow's primitives
- Cost estimate displayed before Complete

---

## Changes Required

### 1. Add New State Variables

**Location:** Line 173+ (after existing state declarations)

```javascript
// Add after line 200
const [workflowSpec, setWorkflowSpec] = useState(null)  // From LLM compiler
const [costEstimate, setCostEstimate] = useState(null)  // Predictions/API calls estimate
const compileApi = useApi(copilotApi.compileWorkflow)  // New API hook
```

**Purpose:**
- `workflowSpec`: Stores LLM-generated primitive graph
- `costEstimate`: Stores prediction/API call estimates
- `compileApi`: Hook for calling workflow compiler endpoint

---

### 2. Modify `send()` Function - Call Compiler on First Message

**Location:** Find the `send` function (search for `const send =`)

**Current Logic:**
1. User types message
2. Calls `/copilot/chat` (hard-coded schema)
3. Returns fixed questions (topic, sources, etc.)

**New Logic:**
```javascript
const send = useCallback(async (content, triggerAutoFix = false) => {
    // ... existing loading/validation ...
    
    // NEW: If this is first meaningful message (no workflowSpec yet), compile workflow
    if (!workflowSpec && messages.length === 0 && content.length > 20) {
        console.log('[COPILOT] Compiling workflow from intent:', content)
        
        try {
            const compileResult = await compileApi.request({
                message: content,
                flowId,
                context: {
                    workspaceId: currentFlowData?.workspaceId,
                    flowData: currentFlowData
                }
            })
            
            if (compileResult.data) {
                const { workflowSpec: spec, questions, costEstimate: cost, pattern, description } = compileResult.data
                
                // Store LLM output
                setWorkflowSpec(spec)
                setCostEstimate(cost)
                setPlanType(pattern)
                
                // Convert LLM questions to schema format
                const dynamicSchema = questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    text: q.text,
                    required: q.required,
                    options: q.options || [],
                    multi: q.type === 'multiselect',
                    credentialType: q.credentialType,
                    credentialName: q.credentialName,
                    isPersonal: q.isPersonal
                }))
                
                setSchema(dynamicSchema)
                setNextQuestions(dynamicSchema.filter(q => q.required))
                
                // Calculate missing/required
                const requiredIds = questions.filter(q => q.required).map(q => q.id)
                setRequired(requiredIds)
                setMissing(requiredIds)
                setAnsweredCount(0)
                setTotalRequired(requiredIds.length)
                
                // Set mode
                setMode('BUILDING')
                
                // Add assistant message
                setMessages(prev => [
                    ...prev,
                    { role: 'user', content },
                    { 
                        role: 'assistant', 
                        content: `I understand you want to build: **${spec.workflow.name}**\n\n${description}\n\nI need a few details to set this up:` 
                    }
                ])
                
                return
            }
        } catch (err) {
            console.error('[COPILOT] Workflow compilation failed:', err)
            // Fall back to old chat endpoint
        }
    }
    
    // EXISTING: If workflowSpec exists, just collect answers
    if (workflowSpec) {
        // ... existing answer collection logic ...
    }
    
    // ... rest of existing send() logic ...
}, [workflowSpec, messages, compileApi, flowId, currentFlowData, ...])
```

**Key Changes:**
- Detect first meaningful message
- Call `compileWorkflow` API
- Store `workflowSpec`, `costEstimate`, dynamic `schema`
- Convert LLM questions to UI schema format
- Set mode to `BUILDING`
- Show workflow name and description to user

---

### 3. Update GhostPreview to Use WorkflowSpec

**Location:** Lines 20-83 (GhostPreview component)

**Current:** Hard-coded for research workflows only

**New:**
```javascript
const GhostPreview = ({ answers, workflowSpec }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    
    // If we have workflowSpec from LLM, use primitives
    if (workflowSpec?.workflow?.nodes) {
        const nodes = workflowSpec.workflow.nodes.map(node => {
            const icon = getPrimitiveIcon(node.primitive)
            return `${icon} ${node.label}`
        })
        
        return (
            <Box sx={{ 
                p: 2, 
                borderRadius: `${customization.borderRadius}px`,
                bgcolor: theme.palette.card.main,
                border: `1px solid ${theme.palette.grey[900]}25`,
                my: 2,
                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
            }}>
                <Typography variant="caption" sx={{ 
                    fontWeight: 600, 
                    display: 'block', 
                    mb: 1.5,
                    color: 'text.secondary'
                }}>
                    Preview ({workflowSpec.workflow.pattern})
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {nodes.map((n, idx) => (
                        <Chip 
                            key={`ghost-node-${idx}`}
                            label={n} 
                            size="small" 
                            sx={{ 
                                bgcolor: theme.palette.primary.light + '20',
                                color: theme.palette.primary.main,
                                border: `1px solid ${theme.palette.primary.main}40`,
                                '&:hover': {
                                    bgcolor: theme.palette.primary.light + '30'
                                }
                            }} 
                        />
                    ))}
                </Stack>
            </Box>
        )
    }
    
    // ... existing fallback logic for legacy workflows ...
}

const getPrimitiveIcon = (primitive) => ({
    'data_source': '📥',
    'processor': '⚙️',
    'ai_agent': '🤖',
    'integrator': '🔗',
    'controller': '🎛️',
    'storage': '💾',
    'communicator': '📤'
}[primitive] || '📦')
```

**Pass workflowSpec prop:**
```jsx
{mode === 'BUILDING' && <GhostPreview answers={answers} workflowSpec={workflowSpec} />}
```

---

### 4. Render Dynamic Questions from Schema

**Location:** Find where pills are rendered (search for `ActionPill` or pill rendering loop)

**Current:** Hard-coded pill questions for research workflows

**New:** Map over `schema` array

```jsx
{/* Dynamic questions from LLM compiler */}
{schema.map((question) => {
    // Skip credential questions (handled separately)
    if (question.type === 'credential') return null
    
    // Text input
    if (question.type === 'text' || question.type === 'number') {
        return (
            <Box key={question.id} sx={{ mb: 2 }}>
                <Typography variant='caption' sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    {question.text}
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    type={question.type}
                    placeholder={question.default || `Enter ${question.id}`}
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    required={question.required}
                />
            </Box>
        )
    }
    
    // Single choice
    if (question.type === 'choice' && !question.multi) {
        return (
            <Box key={question.id} sx={{ mb: 2 }}>
                <Typography variant='caption' sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    {question.text}
                </Typography>
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {question.options.map(opt => (
                        <Chip
                            key={opt}
                            label={opt}
                            size="small"
                            color={answers[question.id] === opt ? 'primary' : 'default'}
                            onClick={() => setAnswers({ ...answers, [question.id]: opt })}
                            sx={{ cursor: 'pointer' }}
                        />
                    ))}
                </Stack>
            </Box>
        )
    }
    
    // Multi-select
    if (question.type === 'choice' && question.multi) {
        const selected = Array.isArray(answers[question.id]) ? answers[question.id] : []
        return (
            <Box key={question.id} sx={{ mb: 2 }}>
                <Typography variant='caption' sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    {question.text}
                    {prefilledFromIntentIds.has(question.id) && (
                        <Chip label="Pre-filled" size="small" sx={{ ml: 1, height: 16, fontSize: '0.7rem' }} />
                    )}
                </Typography>
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {question.options.map(opt => (
                        <Chip
                            key={opt}
                            label={opt}
                            size="small"
                            color={selected.includes(opt) ? 'primary' : 'default'}
                            onClick={() => {
                                const newSelected = selected.includes(opt)
                                    ? selected.filter(s => s !== opt)
                                    : [...selected, opt]
                                setAnswers({ ...answers, [question.id]: newSelected })
                            }}
                            sx={{ cursor: 'pointer' }}
                        />
                    ))}
                </Stack>
            </Box>
        )
    }
    
    return null
})}
```

---

### 5. Display Cost Estimate

**Location:** After questions, before Complete button

```jsx
{/* Cost Estimate (if available) */}
{mode === 'BUILDING' && costEstimate && canComplete && (
    <Alert severity='info' icon={<IconChartDots3 size={16} />} sx={{ m: 1 }}>
        <Typography variant='caption' sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
            Estimated cost per run:
        </Typography>
        <Typography variant='caption'>
            🤖 {costEstimate.predictions_per_run} AI prediction{costEstimate.predictions_per_run > 1 ? 's' : ''} • 
            📡 {costEstimate.external_api_calls} API call{costEstimate.external_api_calls > 1 ? 's' : ''} • 
            Complexity: {costEstimate.complexity}
        </Typography>
        {costEstimate.estimated_monthly_cost && (
            <Typography variant='caption' sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                ~{costEstimate.estimated_monthly_cost} predictions/month
            </Typography>
        )}
    </Alert>
)}
```

---

### 6. Wire Complete Button to applyFromWorkflowSpec

**Location:** Find `handleComplete` function

**Current:** Calls `applyFromAnswers` with hard-coded planType

**New:** Call new apply path that uses WorkflowSpec

```javascript
const handleComplete = useCallback(async () => {
    if (!canComplete) return
    
    try {
        // NEW: Pass workflowSpec to apply
        const result = await applyApi.request({
            flowId,
            answers,
            planType,
            workflowSpec: workflowSpec,  // LLM primitive graph
            useCompiler: true  // Flag to use new apply path
        })
        
        if (result.data) {
            if (result.data.needs_config) {
                // Show credential config modal
                setConfigGaps(result.data.gaps)
                setShowConfigModal(true)
                return
            }
            
            if (result.data.applied) {
                // Success
                setToast({ open: true, message: result.data.message || 'Workflow built!', severity: 'success' })
                setApplied(true)
                setMode('READY')
                
                // Update flow data
                if (onFlowUpdate) {
                    onFlowUpdate(result.data.flowData)
                }
                
                // Show undo option
                setShowUndo(true)
                const timer = setTimeout(() => setShowUndo(false), 10000)
                setUndoTimer(timer)
            }
        }
    } catch (err) {
        console.error('[COPILOT] Apply failed:', err)
        setToast({ open: true, message: 'Failed to build workflow', severity: 'error' })
    }
}, [canComplete, applyApi, flowId, answers, planType, workflowSpec, onFlowUpdate])
```

---

### 7. Update Server Apply Endpoint to Handle useCompiler Flag

**File:** `packages/server/src/controllers/copilot/index.ts`

**Modify apply endpoint:**

```typescript
export const apply = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId, answers, planType, workflowSpec, useCompiler } = req.body
        
        // NEW: If useCompiler flag set, use applyFromWorkflowSpec
        if (useCompiler && workflowSpec) {
            const result = await copilotService.applyFromWorkflowSpec(flowId, workflowSpec, answers)
            return res.json(result)
        }
        
        // LEGACY: Use old applyFromAnswers for backward compatibility
        const result = await copilotService.applyFromAnswers(flowId, answers, planType)
        return res.json(result)
    } catch (err) {
        next(err)
    }
}
```

---

## Testing Checklist

### 1. Simple Workflow (Research)
- [ ] Type: "Send me daily AI research via email"
- [ ] Compiler returns WorkflowSpec
- [ ] Dynamic questions appear
- [ ] GhostPreview shows 4 primitive nodes
- [ ] Cost estimate displays
- [ ] Complete button builds workflow
- [ ] Nodes created correctly

### 2. Complex Workflow (Content Pipeline)
- [ ] Type: "YouTube → Whisper → GPT → Blog"
- [ ] Compiler detects content_pipeline pattern
- [ ] Questions ask for: channel_id, blog_platform, blog_url
- [ ] Credential gaps detected (YouTube OAuth, Blog API)
- [ ] QuickConfigModal appears for missing credentials
- [ ] After filling, workflow builds correctly

### 3. Multi-Platform Workflow (Social Automation)
- [ ] Type: "Post Shopify product to Instagram, LinkedIn, Twitter"
- [ ] Compiler detects trigger_action pattern
- [ ] Parallel execution groups created (3 social posts)
- [ ] Multiple credential gaps detected
- [ ] Cost estimate shows 1 prediction, 4 API calls

### 4. Backward Compatibility
- [ ] Existing research workflows still work
- [ ] Hard-coded schema fallback works
- [ ] Old CopilotState records handled gracefully

---

## Summary of Changes

**Lines to Modify:** ~5 sections in WorkflowCopilotDock.jsx

1. **State additions** (3 new variables)
2. **send() function** (add compiler call logic)
3. **GhostPreview component** (use workflowSpec nodes)
4. **Question rendering** (dynamic from schema)
5. **Cost display** (new Alert component)
6. **handleComplete** (pass workflowSpec to apply)

**Backend Change:** 1 file

- `packages/server/src/controllers/copilot/index.ts` (add useCompiler flag handling)

**Estimated Time:** 2 hours for clean implementation + testing

---

## Notes

- Keep existing chat endpoint as fallback
- Don't break existing workflows
- Use try/catch around compiler calls
- Show loading states during compilation
- Log compiler results for debugging
- Handle LLM failures gracefully (fall back to chat)

**Status:** Ready to implement once approved


