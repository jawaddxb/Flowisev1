import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { CopilotEdit } from '../../database/entities/CopilotEdit'
import { CopilotState } from '../../database/entities/CopilotState'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { NodeTemplateResolver } from './NodeTemplateResolver'
import { CredentialValidator, CredentialMapping } from './CredentialValidator'
import { GraphValidator } from './GraphValidator'

// Per-flow lock to prevent duplicate auto-apply
const applyLocks = new Map<string, number>()

const Operation = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add_node'), node: z.any() }),
    z.object({ op: z.literal('remove_node'), nodeId: z.string() }),
    z.object({ op: z.literal('connect'), edge: z.any() }),
    z.object({ op: z.literal('set_param'), nodeId: z.string(), path: z.string(), value: z.any() })
])

const PlanResult = z.object({ operations: z.array(Operation), previewFlowData: z.any() })

const plan = async (flowData: any, instruction: string) => {
    // v1 stub: do not call LLM yet; return no-op preview
    return PlanResult.parse({ operations: [], previewFlowData: flowData })
}

const apply = async (chatflowId: string, operations: any[]) => {
    const app = getRunningExpressApp()
    const repo = app.AppDataSource.getRepository(ChatFlow)
    const chatflow = await repo.findOneBy({ id: chatflowId })
    if (!chatflow) throw new Error('Chatflow not found')
    // v1 stub: no-op apply; keep existing flowData
    return { flowData: JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}') }
}

/**
 * Build a complete graph (nodes + edges) from user answers
 */
const buildGraphFromAnswers = async (
    answers: Record<string, any>, 
    planType: string, 
    credentialMappings: CredentialMapping[]
) => {
    const nodes: any[] = []
    const edges: any[] = []
    
    // Shared variables for delivery (used across plan types)
    const delivery = answers.delivery || 'In-app'
    const emailProvider = answers.emailProvider || 'resend-platform'
    
    // Helper to find credential ID for a node
    const getCredentialId = (nodeName: string): string | undefined => {
        return credentialMappings.find(m => m.nodeName === nodeName)?.credentialId
    }
    
    // Helper to create sticky note explaining a node
    const makeNote = (baseNode: any, text: string, color = '#DBEAFE') => ({
        id: `copilot_note_${baseNode.id}`,
        type: 'stickyNote',
        position: { x: Math.max(20, baseNode.position.x + 350), y: Math.max(20, baseNode.position.y) },
        positionAbsolute: { x: Math.max(20, baseNode.position.x + 350), y: Math.max(20, baseNode.position.y) },
        width: 220,
        height: 110,
        data: { 
            id: `copilot_note_${baseNode.id}`, 
            label: text, 
            color, 
            type: 'StickyNote', 
            selected: false 
        },
        selected: false,
        dragging: false
    })
    
    if (planType === 'MULTIAGENT') {
        // Research workflow: Tools + Model → Agent
        const sources = Array.isArray(answers.sources) ? answers.sources : [answers.sources]
        // Require explicit topic/goal; no hard-coded default
        const topic = answers.topic || answers.goal
        if (!topic) {
            throw new Error('Missing required topic/goal; please confirm the topic before applying.')
        }
        const schedule = answers.schedule || 'Run now'
        
        const toolNodes: any[] = []
        let yOffset = 100
        
        // 1. Add search tool nodes based on sources
        if (sources.includes('Web')) {
            const braveNode = NodeTemplateResolver.createNode({
                name: 'braveSearchAPI',
                label: 'Web Search',
                position: { x: 100, y: yOffset },
                inputs: {},
                credential: getCredentialId('braveSearchAPI')
            })
            nodes.push(braveNode)
            nodes.push(makeNote(braveNode, `Added: Web Search\nFinds fresh links for your topic.`))
            toolNodes.push(braveNode)
            yOffset += 200
        }
        
        // 2. Add Web Scraper Tool
        const scraperNode = NodeTemplateResolver.createNode({
            name: 'webScraperTool',
            label: 'Web Scraper',
            position: { x: 100, y: yOffset },
            inputs: {
                maxDepth: 1,
                maxPages: 5,
                scrapeMode: 'recursive'
            }
        })
        nodes.push(scraperNode)
        nodes.push(makeNote(scraperNode, `Added: Web Scraper\nFetches page details for summaries.`))
        toolNodes.push(scraperNode)
        yOffset += 250
        
        // 3. Add ChatOpenRouter model
        const llmNode = NodeTemplateResolver.createNode({
            name: 'chatOpenRouter',
            label: 'AI Model',
            position: { x: 500, y: 150 },
            inputs: {
                modelName: 'openai/gpt-4o-mini',
                temperature: 0.7,
                streaming: true
            },
            credential: getCredentialId('chatOpenRouter')
        })
        nodes.push(llmNode)
        nodes.push(makeNote(llmNode, `Added: AI Model\nSummarizes and synthesizes findings.`))
        
        // 4. Add ToolAgent to orchestrate
        const agentNode = NodeTemplateResolver.createNode({
            name: 'toolAgent',
            label: 'Research Agent',
            position: { x: 900, y: 200 },
            inputs: {
                systemMessage: `You are a research assistant. Search for information about: ${topic}. Analyze the results and provide a comprehensive summary.`
            }
        })
        nodes.push(agentNode)
        nodes.push(makeNote(agentNode, `Added: Research Agent\nOrchestrates tools to research "${topic}".`))
        
        // 5. Wire edges: Model → Agent, Tools → Agent
        // Model to Agent
        const modelOutputHandle = NodeTemplateResolver.findOutputHandle(llmNode, 'BaseChatModel')
        const agentModelInputHandle = NodeTemplateResolver.findInputHandle(agentNode, 'BaseChatModel')
        if (modelOutputHandle && agentModelInputHandle) {
            edges.push(NodeTemplateResolver.createEdge(llmNode.id, modelOutputHandle, agentNode.id, agentModelInputHandle))
        }
        
        // Tools to Agent
        for (const toolNode of toolNodes) {
            const toolOutputHandle = NodeTemplateResolver.findOutputHandle(toolNode, 'Tool')
            const agentToolInputHandle = NodeTemplateResolver.findInputHandle(agentNode, 'Tool')
            if (toolOutputHandle && agentToolInputHandle) {
                edges.push(NodeTemplateResolver.createEdge(toolNode.id, toolOutputHandle, agentNode.id, agentToolInputHandle))
            }
        }
        
        // 6. Add delivery note as sticky
        const deliveryNote = {
            id: `note_delivery_${uuidv4().substring(0, 8)}`,
            type: 'stickyNote',
            position: { x: 1300, y: 100 },
            positionAbsolute: { x: 1300, y: 100 },
            width: 250,
            height: 120,
            data: {
                id: `note_delivery_${uuidv4().substring(0, 8)}`,
                label: `📤 Deliver to: ${delivery}\n⏰ ${schedule}`,
                color: '#10B981',
                type: 'StickyNote',
                selected: false
            },
            selected: false,
            dragging: false
        }
        nodes.push(deliveryNote)
        
        // 7. Add delivery node based on provider
        if (delivery === 'Email') {
            const provider = emailProvider
            let deliveryNode: any | null = null
            
            if (provider === 'resend-platform') {
                deliveryNode = NodeTemplateResolver.createNode({
                    name: 'resend',
                    label: 'Platform Email',
                    position: { x: 1300, y: 300 },
                    inputs: {
                        to: '{{user_email}}',
                        subject: `${topic} - ${schedule}`,
                        body: '{{summary}}'
                    },
                    credential: getCredentialId('resend')
                })
            } else if (provider === 'gmail-personal') {
                deliveryNode = NodeTemplateResolver.createNode({
                    name: 'gmail',
                    label: 'Gmail',
                    position: { x: 1300, y: 300 },
                    inputs: {
                        gmailType: 'messages',
                        messageActions: ['sendMessage'],
                        messageTo: '{{user_email}}',
                        messageSubject: `${topic} - ${schedule}`,
                        messageBody: '{{summary}}'
                    }
                })
            } else if (provider === 'outlook-personal') {
                deliveryNode = NodeTemplateResolver.createNode({
                    name: 'microsoftOutlook',
                    label: 'Outlook',
                    position: { x: 1300, y: 300 },
                    inputs: {
                        outlookType: 'message',
                        messageActions: ['sendMessage'],
                        toSendMessage: '{{user_email}}',
                        subjectSendMessage: `${topic} - ${schedule}`,
                        bodySendMessage: '{{summary}}'
                    }
                })
            }
            
            if (deliveryNode) {
                nodes.push(deliveryNode)
                nodes.push(makeNote(deliveryNode, `Added: ${deliveryNode.label}\nDelivers results via email.`, '#E0F2FE'))
            }
        }
        
    } else {
        // Simple chatflow: just add a chat model
        const llmNode = NodeTemplateResolver.createNode({
            name: 'chatOpenRouter',
            label: 'Chat Model',
            position: { x: 250, y: 150 },
            inputs: {
                modelName: 'openai/gpt-4o-mini',
                temperature: 0.7
            },
            credential: getCredentialId('chatOpenRouter')
        })
        nodes.push(llmNode)
    }
    
    return { nodes, edges }
}

const applyFromAnswers = async (flowId: string, answers: Record<string, any>, planType: string) => {
    const app = getRunningExpressApp()
    const flowRepo = app.AppDataSource.getRepository(ChatFlow)
    const editRepo = app.AppDataSource.getRepository(CopilotEdit)
    
    const chatflow = await flowRepo.findOneBy({ id: flowId })
    if (!chatflow) throw new Error('Chatflow not found')
    
    const currentFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
    const workspaceId = chatflow.workspaceId
    
    // Get node names for credential validation
    const nodeNamesNeededBase = planType === 'MULTIAGENT'
        ? ['braveSearchAPI', 'webScraperTool', 'chatOpenRouter', 'toolAgent']
        : ['chatOpenRouter']
    
    // Add delivery nodes based on provider choice
    const delivery = answers.delivery || 'In-app'
    const emailProvider = answers.emailProvider || 'resend-platform'
    const deliveryNodesNeeded =
        delivery === 'Email'
            ? emailProvider === 'resend-platform'
                ? ['resend']
                : emailProvider === 'gmail-personal'
                    ? ['gmail']
                    : emailProvider === 'outlook-personal'
                        ? ['microsoftOutlook']
                        : []
            : []
    const nodeNamesNeeded = [...nodeNamesNeededBase, ...deliveryNodesNeeded]
    
    // Validate credentials and get mappings
    const { gaps: credentialGaps, credentialMappings } = await CredentialValidator.validateNodeCredentials(
        nodeNamesNeeded, 
        workspaceId
    )
    
    if (credentialGaps.length > 0) {
        // Return gaps for Quick Config
        return {
            applied: false,
            needs_config: true,
            gaps: credentialGaps,
            message: `Missing credentials: ${credentialGaps.map((g) => g.label).join(', ')}`
        }
    }
    
    // Build real graph using templates with credential IDs
    const { nodes: newNodes, edges: newEdges } = await buildGraphFromAnswers(answers, planType, credentialMappings)
    
    // Merge with existing nodes (preserve any manual nodes)
    const updatedFlowData = {
        nodes: [...(currentFlowData.nodes || []), ...newNodes],
        edges: [...(currentFlowData.edges || []), ...newEdges]
    }
    
    // Validate the graph structure
    const validation = GraphValidator.validateGraph(updatedFlowData)
    if (!validation.valid) {
        return {
            applied: false,
            graphIssues: validation.issues,
            message: `Graph validation failed: ${validation.issues.join('; ')}`
        }
    }
    
    // Record edit with undo snapshot
    const edit = new CopilotEdit()
    edit.id = uuidv4()
    edit.flowId = flowId
    edit.conversationId = flowId
    edit.operations = JSON.stringify({
        previousFlowData: currentFlowData,
        appliedNodes: newNodes,
        appliedEdges: newEdges
    })
    const sources = Array.isArray(answers.sources) ? answers.sources.join(' + ') : answers.sources || 'sources'
    const topic = answers.topic || answers.goal || 'your topic'
    const deliverySummary = answers.delivery || 'In-app'
    edit.summary = `Applied: Search ${sources} for "${topic}", deliver to ${deliverySummary}`
    await editRepo.save(edit)
    
    // Save updated flow
    chatflow.flowData = JSON.stringify(updatedFlowData)
    chatflow.updatedDate = new Date()
    await flowRepo.save(chatflow)
    
    // Build changedNodes summary (only actual nodes, not sticky notes)
    const changedNodes = (newNodes || [])
        .filter((n: any) => n.type !== 'stickyNote')
        .map((n: any) => ({
            id: n.id,
            label: n.data?.label || n.data?.name || n.type || 'Node'
        }))
    
    return { 
        flowData: updatedFlowData,
        applied: true,
        changedNodes,
        message: `Workflow applied! Added ${changedNodes.length} nodes and ${newEdges.length} connections to canvas.`
    }
}

const undoLast = async (flowId: string) => {
    const app = getRunningExpressApp()
    const flowRepo = app.AppDataSource.getRepository(ChatFlow)
    const editRepo = app.AppDataSource.getRepository(CopilotEdit)
    
    // Find last edit
    const lastEdit = await editRepo.findOne({
        where: { flowId },
        order: { createdAt: 'DESC' }
    })
    
    if (!lastEdit) throw new Error('No edits to undo')
    
    const chatflow = await flowRepo.findOneBy({ id: flowId })
    if (!chatflow) throw new Error('Chatflow not found')
    
    // Parse operations to get previous state
    let previousFlowData = null
    try {
        const operations = JSON.parse(lastEdit.operations || '{}')
        previousFlowData = operations.previousFlowData
    } catch (err) {
        // If parsing fails, operations might be old format
    }
    
    let restoredFlowData
    if (previousFlowData) {
        // Restore previous flow state
        restoredFlowData = previousFlowData
        chatflow.flowData = JSON.stringify(restoredFlowData)
        chatflow.updatedDate = new Date()
        await flowRepo.save(chatflow)
    } else {
        // Fallback: just remove the edit record (old behavior)
        restoredFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
    }
    
    // Delete edit record
    await editRepo.remove(lastEdit)
    
    return { 
        flowData: restoredFlowData,
        message: 'Workflow changes reverted'
    }
}

// Validate answers and return gaps
const validateAnswers = (answers: Record<string, any>, planType: string) => {
    const gaps: Array<{ field: string; label: string; type: string }> = []
    
    if (planType === 'MULTIAGENT') {
        const requiredFields = ['topic', 'sources', 'delivery', 'timeframe']
        requiredFields.forEach((field) => {
            const val = answers[field]
            if (!val || (Array.isArray(val) && val.length === 0)) {
                gaps.push({ field, label: field[0].toUpperCase() + field.slice(1), type: 'missing' })
            }
        })
        // TODO: Add credential validation (company-managed vs personal)
    } else {
        if (!answers.goal) {
            gaps.push({ field: 'goal', label: 'Goal', type: 'missing' })
        }
    }
    
    return gaps
}

// Auto-apply from saved state (triggered after save)
const autoApplyFromState = async (flowId: string) => {
    // Check lock
    const now = Date.now()
    const lockedUntil = applyLocks.get(flowId) || 0
    if (now < lockedUntil) {
        return { applied: false, message: 'Auto-apply already in progress' }
    }
    // Set lock for 5 seconds
    applyLocks.set(flowId, now + 5000)
    
    try {
        const app = getRunningExpressApp()
        const flowRepo = app.AppDataSource.getRepository(ChatFlow)
        
        const chatflow = await flowRepo.findOneBy({ id: flowId })
        if (!chatflow) throw new Error('Chatflow not found')
        
        // Load CopilotState (gracefully handle if table doesn't exist yet)
        let copilotState = null
        try {
            const stateRepo = app.AppDataSource.getRepository(CopilotState)
            copilotState = await stateRepo.findOne({
                where: { flowId },
                order: { updatedAt: 'DESC' }
            })
        } catch (err: any) {
            if (err.message?.includes('no such table') || err.message?.includes('relation') || err.message?.includes('does not exist')) {
                return { applied: false, message: 'Copilot tables not initialized yet' }
            }
            throw err
        }
        
        if (!copilotState) {
            return { applied: false, message: 'No Copilot plan found for this flow' }
        }
        
        const answers = JSON.parse(copilotState.answers || '{}')
        const planType = copilotState.planType || 'CHATFLOW'
        
        // Validate answers
        const gaps = validateAnswers(answers, planType)
        if (gaps.length > 0) {
            return {
                applied: false,
                needs_config: true,
                gaps,
                message: `Missing required info: ${gaps.map((g) => g.label).join(', ')}`
            }
        }
        
        // Conflict detection: check if manual edits were made after last Copilot edit
        let lastEdit = null
        try {
            const editRepo = app.AppDataSource.getRepository(CopilotEdit)
            lastEdit = await editRepo.findOne({
                where: { flowId },
                order: { createdAt: 'DESC' }
            })
        } catch (err: any) {
            // Ignore if table doesn't exist
        }
        
        if (lastEdit && chatflow.updatedDate > lastEdit.createdAt) {
            return {
                applied: false,
                conflict: true,
                message: 'Manual edits detected since last Copilot change. Please review before auto-applying.'
            }
        }
        
        // Build summary sticky note with timeframe and schedule
        const currentFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
        const sources = Array.isArray(answers.sources) ? answers.sources.join(' + ') : answers.sources || 'Web'
        const topic = answers.topic || answers.goal || 'your topic'
        const delivery = answers.delivery || 'In-app'
        const timeframe = answers.timeframe || ''
        const schedule = answers.schedule || ''
        
        let summaryText = `🤖 Search ${sources} for "${topic}"`
        if (timeframe) summaryText += ` (${timeframe})`
        summaryText += `, deliver to ${delivery}`
        if (schedule && schedule !== 'Run now') summaryText += ` [${schedule}]`
        
        // Check if summary note already exists
        const existingSummaryNode = (currentFlowData.nodes || []).find((n: any) => n.id?.startsWith('copilot_summary_'))
        
        const pos = existingSummaryNode?.position || { x: 50, y: 50 }
        const summaryNode = {
            id: existingSummaryNode?.id || `copilot_summary_${Date.now()}`,
            type: 'stickyNote',
            position: pos,
            positionAbsolute: pos,
            width: 320,
            height: 160,
            data: {
                id: existingSummaryNode?.id || `copilot_summary_${Date.now()}`,
                label: summaryText,
                color: '#3B82F6',
                type: 'StickyNote',
                selected: false
            },
            selected: false,
            dragging: false
        }
        
        // Update or add summary node
        const updatedFlowData = {
            nodes: existingSummaryNode
                ? (currentFlowData.nodes || []).map((n: any) => (n.id === existingSummaryNode.id ? summaryNode : n))
                : [...(currentFlowData.nodes || []), summaryNode],
            edges: currentFlowData.edges || []
        }
        
        // Save updated flow
        chatflow.flowData = JSON.stringify(updatedFlowData)
        chatflow.updatedDate = new Date()
        await flowRepo.save(chatflow)
        
        return {
            applied: true,
            flowData: updatedFlowData,
            summary: summaryText,
            answers,
            message: 'Workflow summary applied to canvas'
        }
    } finally {
        // Release lock after 100ms to allow quick successive calls but prevent true concurrency
        setTimeout(() => applyLocks.delete(flowId), 100)
    }
}

// Review flow using FlowInspector
const reviewFlow = async (flowData: any, workspaceId?: string) => {
    const startTime = Date.now()
    const { FlowInspector } = await import('./FlowInspector')
    const result = await FlowInspector.inspect(flowData, workspaceId)
    const duration = Date.now() - startTime
    console.log(`[COPILOT] Review: nodeCount=${result.nodeCount}, type=${result.type}, runnable=${result.runnable}, issues=${result.issues.length}, duration=${duration}ms`)
    return result
}

// Annotate flow with sticky notes explaining nodes and gaps
const annotateFlow = async (flowId: string, mode: 'all' | 'gaps' = 'all') => {
    const startTime = Date.now()
    const app = getRunningExpressApp()
    const flowRepo = app.AppDataSource.getRepository(ChatFlow)
    const editRepo = app.AppDataSource.getRepository(CopilotEdit)
    
    const chatflow = await flowRepo.findOneBy({ id: flowId })
    if (!chatflow) throw new Error('Chatflow not found')
    
    const currentFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
    const { FlowInspector } = await import('./FlowInspector')
    const inspection = await FlowInspector.inspect(currentFlowData, chatflow.workspaceId)
    
    const newNotes: any[] = []
    
    // Annotate each node with a sticky note
    for (const node of currentFlowData.nodes || []) {
        if (node.type === 'stickyNote') continue
        
        const nodeIssues = inspection.issues.filter(issue => issue.includes(node.data.label))
        const nodeMissingCreds = inspection.missingCredentials.filter(mc => mc.label.includes(node.data.label))
        const nodeMissingParams = inspection.missingParams.filter(mp => mp.nodeId === node.id)
        
        const hasGaps = nodeIssues.length > 0 || nodeMissingCreds.length > 0 || nodeMissingParams.length > 0
        
        if (mode === 'gaps' && !hasGaps) continue
        
        // Build annotation text
        let noteText = `${node.data.label || node.data.name}`
        
        if (node.data.description) {
            noteText += `\n\n${node.data.description.substring(0, 100)}`
        }
        
        if (hasGaps) {
            noteText += '\n\nNeeds:'
            if (nodeMissingCreds.length > 0) {
                noteText += `\n- Credentials: ${nodeMissingCreds.map(c => c.nodeName).join(', ')}`
            }
            if (nodeMissingParams.length > 0) {
                noteText += `\n- Parameters: ${nodeMissingParams.map(p => p.paramLabel).join(', ')}`
            }
        }
        
        // Check if note already exists for this node
        const existingNoteId = `copilot_note_${node.id}`
        const existingNote = (currentFlowData.nodes || []).find((n: any) => n.id === existingNoteId)
        
        const noteColor = hasGaps ? '#FEF3C7' : '#DBEAFE' // yellow for gaps, blue for info
        
        // Clamp position to avoid off-canvas rendering
        const noteX = Math.max(20, node.position.x + 350)
        const noteY = Math.max(20, node.position.y)
        
        const noteNode = {
            id: existingNoteId,
            type: 'stickyNote',
            position: existingNote?.position || { x: noteX, y: noteY },
            positionAbsolute: existingNote?.positionAbsolute || { x: noteX, y: noteY },
            width: 200,
            height: 120,
            data: {
                id: existingNoteId,
                label: noteText,
                color: noteColor,
                type: 'StickyNote',
                selected: false
            },
            selected: false,
            dragging: false
        }
        
        if (!existingNote) {
            newNotes.push(noteNode)
        } else {
            // Update existing note
            existingNote.data.label = noteText
            existingNote.data.color = noteColor
        }
    }
    
    // Add new notes to flow
    const updatedFlowData = {
        nodes: [...(currentFlowData.nodes || []), ...newNotes],
        edges: currentFlowData.edges || []
    }
    
    // Record edit
    const edit = new CopilotEdit()
    edit.id = uuidv4()
    edit.flowId = flowId
    edit.conversationId = flowId
    edit.operations = JSON.stringify({
        previousFlowData: currentFlowData,
        annotationMode: mode,
        notesAdded: newNotes.length
    })
    edit.summary = `Added ${newNotes.length} annotation notes (mode: ${mode})`
    await editRepo.save(edit)
    
    // Save updated flow
    chatflow.flowData = JSON.stringify(updatedFlowData)
    chatflow.updatedDate = new Date()
    await flowRepo.save(chatflow)
    
    // Audit log
    const duration = Date.now() - startTime
    console.log(`[COPILOT] Annotate: flowId=${flowId}, mode=${mode}, notesAdded=${newNotes.length}, duration=${duration}ms`)
    
    return {
        flowData: updatedFlowData,
        notesAdded: newNotes.length,
        message: `Added ${newNotes.length} annotations to help understand the flow`
    }
}

// Replace flow in-place or signal to create new
const replaceFlow = async (flowId: string, template: string, options: { answers?: Record<string, any>; inPlace?: boolean }) => {
    const startTime = Date.now()
    const { answers = {}, inPlace = false } = options
    
    // If not in-place, just return signal to create new flow
    if (!inPlace) {
        console.log(`[COPILOT] Replace: flowId=${flowId}, template=${template}, createNew=true`)
        return {
            createNew: true,
            template,
            answers,
            message: 'Please create a new flow for this workflow'
        }
    }
    
    // Check lock to prevent double replace
    const now = Date.now()
    const lockedUntil = applyLocks.get(`replace_${flowId}`) || 0
    if (now < lockedUntil) {
        return { applied: false, message: 'Replace already in progress' }
    }
    applyLocks.set(`replace_${flowId}`, now + 5000)
    
    try {
        // In-place replacement
        const app = getRunningExpressApp()
        const flowRepo = app.AppDataSource.getRepository(ChatFlow)
        const editRepo = app.AppDataSource.getRepository(CopilotEdit)
    
    const chatflow = await flowRepo.findOneBy({ id: flowId })
    if (!chatflow) throw new Error('Chatflow not found')
    
    const currentFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
    const workspaceId = chatflow.workspaceId
    
    // Map template to planType
    const planType = template === 'RESEARCH_AGENT' ? 'MULTIAGENT' : 'CHATFLOW'
    
    // Get node names for credential validation
    const nodeNamesNeeded = planType === 'MULTIAGENT' 
        ? ['braveSearchAPI', 'webScraperTool', 'chatOpenRouter', 'toolAgent']
        : ['chatOpenRouter']
    
    // Validate credentials and get mappings
    const { gaps: credentialGaps, credentialMappings } = await CredentialValidator.validateNodeCredentials(
        nodeNamesNeeded, 
        workspaceId
    )
    
    if (credentialGaps.length > 0) {
        return {
            applied: false,
            needs_config: true,
            gaps: credentialGaps,
            message: `Missing credentials: ${credentialGaps.map((g) => g.label).join(', ')}`
        }
    }
    
    // Build new graph
    const { nodes: newNodes, edges: newEdges } = await buildGraphFromAnswers(answers, planType, credentialMappings)
    
    // REPLACE mode: do not merge, just use new nodes/edges
    const updatedFlowData = {
        nodes: newNodes,
        edges: newEdges
    }
    
    // Validate the graph structure
    const validation = GraphValidator.validateGraph(updatedFlowData)
    if (!validation.valid) {
        return {
            applied: false,
            graphIssues: validation.issues,
            message: `Graph validation failed: ${validation.issues.join('; ')}`
        }
    }
    
    // Record edit with undo snapshot
    const edit = new CopilotEdit()
    edit.id = uuidv4()
    edit.flowId = flowId
    edit.conversationId = flowId
    edit.operations = JSON.stringify({
        previousFlowData: currentFlowData,
        replacementTemplate: template,
        appliedNodes: newNodes,
        appliedEdges: newEdges
    })
    edit.summary = `Replaced flow with ${template} template`
    await editRepo.save(edit)
    
        // Save updated flow
        chatflow.flowData = JSON.stringify(updatedFlowData)
        chatflow.updatedDate = new Date()
        await flowRepo.save(chatflow)
        
        // Audit log
        const duration = Date.now() - startTime
        console.log(`[COPILOT] Replace: flowId=${flowId}, template=${template}, inPlace=true, nodes=${newNodes.length}, duration=${duration}ms`)
        
        return { 
            flowData: updatedFlowData,
            applied: true,
            replaced: true,
            message: `Flow replaced with ${newNodes.length} new nodes`
        }
    } finally {
        // Release lock
        setTimeout(() => applyLocks.delete(`replace_${flowId}`), 100)
    }
}

/**
 * Apply workflow from LLM-generated WorkflowSpec (new compiler-based path)
 */
const applyFromWorkflowSpec = async (flowId: string, workflowSpec: any, answers: Record<string, any>) => {
    const app = getRunningExpressApp()
    const flowRepo = app.AppDataSource.getRepository(ChatFlow)
    const editRepo = app.AppDataSource.getRepository(CopilotEdit)
    
    const chatflow = await flowRepo.findOneBy({ id: flowId })
    if (!chatflow) throw new Error('Chatflow not found')
    
    const currentFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
    const workspaceId = chatflow.workspaceId
    
    // Import PrimitiveMapper
    const { PrimitiveMapper } = require('./PrimitiveMapper')
    
    // Map primitives to Flowise nodes and edges
    const { nodes: newNodes, edges: newEdges } = PrimitiveMapper.mapPrimitiveGraph(workflowSpec, [])
    
    // Extract services for credential validation
    const services = PrimitiveMapper.extractServices(workflowSpec)
    
    // Detect credentials using IntegrationCatalog
    const { INTEGRATION_CATALOG } = require('./IntegrationCatalog')
    const credentialGaps = []
    const credentialMappings = []
    
    for (const service of services) {
        const integration = INTEGRATION_CATALOG[service]
        if (!integration || integration.credentials.length === 0) continue
        
        for (const credName of integration.credentials) {
            const exists = await CredentialValidator.credentialExists(credName, workspaceId)
            if (!exists) {
                credentialGaps.push({
                    field: `credential:${credName}`,
                    label: `${service} - ${credName}`,
                    type: 'credential',
                    credentialName: credName,
                    isPersonal: integration.isPersonal
                })
            }
        }
    }
    
    if (credentialGaps.length > 0) {
        return {
            applied: false,
            needs_config: true,
            gaps: credentialGaps,
            message: `Missing credentials: ${credentialGaps.map((g) => g.label).join(', ')}`
        }
    }
    
    // Merge with existing nodes
    const updatedFlowData = {
        nodes: [...(currentFlowData.nodes || []), ...newNodes],
        edges: [...(currentFlowData.edges || []), ...newEdges]
    }
    
    // Validate graph
    const validation = GraphValidator.validateGraph(updatedFlowData)
    if (!validation.valid) {
        return {
            applied: false,
            graphIssues: validation.issues,
            message: `Graph validation failed: ${validation.issues.join('; ')}`
        }
    }
    
    // Record edit
    const edit = new CopilotEdit()
    edit.id = uuidv4()
    edit.flowId = flowId
    edit.conversationId = flowId
    edit.operations = JSON.stringify({
        previousFlowData: currentFlowData,
        appliedNodes: newNodes,
        appliedEdges: newEdges
    })
    edit.summary = `Applied: ${workflowSpec.workflow.name || 'Custom workflow'} (${workflowSpec.workflow.pattern})`
    await editRepo.save(edit)
    
    // Save workflow
    chatflow.flowData = JSON.stringify(updatedFlowData)
    chatflow.updatedDate = new Date()
    await flowRepo.save(chatflow)
    
    const changedNodes = (newNodes || [])
        .filter((n: any) => n.type !== 'stickyNote')
        .map((n: any) => ({
            id: n.id,
            label: n.data?.label || n.data?.name || n.type || 'Node'
        }))
    
    return {
        flowData: updatedFlowData,
        applied: true,
        changedNodes,
        message: `Workflow applied! Added ${changedNodes.length} nodes and ${newEdges.length} connections.`
    }
}

export default { plan, apply, applyFromAnswers, applyFromWorkflowSpec, undoLast, autoApplyFromState, reviewFlow, annotateFlow, replaceFlow }



