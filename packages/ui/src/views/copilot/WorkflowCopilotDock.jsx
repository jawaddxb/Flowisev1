import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Box, Divider, IconButton, Stack, Typography, Button, TextField, Menu, MenuItem, Chip, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import { IconArrowsMaximize, IconHistory, IconTrash, IconSend, IconCheck, IconAlertCircle, IconPlayerPlay, IconDots, IconChartDots3 } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import copilotApi from '@/api/copilot'
import QuickConfigModal from './QuickConfigModal'
import { transformIssues } from './messageTemplates'
import ActionPill from './ActionPill'
import PromptSuggestions from './PromptSuggestions'
import InlineCredentialInput from './InlineCredentialInput'
import EmailPreviewPanel from './EmailPreviewPanel'
import WorkflowExplainerModal from './WorkflowExplainerModal'
import WorkflowPreviewPanel from './WorkflowPreviewPanel'
import { buildExplainerFromAnswers } from './utils/explainer'

const GhostPreview = ({ answers, workflowSpec }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    
    // Helper for primitive icons
    const getPrimitiveIcon = (primitive) => ({
        'data_source': '📥',
        'processor': '⚙️',
        'ai_agent': '🤖',
        'integrator': '🔗',
        'controller': '🎛️',
        'storage': '💾',
        'communicator': '📤'
    }[primitive] || '📦')
    
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
    
    // Fallback to legacy logic for backward compatibility
    const nodes = []
    
    // Handle sources as array or string
    const sources = Array.isArray(answers.sources) ? answers.sources : 
                    answers.sources ? [answers.sources] : []
    
    // Add source nodes
    if (sources.includes('Web')) nodes.push('🌐 Web Search')
    if (sources.includes('News')) nodes.push('📰 News Search')
    if (sources.includes('Twitter')) nodes.push('🐦 Twitter Search')
    if (sources.includes('Reddit')) nodes.push('💬 Reddit Search')
    if (sources.includes('YouTube')) nodes.push('🎥 YouTube Search')
    
    // Add research node with topic
    if (answers.topic) nodes.push(`🔍 Research: ${answers.topic}`)
    
    // Add delivery node
    if (answers.delivery === 'Email') nodes.push('📧 Email Sender')
    if (answers.delivery === 'Slack') nodes.push('💬 Slack Message')
    if (answers.delivery === 'Notion') nodes.push('📝 Notion Page')
    
    // Don't render if no meaningful answers
    if (nodes.length === 0) return null
    
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
                Preview
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
    const quotaApi = useApi(copilotApi.getQuota)
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
    const [explainerOpen, setExplainerOpen] = useState(false)
    const [explainerDraft, setExplainerDraft] = useState(null)
    const [lastLlmResult, setLastLlmResult] = useState(null)
    const [savedExplainer, setSavedExplainer] = useState(null)
    const [intentInput, setIntentInput] = useState('')
    const [userIntent, setUserIntent] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [showEmailPreview, setShowEmailPreview] = useState(false)
    const [prefilledFromIntentIds, setPrefilledFromIntentIds] = useState(new Set())
    const [workflowSpec, setWorkflowSpec] = useState(null)  // From LLM compiler
    const [costEstimate, setCostEstimate] = useState(null)  // Predictions/API calls estimate
    const [compileLoading, setCompileLoading] = useState(false)  // Manual loading state for compiler

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
            setWorkflowSpec(null)  // Reset LLM compiler state
            setCostEstimate(null)  // Reset cost estimate
            
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
            reviewApi.request({ flowId })
            // Emit mode event
            window.dispatchEvent(new CustomEvent('copilot:mode', { detail: { flowId, mode: 'Review' } }))
        }, 300)
        
        return () => clearTimeout(timer)
        // eslint-disable-next-line
    }, [open, flowId, currentFlowData, mode])

    // Load quota when in REVIEWING mode
    useEffect(() => {
        if (mode === 'REVIEWING' || mode === 'REVIEW') {
            quotaApi.request({})
        }
    }, [mode])

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

    // Smart pattern detection for Quick Setup (memoized to prevent React Router v6.3.0 bug)
    const detectQuickSetupIntent = useCallback((message) => {
        const text = message.toLowerCase()
        
        // Research/search keywords (more flexible matching)
        const hasResearchAction = /(research|search|find|get|fetch|monitor|track|analyz|collect)/i.test(text)
        const hasResearchTopic = /(news|trend|article|update|ai|tech|market|competitor)/i.test(text)
        
        // Delivery keywords (match plurals and variations)
        const hasEmailDelivery = /(email|send|deliver|notify|alert|message)/i.test(text)
        
        // Frequency keywords
        const hasFrequency = /(daily|weekly|every\s+day|schedule|recurring|regular)/i.test(text)
        
        // Combined intent: must have (research OR topic) AND email
        const matchesResearchEmail = (hasResearchAction || hasResearchTopic) && hasEmailDelivery
        
        // Bonus: check for explicit "workflow" mention
        const mentionsWorkflow = /(workflow|automation|automate|build|make|create)/i.test(text)
        
        console.log('[COPILOT] Pattern check:', { hasResearchAction, hasResearchTopic, hasEmailDelivery, hasFrequency, matchesResearchEmail })
        
        return {
            matches: matchesResearchEmail,
            confidence: matchesResearchEmail && (hasFrequency || mentionsWorkflow) ? 'high' : 'medium',
            suggestedIntent: hasFrequency ? 'daily research email' : 'research email'
        }
    }, [])
    
    // Parse natural language to extract workflow parameters (memoized to prevent React Router v6.3.0 bug)
    const parseNaturalIntent = useCallback((message) => {
        const text = message.toLowerCase()
        const answers = {}
        
        // Extract delivery method
        if (/\b(email|send|deliver)\b.*\b(me|to me)\b/i.test(text) || /\b(email|send)\b/i.test(text)) {
            answers.delivery = 'Email'
        } else if (/\bslack\b/i.test(text)) {
            answers.delivery = 'Slack'
        } else if (/\bnotion\b/i.test(text)) {
            answers.delivery = 'Notion'
        }
        
        // Extract frequency/timeframe
        if (/\bdaily\b/.test(text)) {
            answers.timeframe = 'Today'
            answers.schedule = 'Daily'
        } else if (/\bweekly\b/.test(text)) {
            answers.timeframe = 'Last 7 days'
            answers.schedule = 'Weekly'
        } else {
            answers.timeframe = 'Today'
            answers.schedule = 'Run now'
        }
        
        // Extract topic (the core subject) - IMPROVED LOGIC
        let topic = message
        
        // Pattern 1: "Send me [delivery] [frequency] of/about X" → extract X
        const sendMePattern = /(?:send|email|give|get)\s+(?:me\s+)?(?:an?\s+)?(?:email|message|report|summary)?\s*(?:daily|weekly)?\s*(?:of|about|on|regarding|for)?\s+(?:the\s+)?(.+?)(?:\s+(?:daily|weekly|each day|every day))?$/i
        let match = topic.match(sendMePattern)
        if (match && match[1]) {
            topic = match[1].trim()
        } else {
            // Pattern 2: "X and send/email me" → extract X before delivery keywords
            const beforeDeliveryPattern = /^(.+?)\s+(?:and\s+)?(?:email|send|deliver|notify)(?:\s+(?:me|it|that|them))?/i
            match = topic.match(beforeDeliveryPattern)
            if (match && match[1]) {
                topic = match[1].trim()
            } else {
                // Pattern 3: Remove command prefixes and get remainder
                topic = topic.replace(/^(make|build|create|give|can you|please|i want|i need|help me)\s+(?:me\s+)?(?:a\s+)?(?:workflow|automation)?\s*(?:that|which|to)?\s*/i, '')
                topic = topic.replace(/(?:and\s+)?(?:email|send|deliver)\s+(?:me|it).*$/i, '')
                topic = topic.replace(/\s+(?:daily|weekly)$/i, '')
            }
        }
        
        // Clean up prefixes that might remain
        topic = topic.replace(/^(?:the\s+)?(?:latest|recent|new|current)\s+/i, 'latest ')
        topic = topic.replace(/^(?:about|on|regarding|for)\s+/i, '')
        topic = topic.replace(/^(?:get|find|fetch|monitor|track|search|research|analyze)\s+(?:me\s+)?/i, '')
        
        // Remove schedule words from end (they're already extracted)
        topic = topic.replace(/\s+(?:daily|weekly|each day|every day)$/i, '')
        topic = topic.trim()
        
        // Only set topic if we extracted something meaningful (not just delivery/schedule words)
        // Don't reject if schedule words appeared in topic (we cleaned them above)
        if (topic && topic.length > 3 && !/(^|\s)(email|send|deliver|me)(\s|$)/i.test(topic)) {
            answers.topic = topic
        }
        
        // Default sources to Web
        answers.sources = ['Web']
        
        // Check for specific sources mentioned
        if (/\bnews\b/i.test(text)) {
            answers.sources.push('News')
        }
        if (/\btwitter\b/i.test(text)) {
            answers.sources.push('Twitter')
        }
        if (/\breddit\b/i.test(text)) {
            answers.sources.push('Reddit')
        }
        if (/\byoutube\b/i.test(text)) {
            answers.sources.push('YouTube')
        }
        
        // Remove duplicates
        answers.sources = [...new Set(answers.sources)]
        
        return answers
    }, [])

    // Explainer modal handlers
    const openExplainer = useCallback(() => {
        const draft = buildExplainerFromAnswers(answers, lastLlmResult)
        setExplainerDraft(draft)
        setExplainerOpen(true)
    }, [answers, lastLlmResult])

    const saveExplainer = useCallback(() => {
        if (!explainerDraft || !currentFlowData || !onFlowUpdate) {
            setToast({ open: true, message: 'Unable to save explainer', severity: 'error' })
            return
        }

        try {
            // Attach explainer to flowData metadata
            const updatedFlowData = {
                ...currentFlowData,
                metadata: {
                    ...(currentFlowData.metadata || {}),
                    copilotExplainer: explainerDraft
                }
            }

            // Call parent's update handler
            onFlowUpdate(updatedFlowData)
            
            // Update local saved explainer state
            setSavedExplainer(explainerDraft)
            
            setToast({ open: true, message: 'Workflow diagram saved!', severity: 'success' })
            setExplainerOpen(false)
        } catch (err) {
            console.error('Failed to save explainer:', err)
            setToast({ open: true, message: 'Failed to save diagram', severity: 'error' })
        }
    }, [explainerDraft, currentFlowData, onFlowUpdate])

    const viewSavedExplainer = useCallback(() => {
        if (savedExplainer) {
            setExplainerDraft(savedExplainer)
            setExplainerOpen(true)
        }
    }, [savedExplainer])

    // Load saved explainer from currentFlowData when available
    useEffect(() => {
        if (currentFlowData?.metadata?.copilotExplainer) {
            setSavedExplainer(currentFlowData.metadata.copilotExplainer)
        }
    }, [currentFlowData])

    const send = async (text) => {
        const content = (text ?? input).trim()
        if (!content) return
        
        // Check if this is an empty canvas (no nodes yet)
        const hasNodes = currentFlowData?.nodes?.length > 0
        
        // Debug logging
        console.log('[COPILOT] Send triggered:', { 
            content, 
            hasNodes, 
            messagesLength: messages.length,
            mode,
            willCheckPattern: (!hasNodes || mode === 'DISCOVERY') && messages.length <= 1 
        })
        
        // NEW: If this is first meaningful message and no workflowSpec yet, compile workflow with LLM
        if (!workflowSpec && messages.length === 0 && content.length > 20) {
            console.log('[COPILOT] Compiling workflow from intent:', content)
            setCompileLoading(true)
            
            try {
                // Call API directly (not via useApi hook to avoid TDZ issues)
                const compileResult = await copilotApi.compileWorkflow({
                    message: content,
                    flowId,
                    context: {
                        workspaceId: currentFlowData?.workspaceId,
                        flowData: currentFlowData
                    }
                })
                
                setCompileLoading(false)
                
                if (compileResult?.data) {
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
                    setRunnable(requiredIds.length === 0)
                    
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
                    
                    setInput('')
                    return
                }
            } catch (err) {
                console.error('[COPILOT] Workflow compilation failed:', err)
                setCompileLoading(false)
                // Fall back to old logic below
            }
        }
        
        // Detect Quick Setup intent on first message (empty canvas OR discovery mode for templates)
        if ((!hasNodes || mode === 'DISCOVERY') && messages.length <= 1) {
            const intentMatch = detectQuickSetupIntent(content)
            console.log('[COPILOT] Pattern detection result:', intentMatch)
            
            if (intentMatch.matches) {
                // TIER 1: Clear regex match
                const parsedAnswers = parseNaturalIntent(content)
                console.log('[COPILOT] Tier 1 - Regex parsed:', parsedAnswers)
                
                // Build a friendly summary of what we understood
                const summary = []
                if (parsedAnswers.topic) summary.push(`Topic: ${parsedAnswers.topic}`)
                if (parsedAnswers.delivery) summary.push(`Delivery: ${parsedAnswers.delivery}`)
                if (parsedAnswers.schedule && parsedAnswers.schedule !== 'Run now') summary.push(`Schedule: ${parsedAnswers.schedule}`)
                
                const summaryText = summary.length > 0 
                    ? `\n\nI understood:\n${summary.map(s => `• ${s}`).join('\n')}`
                    : ''
                
                // Parse-only: Pre-fill answers and show pills (no auto-build)
                setAnswers(parsedAnswers)
                // Track which fields were pre-filled from intent
                setPrefilledFromIntentIds(new Set(Object.keys(parsedAnswers)))
                setMessages(prev => [...prev, 
                    { role: 'user', content },
                    { role: 'assistant', content: `Got it! I'll pre-fill some options below.${summaryText}\n\nAdjust anything you'd like, then click "Complete" when ready.` }
                ])
                setMode('BUILDING')
                setInput('')
                
                try {
                    // Save parsed answers and get schema/questions
                    const resp = await copilotApi.chat({ 
                        message: content, 
                        flowId, 
                        context: { answers: parsedAnswers } 
                    })
                    const { assistantMessage, questionSchema = [], nextQuestions: qs = [], requiredFields = [], missingFields = [], status, suggestions: sugg = [], planSummary: ps, answers: merged = {}, answeredCount: ac = 0, totalRequired: tr = 0, planType: pt = '' } = resp.data || {}
                    
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
                } catch (err) {
                    console.error('Intent parsing error:', err)
                }
                return // Exit early - don't run normal chat flow
            } else {
                // TIER 3: LLM fallback for complex intents
                console.log('[COPILOT] Tier 1 failed, trying Tier 3 (LLM)...')
                
                try {
                    const response = await copilotApi.interpretIntent({ 
                        message: content, 
                        flowId 
                    })
                    
                    // Extract actual data from axios response
                    const llmResult = response.data
                    setLastLlmResult(llmResult) // Save for explainer generation
                    
                    console.log('[COPILOT] Tier 3 - LLM result:', llmResult)
                    console.log('[COPILOT] Tier 3 - Confidence:', llmResult.confidence, 'Extracted:', llmResult.extracted)
                    
                    // Check if LLM successfully extracted meaningful information
                    const hasExtracted = llmResult.extracted && Object.keys(llmResult.extracted).some(k => llmResult.extracted[k])
                    
                    if (llmResult.confidence !== 'low' && hasExtracted) {
                        // LLM successfully extracted intent
                        const extractedAnswers = { ...llmResult.extracted }
                        
                        // Normalize extracted values to match our schema
                        if (extractedAnswers.frequency && !extractedAnswers.schedule) {
                            extractedAnswers.schedule = extractedAnswers.frequency
                        }
                        
                        setAnswers(extractedAnswers)
                        setPrefilledFromIntentIds(new Set(Object.keys(extractedAnswers).filter(k => extractedAnswers[k])))
                        
                        const clarifyText = llmResult.clarifications_needed && llmResult.clarifications_needed.length > 0 
                            ? '\n\n' + llmResult.clarifications_needed.map(q => `❓ ${q}`).join('\n')
                            : ''
                        
                        // Map workflow types to user-friendly descriptions
                        const workflowTypeLabels = {
                            'research_and_notify': 'research topics and send notifications',
                            'chatflow': 'build a chatbot',
                            'rag': 'build a knowledge base (RAG)',
                            'unknown': 'build a custom workflow'
                        }
                        
                        const workflowTypeLabel = workflowTypeLabels[llmResult.workflow_type] || 
                                                 llmResult.workflow_type.replace(/_/g, ' ')
                        
                        setMessages(prev => [...prev, 
                            { role: 'user', content },
                            { role: 'assistant', content: `I understand you want to ${workflowTypeLabel}!${clarifyText}\n\nI've pre-filled what I understood below. Adjust anything as needed.` }
                        ])
                        setMode('BUILDING')
                        setInput('')
                        
                        // Get schema and update state from server
                        try {
                            const resp = await copilotApi.chat({ 
                                message: content, 
                                flowId, 
                                context: { answers: extractedAnswers } 
                            })
                            const { questionSchema = [], nextQuestions: qs = [], requiredFields = [], missingFields = [], status, suggestions: sugg = [], planSummary: ps, answers: merged = {}, answeredCount: ac = 0, totalRequired: tr = 0, planType: pt = '' } = resp.data || {}
                            
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
                        } catch (err) {
                            console.error('Schema fetch error:', err)
                        }
                        
                        return // Exit early - LLM successfully handled this
                    }
                    
                    console.log('[COPILOT] Tier 3 returned low confidence or no extraction, falling back to normal chat')
                } catch (err) {
                    console.log('[COPILOT] Tier 3 failed, using normal chat:', err)
                }
                // Fall through to normal chat if LLM fails or returns low confidence
            }
        }
        
        // Normal chat flow for non-Quick-Setup messages
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

    const handleComplete = useCallback(async () => {
        if (!canComplete || !flowId) return
        try {
            // NEW: Pass workflowSpec if available (from LLM compiler)
            const result = await applyApi.request({ 
                flowId, 
                answers, 
                planType,
                workflowSpec: workflowSpec,  // LLM primitive graph
                useCompiler: !!workflowSpec  // Flag to use new apply path
            })
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
    }, [flowId, applyApi, answers, planType, workflowSpec, setConfigGaps, setShowConfigModal, setApplied, setMode, setToast, setShowUndo, undoTimer, setUndoTimer, planSummary, onFlowUpdate])

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
        setWorkflowSpec(null)  // Reset LLM compiler state
        setCostEstimate(null)  // Reset cost estimate
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
                        reviewApi.request({ flowId })
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
        try {
            const client = (await import('@/api/client')).default
            
            // Map credential name to the correct field name
            const credentialFieldMap = {
                'openRouterApi': 'openRouterApiKey',
                'braveSearchApi': 'braveApiKey',
                'serperApi': 'serperApiKey',
                'serpApi': 'serpApiKey',
                'openAI': 'openAIApiKey',
                'anthropicApi': 'anthropicApiKey'
            }
            
            const fieldName = credentialFieldMap[credentialName] || `${credentialName}Key`
            
            const payload = { 
                name: `${credentialName} (Personal)`, 
                credentialName, 
                plainDataObj: { 
                    [fieldName]: apiKey 
                } 
            }
            
            await client.post('/credentials', payload)
            setShowCredentialInput(false)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ API key saved! Your ${credentialName} is now configured. Let me check the workflow again...`
            }])
            
            // Trigger re-review (use flowId only to avoid stale data)
            setTimeout(() => {
                reviewApi.request({ flowId })
            }, 500)
        } catch (err) {
            console.error('Failed to save credential:', err)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Failed to save ${credentialName}. Please try Settings → Credentials or check your connection.`
            }])
        }
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

    // Detect if current input matches Quick Setup pattern (memoized for performance)
    const inputMatchesQuickSetup = useMemo(() => {
        if (!input || input.length < 20) return false
        if (currentFlowData?.nodes?.length > 0) return false
        if (messages.length > 1) return false
        return detectQuickSetupIntent(input).matches
    }, [input, currentFlowData, messages.length])
    
    // Summary ribbon content
    const summaryContent = useMemo(() => {
        // Don't show summary ribbon in DISCOVERY mode
        if (mode === 'DISCOVERY') {
            return null
        }
        
        if (applied) {
            return { 
                text: `✅ Workflow applied successfully! Ready to test.`, 
                bgcolor: '#d4edda', 
                textColor: '#155724',
                icon: <IconCheck size={14} /> 
            }
        }
        if (mode === 'REVIEWING' && reviewData?.runnable) {
            return { 
                text: `✅ Ready to test • All configured`, 
                bgcolor: '#d4edda', 
                textColor: '#155724',
                icon: <IconCheck size={14} /> 
            }
        }
        if (mode === 'REVIEWING' && !reviewData?.runnable) {
            const credCount = reviewData?.missingCredentials?.length || 0
            const paramCount = reviewData?.missingParams?.length || 0
            const issueCount = reviewData?.issues?.length || 0
            const total = credCount + paramCount + issueCount
            return { 
                text: `⚙️ ${total} item${total !== 1 ? 's' : ''} to configure`, 
                bgcolor: '#fef3c7', 
                textColor: '#78350f',
                icon: <IconAlertCircle size={14} /> 
            }
        }
        if (runnable && planSummary) {
            const src = Array.isArray(answers.sources) ? answers.sources.join(' + ') : answers.sources || 'sources'
            const topic = answers.topic || answers.goal || 'your topic'
            const friendly = `✅ Ready: ${src} → "${topic}"`
            return { 
                text: friendly, 
                bgcolor: '#d4edda', 
                textColor: '#155724',
                icon: <IconCheck size={14} /> 
            }
        }
        if (totalRequired > 0 && mode === 'BUILDING') {
            return { 
                text: `📝 In progress: ${answeredCount}/${totalRequired} answered`, 
                bgcolor: '#e3f2fd', 
                textColor: '#1565c0',
                icon: <IconAlertCircle size={14} /> 
            }
        }
        return null
    }, [applied, runnable, planSummary, answers, answeredCount, totalRequired, mode, reviewData])

    // Compute if workflow can be completed (all required fields filled)
    const canComplete = useMemo(() => {
        if (mode !== 'BUILDING') return false
        return required.every(r => {
            const val = answers[r]
            return val && (!Array.isArray(val) || val.length > 0)
        })
    }, [mode, required, answers])

    const hasExplainableContent = useMemo(() => {
        return Boolean(answers.topic || answers.delivery || (answers.sources && answers.sources.length > 0))
    }, [answers])

    // Avoid conditional early return to keep hooks order consistent; hide via CSS instead

    const headerTitle = useMemo(() => {
        if (mode === 'READY') return 'Ready to test'
        if (mode === 'REVIEWING' && runnable) return 'Ready to test'
        if (mode === 'REVIEWING') return 'Review workflow'
        if (runnable) return 'Almost there'
        return 'Copilot'
    }, [mode, runnable])

    // Check if any API is loading
    const isLoading = applyApi.loading || reviewApi.loading || annotateApi.loading || replaceApi.loading || compileLoading

    // Unified primary CTA (avoid referencing canComplete directly to prevent TDZ in minified builds)
    const primaryCTA = useMemo(() => {
        // Compute locally to avoid cross-scope reference during minification
        const allRequiredAnswered = mode === 'BUILDING' && required.every((r) => {
            const val = answers[r]
            return Boolean(val && (!Array.isArray(val) || val.length > 0))
        })
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
        // NEW: Priority for BUILDING mode with all required answers
        if (allRequiredAnswered) {
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
    }, [mode, runnable, required, answers, handleComplete, flowId, planType, applyApi, planSummary, onFlowUpdate, setMode, setMessages, setApplied, setConfigGaps, setShowConfigModal, setToast, setShowUndo, setUndoTimer, isLoading, reviewData])

    return (
        <>
            <WorkflowPreviewPanel 
                answers={answers} 
                workflowSpec={workflowSpec}
                visible={mode === 'BUILDING' && hasExplainableContent && open}
                dockWidth={width}
            />
            <Box sx={{ position: 'absolute', top: 70, right: 0, bottom: 0, width, bgcolor: 'background.paper', borderLeft: '1px solid rgba(0,0,0,0.08)', display: open ? 'flex' : 'none', flexDirection: 'column', zIndex: 1200 }}>
            <Stack direction='row' alignItems='center' sx={{ px: 1, py: 0.5 }} spacing={1}>
                <Typography variant='subtitle2' sx={{ flex: 1 }}>{headerTitle}</Typography>
                {configGaps.length > 0 && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />}
                {savedExplainer && (
                    <Tooltip title="View Workflow Diagram">
                        <IconButton size='small' onClick={viewSavedExplainer}>
                            <IconChartDots3 size={16} />
                        </IconButton>
                    </Tooltip>
                )}
                <IconButton size='small' onClick={(e) => setAnchorEl(e.currentTarget)}><IconHistory size={16} /></IconButton>
                <IconButton size='small' onClick={onToggleMax}><IconArrowsMaximize size={16} /></IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    <MenuItem disabled>Conversation History</MenuItem>
                    <MenuItem onClick={() => {
                        clearApi.request(flowId)
                        setAnchorEl(null) // Close the menu first
                        // Reset all conversation state
                        setTimeout(() => {
                            setMessages([])
                            setAnswers({})
                            setPlanType('')
                            setPlanSummary('')
                            setRunnable(false)
                            setRequired([])
                            setMissing([])
                            setSchema([])
                            setNextQuestions([])
                            setApplied(false)
                            setShowUndo(false)
                            setReviewData(null)
                            setWorkflowSpec(null)  // NEW: Reset LLM compiler state
                            setCostEstimate(null)  // NEW: Reset cost estimate
                            setPrefilledFromIntentIds(new Set())  // Clear pre-filled tracking
                            setConfigGaps([])
                            setIntentInput('')
                            setUserIntent('')
                            setMode('BUILDING') // Reset to building mode for empty canvas
                        }, 100)
                    }}><IconTrash size={14} style={{ marginRight: 6 }} /> Clear</MenuItem>
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
                {/* Simple greeting for empty canvas */}
                {messages.length === 0 && currentFlowData?.nodes?.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        Describe what you want to build and I'll help you set it up quickly.
                    </Typography>
                )}
                
                {mode === 'REVIEWING' && reviewData && (
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ p: 1.5, bgcolor: reviewData.runnable ? '#d4edda' : '#fef3c7', borderRadius: 1, mb: 2 }}>
                            <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 0.5, color: reviewData.runnable ? '#155724' : '#78350f' }}>
                                {reviewData.runnable ? '✅ Ready to test!' : '⚙️ Almost there...'}
                            </Typography>
                            <Typography variant='body2' sx={{ mb: 1, color: reviewData.runnable ? '#155724' : '#78350f' }}>
                                {reviewData.runnable 
                                    ? 'Your workflow is configured and ready to run. Click "Test it now" to see it in action.'
                                    : 'Just a few quick items to finish:'}
                            </Typography>
                            {!reviewData.runnable && (
                                <Box sx={{ mt: 1.5 }}>
                                    {(reviewData.missingCredentials || []).length > 0 && (
                                        <Box sx={{ mb: 1 }}>
                                            <Typography variant='caption' sx={{ display: 'block', color: '#78350f', fontWeight: 600, mb: 0.5 }}>
                                                🔑 Connect your accounts:
                                            </Typography>
                                            {(reviewData.missingCredentials || []).map((c, idx) => (
                                                <Typography key={idx} variant='caption' sx={{ display: 'block', color: '#78350f', ml: 2 }}>
                                                    • {c.label} {c.isPersonal === false && '(using workspace credentials)'}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                    {(reviewData.missingParams || []).length > 0 && (
                                        <Box sx={{ mb: 1 }}>
                                            <Typography variant='caption' sx={{ display: 'block', color: '#78350f', fontWeight: 600, mb: 0.5 }}>
                                                ⚙️ Configure settings:
                                            </Typography>
                                            {(reviewData.missingParams || []).slice(0, 3).map((p, idx) => (
                                                <Typography key={idx} variant='caption' sx={{ display: 'block', color: '#78350f', ml: 2 }}>
                                                    • {p.paramLabel}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                    {(reviewData.issues || []).length > 0 && (
                                        <Box>
                                            <Typography variant='caption' sx={{ display: 'block', color: '#78350f', fontWeight: 600, mb: 0.5 }}>
                                                🔧 Fix issues:
                                            </Typography>
                                            {(reviewData.issues || []).slice(0, 2).map((issue, idx) => (
                                                <Typography key={idx} variant='caption' sx={{ display: 'block', color: '#78350f', ml: 2 }}>
                                                    • {issue}
                                                </Typography>
                                            ))}
                                        </Box>
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
                                        reviewApi.request({ flowId })
                                    }, 300)
                                }}
                            sx={{ mt: 1 }}
                        >
                            Continue to review →
                        </Button>
                    </Box>
                )}
                
                {/* Ghost Preview - show draft workflow based on answers or workflowSpec */}
                {mode === 'BUILDING' && (workflowSpec || answers.topic || answers.sources || answers.delivery) && (
                    <GhostPreview answers={answers} workflowSpec={workflowSpec} />
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
                        {displayQuestions.map((q) => {
                            const isPreFilled = prefilledFromIntentIds.has(q.id)
                            
                            // Tooltips for Sources options
                            const sourceTooltips = {
                                'Web': 'General search engines (Google, Bing, etc.)',
                                'News': 'News-specific sites and aggregators',
                                'Twitter': 'Social media posts and trends',
                                'Reddit': 'Community discussions and forums',
                                'YouTube': 'Video content and transcripts'
                            }
                            
                            return (
                                <Box key={q.id}>
                                    <Typography variant='caption' color='text.secondary'>
                                        {q.text}
                                        {isPreFilled && (
                                            <Chip 
                                                label="Pre-filled" 
                                                size="small" 
                                                color="success" 
                                                sx={{ ml: 0.5, height: 16, fontSize: '0.65rem' }} 
                                            />
                                        )}
                                    </Typography>
                                    {Array.isArray(q.options) && q.options.length > 0 ? (
                                        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                                            {q.options.map((opt) => {
                                                const isSelected = Array.isArray(answers[q.id]) ? answers[q.id].includes(opt) : answers[q.id] === opt
                                                const isMulti = Boolean(q.multi)
                                                const chip = (
                                                    <Chip
                                                        key={opt}
                                                        size='small'
                                                        variant={isSelected ? 'filled' : 'outlined'}
                                                        color={isPreFilled && isSelected ? 'success' : isSelected ? 'primary' : 'default'}
                                                        label={opt}
                                                        onClick={() => setAnswer(q.id, opt, true, isMulti)}
                                                        sx={{ mb: 0.5 }}
                                                    />
                                                )
                                                
                                                // Add tooltip for Sources options
                                                if (q.id === 'sources' && sourceTooltips[opt]) {
                                                    return (
                                                        <Tooltip key={opt} title={sourceTooltips[opt]} arrow>
                                                            {chip}
                                                        </Tooltip>
                                                    )
                                                }
                                                
                                                return chip
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
                            )
                        })}
                    </Stack>
                )}
                
                {/* Cost Estimate (if available) */}
                {mode === 'BUILDING' && costEstimate && required.every((r) => {
                    const val = answers[r]
                    return Boolean(val && (!Array.isArray(val) || val.length > 0))
                }) && (
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
                
                {/* Quota display in REVIEWING mode */}
                {(mode === 'REVIEWING' || mode === 'REVIEW') && quotaApi.data && (
                    <Alert severity='info' sx={{ m: 1 }}>
                        💳 {quotaApi.data?.predictions?.usage ?? 0} / {quotaApi.data?.predictions?.limit ?? 1000} predictions used this month
                    </Alert>
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
                        
                        {/* Email provider picker for email delivery */}
                        {answers.delivery === 'Email' && mode === 'BUILDING' && (
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                                <Typography variant='caption' sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                    Email provider
                                </Typography>
                                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                    <Chip
                                        label="📧 Platform Email (Free)"
                                        size="small"
                                        color={(!answers.emailProvider || answers.emailProvider === 'resend-platform') ? 'primary' : 'default'}
                                        onClick={() => setAnswers({ ...answers, emailProvider: 'resend-platform' })}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                    <Chip
                                        label="📧 My Gmail (OAuth)"
                                        size="small"
                                        color={answers.emailProvider === 'gmail-personal' ? 'primary' : 'default'}
                                        onClick={() => setAnswers({ ...answers, emailProvider: 'gmail-personal' })}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                    <Chip
                                        label="📧 My Outlook (OAuth)"
                                        size="small"
                                        color={answers.emailProvider === 'outlook-personal' ? 'primary' : 'default'}
                                        onClick={() => setAnswers({ ...answers, emailProvider: 'outlook-personal' })}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Stack>
                                {(!answers.emailProvider || answers.emailProvider === 'resend-platform') && (
                                    <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                                        ✓ Sends from platform email (zero configuration)
                                    </Typography>
                                )}
                                {answers.emailProvider === 'gmail-personal' && (
                                    <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
                                        Requires Gmail OAuth connection
                                    </Typography>
                                )}
                                {answers.emailProvider === 'outlook-personal' && (
                                    <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
                                        Requires Outlook OAuth connection
                                    </Typography>
                                )}
                            </Box>
                        )}
                        
                        {/* Email preview toggle for email delivery */}
                        {answers.delivery === 'Email' && !showEmailPreview && (
                            <Button 
                                size='small' 
                                variant='outlined'
                                fullWidth
                                onClick={() => setShowEmailPreview(true)}
                                sx={{ mt: 2, textTransform: 'none' }}
                            >
                                Preview Email
                            </Button>
                        )}
                    </Box>
                )}
                
                {/* Email Preview Panel */}
                {showEmailPreview && answers.delivery === 'Email' && (
                    <EmailPreviewPanel 
                        summary={planSummary}
                        answers={answers}
                        onClose={() => setShowEmailPreview(false)}
                    />
                )}
                
                {/* Preview Diagram Button */}
                {hasExplainableContent && mode === 'BUILDING' && (
                    <Box sx={{ p: 1, pt: 2 }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="medium"
                            fullWidth
                            onClick={openExplainer}
                            sx={{ mb: 1 }}
                        >
                            📊 Preview Workflow Diagram
                        </Button>
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
                <TextField 
                    size='small' 
                    fullWidth 
                    placeholder='Describe what you want to build...' 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    helperText={
                        compileLoading
                            ? '🤖 Analyzing your workflow with AI...'
                            : inputMatchesQuickSetup
                            ? '💡 Tip: I can auto-build this workflow for you'
                            : undefined
                    }
                    disabled={compileLoading}
                />
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

            {/* Workflow Explainer Modal */}
            <WorkflowExplainerModal
                open={explainerOpen}
                onClose={() => setExplainerOpen(false)}
                explainer={explainerDraft}
                onSave={saveExplainer}
            />
            </Box>
        </>
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


