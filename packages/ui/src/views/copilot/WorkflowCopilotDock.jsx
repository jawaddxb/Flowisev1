import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Divider, IconButton, Stack, Typography, Button, TextField, Menu, MenuItem, Chip, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { IconArrowsMaximize, IconHistory, IconTrash, IconSend, IconCheck, IconAlertCircle, IconPlayerPlay, IconDots } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import copilotApi from '@/api/copilot'
import QuickConfigModal from './QuickConfigModal'
import { transformIssues } from './messageTemplates'
import ActionPill from './ActionPill'
import PromptSuggestions from './PromptSuggestions'
import InlineCredentialInput from './InlineCredentialInput'

const Message = ({ role, content, quickFixes, prompts, showInput, onActionClick, onPromptClick, onInputSubmit, inputValue, onInputChange }) => (
    <Box sx={{ my: 1, px: 1.5 }}>
        <Typography variant='caption' color='text.secondary'>{role === 'assistant' ? 'Copilot' : 'You'}</Typography>
        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>{content}</Typography>
        
        {/* Render intent input field if requested */}
        {showInput && (
            <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="e.g., 'Research latest AI trends in healthcare and create a weekly report'"
                    value={inputValue}
                    onChange={(e) => onInputChange && onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            onInputSubmit && onInputSubmit()
                        }
                    }}
                    sx={{ mb: 1.5 }}
                />
                <Button 
                    variant="contained" 
                    onClick={onInputSubmit}
                    disabled={!inputValue || !inputValue.trim()}
                    sx={{ 
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        '&:hover': {
                            background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)'
                        }
                    }}
                >
                    Build this for me →
                </Button>
            </Box>
        )}
        
        {/* Render action pills if present */}
        {quickFixes && quickFixes.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap' }}>
                {quickFixes.map((fix, index) => (
                    <ActionPill
                        key={index}
                        text={fix.label}
                        icon={fix.label.includes('✨') ? '✨' : undefined}
                        variant={fix.variant || 'secondary'}
                        highlight={fix.highlight}
                        onClick={() => onActionClick && onActionClick(fix)}
                    />
                ))}
            </Box>
        )}
        
        {/* Render prompt suggestions if present */}
        {prompts && prompts.length > 0 && (
            <PromptSuggestions prompts={prompts} onSelect={(prompt) => {
                if (showInput && onInputChange) {
                    onInputChange(prompt)
                } else if (onPromptClick) {
                    onPromptClick(prompt)
                }
            }} />
        )}
    </Box>
)

const WorkflowCopilotDock = ({ open, onToggleMax, flowId, defaultOpenGreeting = true, width = 400, onFlowUpdate, currentFlowData }) => {
    const [anchorEl, setAnchorEl] = useState(null)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState([])
    const [suggestions, setSuggestions] = useState(['Create a Q&A over my docs', 'Research a topic', 'Summarize weekly updates'])
    const [mode, setMode] = useState('DISCOVERY') // DISCOVERY | DRAFT | CONFIGURE | REVIEW | READY | BUILDING (legacy)

    const historyApi = useApi(copilotApi.getHistory)
    const clearApi = useApi(copilotApi.clearHistory)
    const classifyApi = useApi(copilotApi.classifyAndPlan)
    const applyApi = useApi(copilotApi.apply)
    const undoApi = useApi(copilotApi.undo)
    const reviewApi = useApi(copilotApi.review)
    const annotateApi = useApi(copilotApi.annotate)
    const replaceApi = useApi(copilotApi.replace)
    const autoFixApi = useApi(copilotApi.autoFix)
    const [required, setRequired] = useState([])
    const [missing, setMissing] = useState([])
    const [runnable, setRunnable] = useState(false)
    const [answers, setAnswers] = useState({})
    const [schema, setSchema] = useState([])
    const [nextQuestions, setNextQuestions] = useState([])
    const [freeform, setFreeform] = useState({})
    const [planSummary, setPlanSummary] = useState('')
    const [answeredCount, setAnsweredCount] = useState(0)
    const [totalRequired, setTotalRequired] = useState(0)
    const [planType, setPlanType] = useState('')
    const [applied, setApplied] = useState(false)
    const [showUndo, setShowUndo] = useState(false)
    const [undoTimer, setUndoTimer] = useState(null)
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })
    const [configGaps, setConfigGaps] = useState([])
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [reviewData, setReviewData] = useState(null)
    const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
    const [advancedMenuAnchor, setAdvancedMenuAnchor] = useState(null)
    const [showCredentialInput, setShowCredentialInput] = useState(false)
    const [credentialToAdd, setCredentialToAdd] = useState(null)
    const [intentInput, setIntentInput] = useState('')
    const [userIntent, setUserIntent] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        if (!open || !flowId) return
        
        // Check if we have nodes
        const hasNodes = currentFlowData?.nodes?.length > 0
        
        // If has nodes but mode is DISCOVERY, this is a marketplace template - stay in DISCOVERY
        // Don't auto-trigger review, let user provide intent first
        if (hasNodes && mode === 'DISCOVERY') {
            // Clear any old history first
            clearApi.request(flowId).catch(() => {})
            
            // Reset all BUILDING mode state
            setAnswers({})
            setPlanType('')
            setPlanSummary('')
            setRunnable(false)
            setRequired([])
            setMissing([])
            setSchema([])
            setNextQuestions([])
            
            // Show discovery message for template with full explainer
            setTimeout(() => {
                setMessages([{
                    role: 'assistant',
                    content: `👋 Welcome to the Multi-Agent Research template!

📊 What this does:
Orchestrates multiple AI agents to conduct comprehensive research on any topic. Searches across web sources and delivers detailed reports.

✨ Best for:
• Market research and competitive analysis
• Academic research with multiple sources
• News monitoring and trend analysis

🔧 You'll need:
• AI model credentials (OpenAI, Anthropic, or OpenRouter)
• Optional: Web search API (Brave, Serper, etc.)

What would you like this workflow to do? Describe it in your own words.`,
                    showInput: true, // Flag to show input field
                    prompts: [
                        'Research latest AI trends in healthcare',
                        'Compare pricing models for SaaS products',
                        'Analyze competitor strategies'
                    ],
                    quickFixes: [
                        { label: 'Use template as-is', action: 'skipIntent', variant: 'secondary' }
                    ]
                }])
            }, 100)
            return
        }
        
        // For empty canvas, load history (but not in DISCOVERY mode)
        if (!hasNodes && mode !== 'DISCOVERY') {
            historyApi.request(flowId)
        }
        // eslint-disable-next-line
    }, [open, flowId, currentFlowData, mode])

    // Reactive Review: re-trigger when canvas changes (debounced)
    // Only run review in REVIEW mode (after user submits intent and configures)
    useEffect(() => {
        if (!open || !flowId || !currentFlowData) return
        if (mode !== 'REVIEW' && mode !== 'REVIEWING') return // Gate review behind state
        
        const nodeCount = currentFlowData?.nodes?.length || 0
        if (nodeCount === 0) return
        
        // Debounce review calls
        const timer = setTimeout(() => {
            setMode('REVIEWING')
            reviewApi.request({ flowId, flowData: currentFlowData })
            // Emit mode event
            window.dispatchEvent(new CustomEvent('copilot:mode', { detail: { flowId, mode: 'Review' } }))
        }, 300)
        
        return () => clearTimeout(timer)
        // eslint-disable-next-line
    }, [open, flowId, currentFlowData, mode])

    useEffect(() => {
        if (reviewApi.data) {
            setReviewData(reviewApi.data)
            // Emit review-updated event for canvas explainer
            window.dispatchEvent(new CustomEvent('copilot:review-updated', {
                detail: {
                    flowId,
                    summary: reviewApi.data.summary || '',
                    steps: reviewApi.data.steps || [],
                    runnable: reviewApi.data.runnable || false
                }
            }))
            
            // Handle CONFIGURE mode - show inline inputs for credentials/params
            if (mode === 'CONFIGURE' && (reviewApi.data.missingCredentials?.length > 0 || reviewApi.data.missingParams?.length > 0)) {
                const credCount = reviewApi.data.missingCredentials?.length || 0
                const paramCount = reviewApi.data.missingParams?.length || 0
                
                const configMessage = `🔧 Let's configure the essentials:\n\n${credCount > 0 ? `• API credentials (${credCount})` : ''}${paramCount > 0 ? `\n• Required settings (${paramCount})` : ''}\n\nI'll guide you through each one.`
                
                clearApi.request(flowId).catch(() => {})
                setTimeout(() => {
                    setMessages([
                        { role: 'assistant', content: configMessage }
                    ])
                }, 100)
            }
            
            // Add friendly guidance for gaps in REVIEWING mode (ALWAYS set this first, before history)
            if (!reviewApi.data.runnable && mode === 'REVIEWING') {
                // Transform technical issues into friendly messages
                const friendlyMessage = transformIssues(reviewApi.data)
                
                if (friendlyMessage) {
                    // Build the message content
                    let guidance = `${friendlyMessage.emoji} ${friendlyMessage.title}\n\n${friendlyMessage.description}`
                    
                    // Add issues list if multiple issues
                    if (friendlyMessage.issuesList && friendlyMessage.issuesList.length > 0) {
                        guidance += '\n\n' + friendlyMessage.issuesList.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
                    }
                    
                    // Add tip if present
                    if (friendlyMessage.tip) {
                        guidance += '\n\n' + friendlyMessage.tip
                    }
                    
                    // Add estimate if present
                    if (friendlyMessage.estimate) {
                        guidance += '\n\n' + friendlyMessage.estimate
                    }
                    
                    // Store quick fixes for rendering action buttons
                    setConfigGaps(friendlyMessage.quickFixes || [])
                    
                    // Highlight problematic nodes on canvas
                    const issues = reviewApi.data.issues || []
                    issues.forEach(issue => {
                        const disconnectedMatch = issue.match(/Node "([^"]+)" is not connected/)
                        if (disconnectedMatch) {
                            const nodeName = disconnectedMatch[1]
                            const node = currentFlowData?.nodes?.find(n => n.data.label === nodeName || n.data.name === nodeName)
                            if (node) {
                                window.dispatchEvent(new CustomEvent('copilot:highlightNode', {
                                    detail: { 
                                        nodeId: node.id,
                                        color: '#ff6b6b',
                                        pulse: true,
                                        tooltip: 'This node needs to be connected'
                                    }
                                }))
                            }
                        }
                    })
                    
                    // Clear old history and show fresh guidance
                    clearApi.request(flowId).catch(() => {})
                    setTimeout(() => {
                        setMessages([
                            { role: 'assistant', content: guidance, quickFixes: friendlyMessage.quickFixes, prompts: friendlyMessage.prompts }
                        ])
                    }, 100)
                }
            }
            
            if (reviewApi.data.runnable) {
                setRunnable(true)
                // If runnable, show positive message
                if (mode === 'REVIEWING') {
                    clearApi.request(flowId).catch(() => {})
                    setMessages([
                        { role: 'assistant', content: '✓ This workflow looks good! Click "Test it now" to run it, or "More Actions" for other options.' }
                    ])
                }
            }
        }
        // eslint-disable-next-line
    }, [reviewApi.data, mode])

    useEffect(() => {
        if (historyApi.data) {
            const msgs = (historyApi.data.messages || []).map((m) => ({ role: m.role, content: m.content }))
            
            // Don't load history in DISCOVERY, CONFIGURE, or REVIEWING modes - they have their own messages
            if (mode === 'DISCOVERY' || mode === 'CONFIGURE' || mode === 'REVIEWING') {
                return
            }
            
            if (msgs.length === 0 && defaultOpenGreeting) {
                setMessages([{ role: 'assistant', content: 'Hi! What would you like to build? Describe it in your own words.' }])
            } else if (msgs.length > 0) {
                setMessages(msgs)
            }
        }
        // eslint-disable-next-line
    }, [historyApi.data, mode])

    const send = async (text) => {
        const content = (text ?? input).trim()
        if (!content) return
        setMessages((prev) => prev.concat({ role: 'user', content }))
        setInput('')
        // Switch to building mode
        setMode('BUILDING')
        try {
            const resp = await copilotApi.chat({ message: content, flowId, context: { answers } })
            const { assistantMessage, questionSchema = [], nextQuestions: qs = [], requiredFields = [], missingFields = [], status, suggestions: sugg = [], planSummary: ps, answers: merged = {}, answeredCount: ac = 0, totalRequired: tr = 0, planType: pt = '' } = resp.data || {}
            if (assistantMessage) {
                setMessages((prev) => {
                    const last = prev[prev.length - 1]
                    if (last && last.role === 'assistant' && last.content === assistantMessage) return prev
                    return prev.concat({ role: 'assistant', content: assistantMessage })
                })
            }
            setSchema(questionSchema)
            setRequired(requiredFields)
            setMissing(missingFields)
            setRunnable(status === 'runnable')
            setAnswers(merged)
            setPlanSummary(ps || '')
            setAnsweredCount(ac)
            setTotalRequired(tr)
            setPlanType(pt)
            if (Array.isArray(sugg) && sugg.length) setSuggestions(sugg)
            setNextQuestions(qs)
            if (qs.length) {
                const chips = qs.map((q) => (q.options ? `${q.text} (${q.options.join('/')})` : q.text))
                setMessages((prev) => {
                    const line = `Next: ${chips.join(' · ')}`
                    const last = prev[prev.length - 1]
                    if (last && last.role === 'assistant' && last.content === line) return prev
                    return prev.concat({ role: 'assistant', content: line })
                })
            }
        } catch (e) {
            // handled globally by client; keep UX responsive
        }
    }

    // removed chatApi effect; we update synchronously in send()

    const setAnswer = async (key, value, isToggle = false, isMulti = false) => {
        let updated = { ...answers }
        if (isMulti && isToggle) {
            const prev = Array.isArray(updated[key]) ? updated[key] : updated[key] ? [updated[key]] : []
            const exists = prev.includes(value)
            updated[key] = exists ? prev.filter((v) => v !== value) : prev.concat(value)
        } else {
            updated[key] = value
        }
        setAnswers(updated)
        const shown = Array.isArray(updated[key]) ? updated[key].join(', ') : updated[key]
        setMessages((prev) => prev.concat({ role: 'user', content: `${key}: ${shown}` }))
        try {
            const resp = await copilotApi.chat({ message: `${key}: ${shown}`, flowId, context: { answers: updated } })
            const { assistantMessage, questionSchema = [], nextQuestions: qs = [], requiredFields = [], missingFields = [], status, suggestions: sugg = [], planSummary: ps, answers: merged = {}, answeredCount: ac = 0, totalRequired: tr = 0, planType: pt = '' } = resp.data || {}
            if (assistantMessage) {
                setMessages((prev) => {
                    const last = prev[prev.length - 1]
                    if (last && last.role === 'assistant' && last.content === assistantMessage) return prev
                    return prev.concat({ role: 'assistant', content: assistantMessage })
                })
            }
            setSchema(questionSchema)
            setRequired(requiredFields)
            setMissing(missingFields)
            setRunnable(status === 'runnable')
            setAnswers(merged)
            setPlanSummary(ps || '')
            setAnsweredCount(ac)
            setTotalRequired(tr)
            setPlanType(pt)
            if (Array.isArray(sugg) && sugg.length) setSuggestions(sugg)
            setNextQuestions(qs)
            // Emit summary update so left card refreshes immediately
            if (ps) {
                window.dispatchEvent(new CustomEvent('copilot:summary-updated', { 
                    detail: { flowId, summary: ps } 
                }))
            }
            if (qs.length) {
                const chips = qs.map((q) => (q.options ? `${q.text} (${q.options.join('/')})` : q.text))
                setMessages((prev) => {
                    const line = `Next: ${chips.join(' · ')}`
                    const last = prev[prev.length - 1]
                    if (last && last.role === 'assistant' && last.content === line) return prev
                    return prev.concat({ role: 'assistant', content: line })
                })
            }
        } catch (e) {}
    }

    const handleComplete = async () => {
        if (!runnable || !flowId) return
        try {
            const result = await applyApi.request({ flowId, answers, planType })
            if (result?.needs_config) {
                setConfigGaps(result.gaps || [])
                setShowConfigModal(true)
                return
            }
            setApplied(true)
            setMode('READY')
            
            // Build friendly toast message
            const changedLabels = (result?.changedNodes || []).map(n => n.label).join(', ')
            const message = changedLabels 
                ? `Applied ${result.changedNodes.length} changes: ${changedLabels}` 
                : result?.message || 'Workflow plan saved!'
            setToast({ open: true, message, severity: 'success' })
            setShowUndo(true)
            // Auto-hide undo after 60s
            if (undoTimer) clearTimeout(undoTimer)
            const timer = setTimeout(() => setShowUndo(false), 60000)
            setUndoTimer(timer)
            
            // Emit summary update event
            if (planSummary) {
                window.dispatchEvent(new CustomEvent('copilot:summary-updated', { detail: { flowId, summary: planSummary } }))
            }
            
            // Emit mode event
            window.dispatchEvent(new CustomEvent('copilot:mode', { detail: { flowId, mode: 'Applied' } }))
            
            // Refresh canvas with new nodes
            if (onFlowUpdate && result?.flowData) {
                onFlowUpdate(result.flowData)
            }
            
            // Highlight changed nodes
            if (result?.changedNodes?.length) {
                window.dispatchEvent(new CustomEvent('copilot:highlight-nodes', { 
                    detail: { flowId, nodes: result.changedNodes } 
                }))
                // Pan/zoom to first changed node
                window.dispatchEvent(new CustomEvent('copilot:scroll-to-node', { 
                    detail: { flowId, nodeId: result.changedNodes[0].id } 
                }))
            }
        } catch (e) {
            const msg = e?.response?.data?.message || 'Failed to save workflow plan'
            setToast({ open: true, message: msg, severity: 'error' })
        }
    }

    const handleUndo = async () => {
        if (!flowId) return
        try {
            const result = await undoApi.request(flowId)
            setApplied(false)
            setShowUndo(false)
            setMode('BUILDING')
            const message = result?.message || 'Workflow plan removed'
            setToast({ open: true, message, severity: 'info' })
            if (undoTimer) clearTimeout(undoTimer)
            
            // Emit summary update event (clear summary)
            window.dispatchEvent(new CustomEvent('copilot:summary-updated', { detail: { flowId, summary: '' } }))
            
            // Refresh canvas with restored state
            if (onFlowUpdate && result?.flowData) {
                onFlowUpdate(result.flowData)
            }
        } catch (e) {
            setToast({ open: true, message: 'Failed to undo', severity: 'error' })
        }
    }
    
    const handleConfigSubmit = async (values) => {
        // Update answers with the provided values
        const updatedAnswers = { ...answers, ...values }
        setAnswers(updatedAnswers)
        setShowConfigModal(false)
        setConfigGaps([])
        
        // Re-send to chat endpoint to update state
        try {
            const resp = await copilotApi.chat({ message: `Updated: ${Object.entries(values).map(([k, v]) => `${k}: ${v}`).join(', ')}`, flowId, context: { answers: updatedAnswers } })
            const { status, suggestions: sugg = [], planSummary: ps } = resp.data || {}
            if (status === 'runnable') {
                setRunnable(true)
                setPlanSummary(ps || '')
                setToast({ open: true, message: 'Configuration complete! Ready to apply.', severity: 'success' })
            }
            if (Array.isArray(sugg) && sugg.length) setSuggestions(sugg)
        } catch (e) {
            setToast({ open: true, message: 'Failed to update configuration', severity: 'error' })
        }
    }

    // Always show multi-select questions (like sources) until runnable;
    // also include any unanswered schema questions to guide the user.
    const displayQuestions = useMemo(() => {
        const fromSchema = (schema || [])
            .filter((q) => {
                const val = answers[q.id]
                const isEmpty = !val || (Array.isArray(val) && val.length === 0)
                return q.multi || isEmpty
            })
            .map((q) => ({ id: q.id, text: q.text, options: q.options || [], multi: Boolean(q.multi) }))

        const combined = []
        const seen = new Set()
        ;[...(nextQuestions || []), ...fromSchema].forEach((q) => {
            if (!seen.has(q.id)) {
                combined.push(q)
                seen.add(q.id)
            }
        })
        return combined
    }, [schema, nextQuestions, answers])

    const handleAnnotate = async () => {
        if (!flowId) return
        try {
            const result = await annotateApi.request({ flowId, mode: 'all' })
            setToast({ open: true, message: result?.message || 'Annotations added', severity: 'success' })
            if (onFlowUpdate && result?.flowData) {
                onFlowUpdate(result.flowData)
            }
        } catch (e) {
            setToast({ open: true, message: 'Failed to annotate', severity: 'error' })
        }
    }

    const handleReplace = async (inPlace = false) => {
        if (!flowId) return
        setShowReplaceConfirm(false)
        
        try {
            const result = await replaceApi.request({ 
                flowId, 
                template: 'RESEARCH_AGENT', 
                answers: answers,
                inPlace 
            })
            
            if (result?.createNew) {
                // Create new flow and navigate
                const chatflowsApi = (await import('@/api/chatflows')).default
                const newFlowName = `Research Agent - ${new Date().toLocaleDateString()}`
                const newFlowBody = {
                    name: newFlowName,
                    flowData: JSON.stringify({ nodes: [], edges: [] }),
                    deployed: false,
                    isPublic: false,
                    type: 'MULTIAGENT'
                }
                
                const newFlowResponse = await chatflowsApi.createNewChatflow(newFlowBody)
                if (newFlowResponse?.data?.id) {
                    const newFlowId = newFlowResponse.data.id
                    
                    // Store answers in CopilotState for the new flow
                    await copilotApi.chat({ 
                        message: 'Initialize from template', 
                        flowId: newFlowId, 
                        context: { answers: result.answers } 
                    })
                    
                    // Navigate to new flow
                    const isAgentCanvas = result.template === 'RESEARCH_AGENT'
                    const newUrl = isAgentCanvas ? `/v2/agentcanvas/${newFlowId}` : `/canvas/${newFlowId}`
                    window.location.href = newUrl
                    setToast({ open: true, message: 'New flow created! Redirecting...', severity: 'success' })
                }
            } else if (result?.applied) {
                setToast({ open: true, message: result?.message || 'Flow replaced', severity: 'success' })
                if (onFlowUpdate && result?.flowData) {
                    onFlowUpdate(result.flowData)
                }
                // Emit mode event
                window.dispatchEvent(new CustomEvent('copilot:mode', { detail: { flowId, mode: 'Applied' } }))
            } else if (result?.needs_config) {
                setConfigGaps(result.gaps || [])
                setShowConfigModal(true)
            }
        } catch (e) {
            setToast({ open: true, message: 'Failed to replace flow', severity: 'error' })
        }
    }

    const handleFixAndRun = () => {
        // Switch to building mode to fill gaps
        setMode('BUILDING')
        setMessages([{ role: 'assistant', content: 'I see you\'re editing an existing flow. What would you like to change or add?' }])
    }

    const handleAppend = async () => {
        if (!flowId) return
        
        // Simple append: use existing applyFromAnswers with current answers (will merge)
        setMode('BUILDING')
        setMessages([{ role: 'assistant', content: 'What would you like to add to this flow?' }])
        // Clear previous answers to start fresh for append
        setAnswers({})
        setPlanType('')
        setRunnable(false)
    }

    // Handle intent submission from Discovery mode
    const handleIntentSubmit = async () => {
        const userGoal = intentInput.trim()
        if (!userGoal) return
        
        // Save user's intent
        setUserIntent(userGoal)
        
        // Add user message
        setMessages(prev => [...prev, 
            { role: 'user', content: userGoal },
            { role: 'assistant', content: '✨ Perfect! Let me build that for you...\n\n• Adding AI model (GPT-4o-mini)\n• Connecting research tools\n• Setting up data flow' }
        ])
        
        setMode('DRAFT')
        setIsProcessing(true)
        
        // Call autoFixAll to normalize the template
        try {
            const result = await autoFixApi.request({ 
                flowId, 
                action: 'autoFixAll',
                params: { issues: [], intent: userGoal }
            })
            
            if (result && result.flowData) {
                onFlowUpdate(result.flowData)
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `✅ Workflow built!\n\nI've set up the structure for "${userGoal}". Now let's configure the essentials.` 
                }])
                setMode('CONFIGURE')
                // Trigger review to get credentials/params
                setTimeout(() => {
                    reviewApi.request({ flowId, flowData: result.flowData })
                }, 500)
            }
        } catch (err) {
            console.error('Intent build error:', err)
            setMessages(prev => [...prev, { role: 'assistant', content: 'I set up the basics. Let me check what else is needed...' }])
            setMode('REVIEW')
        } finally {
            setIsProcessing(false)
        }
    }
    
    // Handle action pill clicks
    const handleActionClick = async (action) => {
        if (!action) return
        
        // Handle different action types
        switch (action.action) {
            case 'skipIntent':
                // User wants to use template as-is without describing intent
                setMessages(prev => [...prev, { 
                    role: 'user', 
                    content: 'Use template as-is' 
                }, { 
                    role: 'assistant', 
                    content: '✨ Setting up the template...\n\n• Adding AI model\n• Connecting components' 
                }])
                setMode('DRAFT')
                setIsProcessing(true)
                setUserIntent('Use multi-agent research template')
                // Execute autoFixAll
                try {
                    const result = await autoFixApi.request({ 
                        flowId, 
                        action: 'autoFixAll',
                        params: { issues: [] }
                    })
                    
                    if (result && result.flowData) {
                        onFlowUpdate(result.flowData)
                        setMessages(prev => [...prev, { 
                            role: 'assistant', 
                            content: `✅ Template ready! Now let's configure the essentials.` 
                        }])
                        setMode('CONFIGURE')
                        setTimeout(() => {
                            reviewApi.request({ flowId, flowData: result.flowData })
                        }, 500)
                    }
                } catch (err) {
                    console.error('Skip intent error:', err)
                    setMode('REVIEW')
                } finally {
                    setIsProcessing(false)
                }
                break
            case 'addChatGPT':
            case 'addClaude':
                // Call auto-fix API directly
                try {
                    setMessages(prev => [...prev, { role: 'assistant', content: `Adding ${action.label}...` }])
                    const result = await autoFixApi.request({ 
                        flowId, 
                        action: action.action,
                        params: action.params || {}
                    })
                    if (result && result.flowData) {
                        // Update the canvas with new flow data
                        onFlowUpdate(result.flowData)
                        setMessages(prev => [...prev, { 
                            role: 'assistant', 
                            content: `✅ Added! Your workflow now has an AI model. Let me check for other issues...` 
                        }])
                        // Trigger re-review
                        setTimeout(() => {
                            reviewApi.request({ flowId, flowData: result.flowData })
                        }, 500)
                    }
                } catch (err) {
                    console.error('Auto-fix error:', err)
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: `Sorry, I couldn't add that automatically. You can try: "${action.label}"` 
                    }])
                }
                break
            case 'autoConnect':
            case 'deleteNode':
                // Call auto-fix API for node operations
                try {
                    const nodeName = action.params?.nodeName
                    const node = currentFlowData?.nodes?.find(n => n.data.label === nodeName || n.data.name === nodeName)
                    if (node) {
                        setMessages(prev => [...prev, { role: 'assistant', content: `Working on ${nodeName}...` }])
                        const result = await autoFixApi.request({ 
                            flowId, 
                            action: action.action,
                            params: { nodeId: node.id, ...action.params }
                        })
                        if (result && result.flowData) {
                            onFlowUpdate(result.flowData)
                            const successMsg = action.action === 'deleteNode' 
                                ? `✅ Removed "${nodeName}". Let me check for other issues...`
                                : `✅ Connected "${nodeName}". Let me check for other issues...`
                            setMessages(prev => [...prev, { role: 'assistant', content: successMsg }])
                            // Trigger re-review
                            setTimeout(() => {
                                reviewApi.request({ flowId, flowData: result.flowData })
                            }, 500)
                        }
                    }
                } catch (err) {
                    console.error('Auto-fix error:', err)
                    setMessages(prev => [...prev, { role: 'assistant', content: `I had trouble with that. Try manually fixing it.` }])
                }
                break
            case 'autoFixAll':
                // Fix all issues at once with normalization
                try {
                    // Add progress message
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: '✨ Setting up your workflow...\n\n• Adding AI model (GPT-4o-mini)\n• Connecting tools\n• Setting defaults' 
                    }])
                    
                    const result = await autoFixApi.request({ 
                        flowId, 
                        action: 'autoFixAll',
                        params: { issues: reviewData?.issues || [] }
                    })
                    
                    if (result && result.flowData) {
                        onFlowUpdate(result.flowData)
                        
                        // Add success message and move to REVIEW mode
                        setMessages(prev => [...prev, { 
                            role: 'assistant', 
                            content: `✅ Workflow structure ready!\n\nI've added an AI model and connected everything. Now checking what credentials you need...` 
                        }])
                        
                        // Move to REVIEW mode to show final checks
                        setMode('REVIEW')
                        
                        // Trigger review to get missing credentials/params
                        setTimeout(() => {
                            reviewApi.request({ flowId, flowData: result.flowData })
                        }, 800)
                    }
                } catch (err) {
                    console.error('Auto-fix all error:', err)
                    setMessages(prev => [...prev, { role: 'assistant', content: `I set up the structure. Let me check what else is needed...` }])
                    setMode('REVIEW')
                    setTimeout(() => {
                        if (currentFlowData) {
                            reviewApi.request({ flowId, flowData: currentFlowData })
                        }
                    }, 500)
                }
                break
            case 'wizard':
                // TODO: Show step-by-step wizard
                setMessages(prev => [...prev, { role: 'assistant', content: `Let's fix this step-by-step. First, ${reviewData?.issues?.[0] || 'let me guide you'}.` }])
                break
            case 'showModels':
            case 'explain':
                // Send as chat message to copilot
                setInput(action.label)
                await send(action.label)
                break
            case 'dismiss':
                // Clear messages - keep copilot open but reset
                setMode('BUILDING')
                setMessages([{ role: 'assistant', content: 'Okay! Feel free to ask me anything or make manual changes.' }])
                break
            case 'openCredentials':
                window.open('/credentials', '_blank')
                break
            case 'showCredentialInput':
                // Show inline credential input
                if (action.params?.credentials && action.params.credentials.length > 0) {
                    setCredentialToAdd(action.params.credentials[0])
                    setShowCredentialInput(true)
                }
                break
            default:
                // Fallback: send as chat message
                await send(action.label)
        }
    }
    
    // Handle saving credential from inline input
    const handleSaveCredential = async ({ credentialName, apiKey }) => {
        // TODO: Implement credential saving via API
        // For now, just show success message
        setShowCredentialInput(false)
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ API key saved! Your ${credentialName} credential is now configured. Let me check the workflow again...`
        }])
        // Trigger re-review
        setTimeout(() => {
            reviewApi.request({ flowId, flowData: currentFlowData })
        }, 500)
    }
    
    // Handle prompt suggestion clicks
    const handlePromptClick = async (prompt) => {
        if (!prompt) return
        
        // In DISCOVERY mode, skip the questionnaire and go straight to auto-fix
        if (mode === 'DISCOVERY') {
            setMessages(prev => [...prev, 
                { role: 'user', content: prompt },
                { role: 'assistant', content: '✨ Great! Let me set up this workflow for you...\n\n• Normalizing structure\n• Setting defaults\n• Connecting components' }
            ])
            
            // Call autoFixAll to normalize the workflow
            try {
                const result = await autoFixApi.request({ 
                    flowId, 
                    action: 'autoFixAll',
                    params: { issues: [] }
                })
                if (result && result.flowData) {
                    onFlowUpdate(result.flowData)
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: '✅ Workflow normalized! Let me check what else is needed...' 
                    }])
                    // Go to REVIEW mode to check credentials/params
                    setMode('REVIEW')
                    setTimeout(() => {
                        reviewApi.request({ flowId, flowData: result.flowData })
                    }, 500)
                }
            } catch (err) {
                console.error('Auto-normalize error:', err)
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: 'Let me check what this workflow needs...' 
                }])
                setMode('REVIEW')
            }
            return
        }
        
        // For other modes, send as normal chat
        setInput(prompt)
        await send(prompt)
    }

    // Summary ribbon content
    const summaryContent = useMemo(() => {
        // Don't show summary ribbon in DISCOVERY mode
        if (mode === 'DISCOVERY') {
            return null
        }
        
        if (applied) {
            return { 
                text: `✓ Workflow applied: ${planSummary || 'Changes saved'}`, 
                bgcolor: '#d4edda', 
                textColor: '#155724',
                icon: <IconCheck size={14} /> 
            }
        }
        if (runnable && planSummary) {
            const src = Array.isArray(answers.sources) ? answers.sources.join(' + ') : answers.sources || 'sources'
            const topic = answers.topic || answers.goal || 'your topic'
            const friendly = `Ready: Search ${src} for "${topic}" and deliver results`
            return { 
                text: friendly, 
                bgcolor: '#d4edda', 
                textColor: '#155724',
                icon: <IconCheck size={14} /> 
            }
        }
        if (totalRequired > 0) {
            const prettyMissing = missing.map((m) => m[0].toUpperCase() + m.slice(1)).join(', ')
            return { 
                text: `Draft: missing ${prettyMissing} (${answeredCount}/${totalRequired})`, 
                bgcolor: '#fef3c7', 
                textColor: '#78350f',
                icon: <IconAlertCircle size={14} /> 
            }
        }
        return null
    }, [applied, runnable, planSummary, answers, missing, answeredCount, totalRequired, mode])

    // Avoid conditional early return to keep hooks order consistent; hide via CSS instead

    const headerTitle = useMemo(() => {
        if (mode === 'READY') return 'Ready to test'
        if (mode === 'REVIEWING' && runnable) return 'Ready to test'
        if (mode === 'REVIEWING') return 'Review workflow'
        if (runnable) return 'Almost there'
        return 'Copilot'
    }, [mode, runnable])

    // Check if any API is loading
    const isLoading = applyApi.loading || reviewApi.loading || annotateApi.loading || replaceApi.loading

    // Unified primary CTA
    const primaryCTA = useMemo(() => {
        if (mode === 'READY') {
            return { label: 'Run workflow', icon: <IconPlayerPlay size={16} />, onClick: () => {/* TODO: open run panel */}, color: 'primary', disabled: isLoading, loading: false }
        }
        if (mode === 'REVIEWING' && runnable) {
            return { label: 'Test it now', icon: <IconPlayerPlay size={16} />, onClick: () => {/* TODO: open run panel */}, color: 'primary', disabled: isLoading, loading: false }
        }
        if (mode === 'REVIEWING' && !runnable) {
            return { label: 'Fix & test', icon: <IconCheck size={16} />, onClick: () => {
                setMode('BUILDING')
                
                // Build actionable guidance based on gaps
                if (reviewData?.missingCredentials?.length > 0 || reviewData?.missingParams?.length > 0) {
                    const credLabels = (reviewData.missingCredentials || []).map(c => c.label)
                    const paramLabels = (reviewData.missingParams || []).map(p => p.paramLabel)
                    
                    let message = "Let's get this workflow ready!\n\n"
                    if (credLabels.length > 0) {
                        message += `📌 First, connect: ${credLabels.join(', ')}\n`
                    }
                    if (paramLabels.length > 0) {
                        message += `📌 Then set: ${paramLabels.join(', ')}\n`
                    }
                    message += '\nClick "More Actions → Fix missing credentials" to set these up quickly.'
                    
                    setMessages([{ role: 'assistant', content: message }])
                } else {
                    setMessages([{ role: 'assistant', content: 'What would you like to change or add to this flow?' }])
                }
            }, color: 'warning', disabled: isLoading, loading: false }
        }
        if (mode === 'BUILDING' && runnable) {
            return { label: 'Build & test', icon: <IconCheck size={16} />, onClick: async () => {
                if (!runnable || !flowId) return
                try {
                    const result = await applyApi.request({ flowId, answers, planType })
                    if (result?.needs_config) {
                        setConfigGaps(result.gaps || [])
                        setShowConfigModal(true)
                        return
                    }
                    setApplied(true)
                    setMode('READY')
                    
                    // Build friendly toast message
                    const changedLabels = (result?.changedNodes || []).map(n => n.label).join(', ')
                    const message = changedLabels 
                        ? `Applied ${result.changedNodes.length} changes: ${changedLabels}` 
                        : 'Workflow plan applied successfully'
                    setToast({ open: true, message, severity: 'success' })
                    setShowUndo(true)
                    
                    // Emit highlight and scroll events
                    if (result?.changedNodes?.length) {
                        window.dispatchEvent(new CustomEvent('copilot:highlight-nodes', { 
                            detail: { flowId, nodes: result.changedNodes } 
                        }))
                        window.dispatchEvent(new CustomEvent('copilot:scroll-to-node', { 
                            detail: { flowId, nodeId: result.changedNodes[0].id } 
                        }))
                    }
                    
                    // Auto-hide undo after 60s
                    const timer = setTimeout(() => setShowUndo(false), 60000)
                    setUndoTimer(timer)
                    
                    // Emit summary update event
                    if (planSummary) {
                        window.dispatchEvent(new CustomEvent('copilot:summary-updated', { 
                            detail: { flowId, summary: planSummary } 
                        }))
                    }
                    
                    if (onFlowUpdate) onFlowUpdate()
                } catch (e) {
                    const msg = e?.response?.data?.message || 'Failed to save workflow plan'
                    setToast({ open: true, message: msg, severity: 'error' })
                }
            }, color: 'success', disabled: isLoading, loading: applyApi.loading }
        }
        return { label: 'Keep answering...', icon: null, onClick: null, color: 'inherit', disabled: true, loading: false }
    }, [mode, runnable, flowId, answers, planType, applyApi, planSummary, onFlowUpdate, setMode, setMessages, setApplied, setConfigGaps, setShowConfigModal, setToast, setShowUndo, setUndoTimer, isLoading, reviewData])

    return (
        <Box sx={{ position: 'absolute', top: 70, right: 0, bottom: 0, width, bgcolor: 'background.paper', borderLeft: '1px solid rgba(0,0,0,0.08)', display: open ? 'flex' : 'none', flexDirection: 'column', zIndex: 1200 }}>
            <Stack direction='row' alignItems='center' sx={{ px: 1, py: 0.5 }} spacing={1}>
                <Typography variant='subtitle2' sx={{ flex: 1 }}>{headerTitle}</Typography>
                {configGaps.length > 0 && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />}
                <IconButton size='small' onClick={(e) => setAnchorEl(e.currentTarget)}><IconHistory size={16} /></IconButton>
                <IconButton size='small' onClick={onToggleMax}><IconArrowsMaximize size={16} /></IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    <MenuItem disabled>Conversation History</MenuItem>
                    <MenuItem onClick={() => clearApi.request(flowId)}><IconTrash size={14} style={{ marginRight: 6 }} /> Clear</MenuItem>
                </Menu>
            </Stack>
            <Divider />
            {summaryContent && (
                <Box sx={{ px: 1, py: 0.75, bgcolor: summaryContent.bgcolor, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ color: summaryContent.textColor }}>{summaryContent.icon}</Box>
                    <Typography variant='caption' sx={{ flex: 1, color: summaryContent.textColor, fontWeight: 500 }}>{summaryContent.text}</Typography>
                </Box>
            )}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                {mode === 'REVIEWING' && reviewData && (
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ p: 1.5, bgcolor: reviewData.runnable ? '#d4edda' : '#fef3c7', borderRadius: 1, mb: 2 }}>
                            <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 0.5, color: reviewData.runnable ? '#155724' : '#78350f' }}>
                                {reviewData.runnable ? '✓ Flow is ready' : '⚠ Flow needs attention'}
                            </Typography>
                            <Typography variant='body2' sx={{ mb: 1, color: reviewData.runnable ? '#155724' : '#78350f' }}>
                                {reviewData.summary}
                            </Typography>
                            {!reviewData.runnable && (
                                <Box sx={{ mt: 1 }}>
                                    {(reviewData.missingCredentials || []).length > 0 && (
                                        <Typography variant='caption' sx={{ display: 'block', color: '#78350f' }}>
                                            Missing credentials: {(reviewData.missingCredentials || []).map(c => c.label).join(', ')}
                                        </Typography>
                                    )}
                                    {(reviewData.missingParams || []).length > 0 && (
                                        <Typography variant='caption' sx={{ display: 'block', color: '#78350f' }}>
                                            Missing parameters: {(reviewData.missingParams || []).map(p => p.paramLabel).join(', ')}
                                        </Typography>
                                    )}
                                    {(reviewData.issues || []).length > 0 && (
                                        <Typography variant='caption' sx={{ display: 'block', color: '#78350f' }}>
                                            Issues: {(reviewData.issues || []).slice(0, 2).join('; ')}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                        <Stack spacing={1}>
                            {/* Primary CTA for Review mode */}
                            <LoadingButton 
                                variant='contained' 
                                color={primaryCTA.color} 
                                fullWidth 
                                disabled={primaryCTA.disabled}
                                loading={primaryCTA.loading}
                                onClick={primaryCTA.onClick}
                                startIcon={primaryCTA.icon}
                            >
                                {primaryCTA.label}
                            </LoadingButton>
                            {/* Advanced actions in overflow menu */}
                            <Button 
                                variant='outlined' 
                                fullWidth 
                                onClick={(e) => setAdvancedMenuAnchor(e.currentTarget)}
                                startIcon={<IconDots size={16} />}
                            >
                                More actions
                            </Button>
                            <Menu 
                                anchorEl={advancedMenuAnchor} 
                                open={Boolean(advancedMenuAnchor)} 
                                onClose={() => setAdvancedMenuAnchor(null)}
                            >
                                {!reviewData.runnable && ((reviewData.missingCredentials || []).length > 0 || (reviewData.missingParams || []).length > 0) && (
                                    <MenuItem onClick={() => {
                                        const gaps = [
                                            ...(reviewData.missingCredentials || []).map(c => ({ field: c.field, label: c.label, type: 'credential' })),
                                            ...(reviewData.missingParams || []).map(p => ({ field: p.paramName, label: p.paramLabel, type: 'param', nodeId: p.nodeId }))
                                        ]
                                        setConfigGaps(gaps)
                                        setShowConfigModal(true)
                                        setAdvancedMenuAnchor(null)
                                    }}>
                                        Fix missing credentials
                                    </MenuItem>
                                )}
                                <MenuItem onClick={() => { setAdvancedMenuAnchor(null); handleAppend() }}>
                                    Append components
                                </MenuItem>
                                <MenuItem onClick={() => { setAdvancedMenuAnchor(null); setShowReplaceConfirm(true) }}>
                                    Replace workflow
                                </MenuItem>
                                <MenuItem onClick={() => { setAdvancedMenuAnchor(null); handleAnnotate() }}>
                                    Annotate nodes
                                </MenuItem>
                            </Menu>
                        </Stack>
                    </Box>
                )}
                {messages.map((m, i) => (
                    <Message 
                        key={i} 
                        role={m.role} 
                        content={m.content} 
                        quickFixes={m.quickFixes}
                        prompts={m.prompts}
                        showInput={m.showInput}
                        inputValue={intentInput}
                        onInputChange={setIntentInput}
                        onInputSubmit={handleIntentSubmit}
                        onActionClick={handleActionClick}
                        onPromptClick={handlePromptClick}
                    />
                ))}
                
                {/* Configure Mode - Inline Panels */}
                {mode === 'CONFIGURE' && reviewData && (
                    <Box sx={{ p: 2, border: '1px solid #e3f2fd', borderRadius: 2, backgroundColor: '#f5f5f5', my: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            🔧 Let's configure the essentials
                        </Typography>
                        
                        {/* Credentials Panel */}
                        {(reviewData.missingCredentials || []).length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    🔑 API Credentials
                                </Typography>
                                {/* Show unique credentials only */}
                                {[...new Set((reviewData.missingCredentials || []).map(c => JSON.stringify({ label: c.label, nodeName: c.nodeName })))].map((credStr, index) => {
                                    const cred = JSON.parse(credStr)
                                    return (
                                        <InlineCredentialInput
                                            key={index}
                                            credentialName={cred.nodeName}
                                            credentialLabel={cred.label}
                                            onSave={handleSaveCredential}
                                            onCancel={() => {}}
                                        />
                                    )
                                })}
                            </Box>
                        )}
                        
                        {/* Required Params Info */}
                        {(reviewData.missingParams || []).filter(p => p.paramName === 'modelName').length > 0 && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                ✅ Model settings configured with defaults (gpt-4o-mini, temperature: 0.7)
                            </Alert>
                        )}
                        
                        {/* Continue Button */}
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => {
                                setMessages(prev => [...prev, { role: 'assistant', content: 'Checking final requirements...' }])
                                setMode('REVIEW')
                                setTimeout(() => {
                                    reviewApi.request({ flowId, flowData: currentFlowData })
                                }, 300)
                            }}
                            sx={{ mt: 1 }}
                        >
                            Continue to review →
                        </Button>
                    </Box>
                )}
                
                {/* Inline credential input (from old flow) */}
                {showCredentialInput && credentialToAdd && (
                    <InlineCredentialInput
                        credentialName={credentialToAdd.nodeName || credentialToAdd.label}
                        credentialLabel={credentialToAdd.label}
                        onSave={handleSaveCredential}
                        onCancel={() => {
                            setShowCredentialInput(false)
                            setCredentialToAdd(null)
                        }}
                    />
                )}
                {displayQuestions.length > 0 && mode !== 'DISCOVERY' && mode !== 'CONFIGURE' && (
                    <Stack spacing={1} sx={{ p: 1 }}>
                        {displayQuestions.map((q) => (
                            <Box key={q.id}>
                                <Typography variant='caption' color='text.secondary'>{q.text}</Typography>
                                {Array.isArray(q.options) && q.options.length > 0 ? (
                                    <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                                        {q.options.map((opt) => {
                                            const isSelected = Array.isArray(answers[q.id]) ? answers[q.id].includes(opt) : answers[q.id] === opt
                                            const isMulti = Boolean(q.multi)
                                            return (
                                                <Chip
                                                    key={opt}
                                                    size='small'
                                                    variant={isSelected ? 'filled' : 'outlined'}
                                                    color={isSelected ? 'primary' : 'default'}
                                                    label={opt}
                                                    onClick={() => setAnswer(q.id, opt, true, isMulti)}
                                                    sx={{ mb: 0.5 }}
                                                />
                                            )
                                        })}
                                        {Boolean(q.multi) && (
                                            <Chip
                                                key={`${q.id}-clear`}
                                                size='small'
                                                variant='outlined'
                                                color='default'
                                                label='Clear'
                                                onClick={() => setAnswer(q.id, [], false, true)}
                                                sx={{ mb: 0.5 }}
                                            />
                                        )}
                                    </Stack>
                                ) : (
                                    <Stack direction='row' spacing={1} sx={{ mt: 0.5 }}>
                                        <TextField size='small' placeholder='Type answer…' value={freeform[q.id] || ''} onChange={(e) => setFreeform({ ...freeform, [q.id]: e.target.value })} fullWidth />
                                        <Button variant='outlined' size='small' onClick={() => { if ((freeform[q.id] || '').trim()) setAnswer(q.id, freeform[q.id].trim()) }}>Set</Button>
                                    </Stack>
                                )}
                            </Box>
                        ))}
                    </Stack>
                )}
                {runnable && planSummary && (
                    <Box sx={{ p: 1 }}>
                        <Typography variant='caption' color='text.secondary'>Plan</Typography>
                        <Typography variant='body2' sx={{ mb: 1 }}>{planSummary}</Typography>
                        <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                            <TextField
                                size='small'
                                placeholder='Edit topic…'
                                value={freeform.topic !== undefined ? freeform.topic : (answers.topic || '')}
                                onChange={(e) => setFreeform({ ...freeform, topic: e.target.value })}
                                fullWidth
                            />
                            <Button 
                                size='small' 
                                variant='outlined' 
                                onClick={() => { 
                                    const v = (freeform.topic || '').trim()
                                    if (v) setAnswer('topic', v)
                                }}
                            >
                                Update
                            </Button>
                        </Stack>
                    </Box>
                )}
                {mode === 'BUILDING' && messages.length <= 1 && suggestions.length > 0 && (
                    <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', p: 1, gap: 0.75 }}>
                        {suggestions.map((s) => (
                            <Chip key={s} label={s} size='small' onClick={() => send(s)} sx={{ mb: 0.5 }} />
                        ))}
                    </Stack>
                )}
                {mode === 'BUILDING' && runnable && !applied && (
                    <Box sx={{ p: 1 }}>
                        <LoadingButton 
                            variant='contained' 
                            color={primaryCTA.color} 
                            fullWidth 
                            disabled={primaryCTA.disabled}
                            loading={primaryCTA.loading}
                            onClick={primaryCTA.onClick}
                            startIcon={primaryCTA.icon}
                        >
                            {primaryCTA.label}
                        </LoadingButton>
                    </Box>
                )}
                {showUndo && (
                    <Box sx={{ p: 1 }}>
                        <Button variant='outlined' color='warning' fullWidth onClick={handleUndo} size='small'>
                            Undo last change
                        </Button>
                    </Box>
                )}
            </Box>
            <Divider />
            <Stack direction='row' spacing={1} sx={{ p: 1 }}>
                <TextField size='small' fullWidth placeholder='Describe what you want to build...' value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
                <Button variant='contained' onClick={() => send()}><IconSend size={16} /></Button>
            </Stack>
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
            </Snackbar>
            <QuickConfigModal
                open={showConfigModal}
                gaps={configGaps}
                onClose={() => setShowConfigModal(false)}
                onSubmit={handleConfigSubmit}
            />
            <Dialog open={showReplaceConfirm} onClose={() => setShowReplaceConfirm(false)}>
                <DialogTitle>Replace this flow?</DialogTitle>
                <DialogContent>
                    <Typography variant='body2'>
                        You're changing the purpose of this flow. We recommend creating a new flow instead.
                    </Typography>
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                        <Typography variant='caption' sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            💡 Best Practice
                        </Typography>
                        <Typography variant='caption'>
                            Keep existing flows intact and create new ones for different purposes. This makes it easier to compare and revert changes.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowReplaceConfirm(false)}>Cancel</Button>
                    <Button variant='outlined' onClick={() => handleReplace(true)}>
                        Replace in place
                    </Button>
                    <Button variant='contained' color='primary' onClick={() => handleReplace(false)}>
                        Create new flow
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

WorkflowCopilotDock.propTypes = {
    open: PropTypes.bool,
    onToggleMax: PropTypes.func,
    flowId: PropTypes.string,
    defaultOpenGreeting: PropTypes.bool,
    width: PropTypes.number,
    onFlowUpdate: PropTypes.func,
    currentFlowData: PropTypes.object
}

export default WorkflowCopilotDock


