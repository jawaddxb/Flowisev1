import { Request, Response, NextFunction } from 'express'
import copilotService from '../../services/copilot/FlowPatchService'
import agentflowv2Service from '../../services/agentflowv2-generator'
import { getDataSource } from '../../DataSource'
import { CopilotState } from '../../database/entities/CopilotState'
import { AutoFixService } from '../../services/copilot/AutoFixService'
import intentExtractor from '../../services/copilot/IntentExtractorService'
import workflowCompiler from '../../services/copilot/WorkflowCompilerService'
import { DynamicQuestionGenerator } from '../../services/copilot/DynamicQuestionGenerator'
import { CostEstimator } from '../../services/copilot/CostEstimator'
import { v4 as uuidv4 } from 'uuid'

const generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prompt, type = 'MULTIAGENT', selectedChatModel } = req.body || {}
        if (!prompt) return res.status(400).json({ message: 'prompt is required' })

        if (type === 'MULTIAGENT') {
            const chatModel = selectedChatModel || { name: 'gpt-4o-mini' }
            const draft = await agentflowv2Service.generateAgentflowv2(prompt, chatModel)
            return res.json({ flowData: { nodes: draft.nodes || [], edges: draft.edges || [] } })
        }
        // Simple starter for Chatflow: empty canvas
        return res.json({ flowData: { nodes: [], edges: [] } })
    } catch (err) {
        next(err)
    }
}

const planEdits = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId, flowData, instruction } = req.body || {}
        if (!chatflowId || !flowData || !instruction) return res.status(400).json({ message: 'chatflowId, flowData, instruction are required' })
        const result = await copilotService.plan(flowData, instruction)
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

const apply = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId, answers, planType, workflowSpec, useCompiler } = req.body || {}
        if (!flowId) return res.status(400).json({ message: 'flowId is required' })
        
        // NEW: If useCompiler flag set and workflowSpec provided, use LLM compiler path
        if (useCompiler && workflowSpec) {
            const result = await copilotService.applyFromWorkflowSpec(flowId, workflowSpec, answers || {})
            return res.json(result)
        }
        
        // LEGACY: Use old applyFromAnswers for backward compatibility
        const result = await copilotService.applyFromAnswers(flowId, answers || {}, planType || 'CHATFLOW')
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

export default { generate, planEdits, apply }
 
// New sophisticated endpoints (v2.0)
export const classifyAndPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prompt, flowData } = req.body || {}
        if (!prompt) return res.status(400).json({ message: 'prompt is required' })
        // v1 heuristic classification stub
        const text = String(prompt).toLowerCase()
        const type = text.includes('research') || text.includes('agent') ? 'MULTIAGENT' : text.includes('rag') ? 'CHATFLOW_RAG' : 'CHATFLOW'
        const typeLabel = type === 'MULTIAGENT' ? 'an agent flow' : type === 'CHATFLOW_RAG' ? 'a RAG chatflow' : 'a chatflow'
        const questions = type === 'MULTIAGENT' ? ['Which search provider?', 'Which model?'] : ['Where are your documents?', 'Which model?']
        const suggestions = ['Add Web Search', 'Enable Memory', 'Make Public']
        return res.json({ type, label: typeLabel, questions, draftPlan: {}, suggestions })
    } catch (err) {
        next(err)
    }
}

export const clarify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { answers = [], context = {} } = req.body || {}
        return res.json({ refinedPlan: { answers, context }, suggestions: ['Add Guardrails'] })
    } catch (err) {
        next(err)
    }
}

export const capabilities = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Minimal capability snapshot
        return res.json({ availableModels: ['openai/gpt-4o-mini'], missingCredentials: [], toolAvailability: ['braveSearch', 'webScraper'] })
    } catch (err) {
        next(err)
    }
}

// Conversational chat endpoint: returns clarify questions and runnable status
export const undo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId } = req.params
        if (!flowId) return res.status(400).json({ message: 'flowId is required' })
        const result = await copilotService.undoLast(flowId)
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

export const chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message = '', flowId, context = {} } = req.body || {}
        const raw = String(message)
        const text = raw.toLowerCase()

        // Load existing CopilotState if available
        let currentAnswers: Record<string, any> = {}
        let existingPlanType = ''
        
        if (flowId) {
            try {
                const ds = getDataSource()
                const stateRepo = ds.getRepository(CopilotState)
                const existingState = await stateRepo.findOne({ where: { flowId }, order: { updatedAt: 'DESC' } })
                if (existingState) {
                    currentAnswers = JSON.parse(existingState.answers || '{}')
                    existingPlanType = existingState.planType
                }
            } catch (err: any) {
                // Table might not exist yet
            }
        }
        
        // Override with context if provided
        if (context && (context as any).answers) {
            currentAnswers = { ...currentAnswers, ...(context as any).answers }
        }
        
        // Intent: persist research if prior answers include any research fields or existing planType
        const hasResearchSignals = ['topic', 'sources', 'timeframe', 'delivery'].some((k) => Boolean(currentAnswers[k]))
        const isResearch = existingPlanType === 'MULTIAGENT' || hasResearchSignals || /\bresearch\b|\btrend\b|\btopic\b|\btoday\b/.test(text)
        const planType = isResearch ? 'MULTIAGENT' : 'CHATFLOW'

        // Schema (drives UI)
        const questionSchema = isResearch
            ? [
                  { id: 'topic', type: 'text', required: true, text: 'What topic or keywords?' },
                  {
                      id: 'sources',
                      type: 'choice',
                      multi: true,
                      required: true,
                      options: ['Web', 'News', 'Twitter', 'Reddit', 'YouTube'],
                      text: 'Pick your sources (multi-select)'
                  },
                  { id: 'timeframe', type: 'choice', required: true, options: ['Today', 'Last 7 days', 'Custom'], text: 'What timeframe?' },
                  { id: 'delivery', type: 'choice', required: true, options: ['In-app', 'Email', 'Slack', 'Notion'], text: 'Where should I deliver it?' },
                  { id: 'schedule', type: 'choice', required: false, options: ['Run now', 'Daily', 'Weekly'], text: 'Do you want to schedule it?' }
              ]
            : [
                  { id: 'goal', type: 'text', required: true, text: 'Tell me the outcome you want.' }
              ]

        // Current answers (from context)
        // (already computed above)

        // Parse freeform updates from the latest message
        const updates: Record<string, any> = {}
        const capture = (key: string, rx: RegExp, transform?: (s: string) => any) => {
            const m = raw.match(rx)
            if (m && m[1]) updates[key] = transform ? transform(m[1]) : m[1].trim()
        }
        const toList = (s: string) =>
            s
                .split(/[,\n]|\band\b/gi)
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase())

        capture('topic', /(?:^|\b)topic\s*[:=]\s*([^\n]+)/i)
        capture('goal', /(?:^|\b)goal\s*[:=]\s*([^\n]+)/i)
        capture('sources', /(?:^|\b)sources?\s*[:=]\s*([^\n]+)/i, toList)
        capture('timeframe', /(?:^|\b)timeframe\s*[:=]\s*([^\n]+)/i, (s) => s.trim()[0].toUpperCase() + s.trim().slice(1).toLowerCase())
        capture('delivery', /(?:^|\b)(?:deliver|delivery|deliver to)\s*[:=]\s*([^\n]+)/i, (s) => s.trim()[0].toUpperCase() + s.trim().slice(1).toLowerCase())
        // Implicit schedule words
        if (/\bdaily\b/.test(text)) updates['schedule'] = 'Daily'
        if (/\bweekly\b/.test(text)) updates['schedule'] = 'Weekly'
        if (/\brun now\b|\bnow\b/.test(text)) updates['schedule'] = 'Run now'

        // Merge with current answers, honoring multi-select
        const merged: Record<string, any> = { ...currentAnswers }
        for (const field of Object.keys(updates)) {
            const schema = questionSchema.find((q) => q.id === field) as any
            const incoming = updates[field]
            if (schema?.multi) {
                // Support explicit CLEAR when client sends []
                if (Array.isArray(incoming) && incoming.length === 0) {
                    merged[field] = []
                    continue
                }
                const prev = Array.isArray(merged[field]) ? merged[field] : merged[field] ? [merged[field]] : []
                const next = Array.isArray(incoming) ? incoming : [incoming]
                merged[field] = Array.from(new Set([...prev, ...next]))
            } else {
                merged[field] = incoming
            }
        }

        // Compute required/missing and nextQuestions
        const requiredIds = questionSchema.filter((q) => (q as any).required).map((q) => q.id)
        const answeredCount = requiredIds.filter((id) => Boolean(merged[id]) && (!Array.isArray(merged[id]) || merged[id].length > 0)).length
        const missingFields = requiredIds.filter((id) => !merged[id] || (Array.isArray(merged[id]) && merged[id].length === 0))
        const status = missingFields.length === 0 ? 'runnable' : 'draft'
        // Keep multi-select questions visible even when partially answered until status becomes runnable
        const nextQuestions = questionSchema
            .filter((q: any) => q.multi || !merged[q.id] || (Array.isArray(merged[q.id]) && merged[q.id].length === 0))
            .map((q: any) => ({ id: q.id, text: q.text, options: q.options || [], multi: Boolean(q.multi) }))

        // Friendly assistant copy
        let assistantMessage: string
        if (status === 'draft') {
            const prettyMissing = missingFields.map((m) => m[0].toUpperCase() + m.slice(1)).join(', ')
            assistantMessage = isResearch
                ? `Got it! Just need: ${prettyMissing}`
                : 'Tell me what you want to build and I\'ll help set it up.'
        } else {
            assistantMessage = isResearch
                ? 'Perfect! I have everything I need. Ready to build your research workflow.'
                : 'All set! Ready to build your workflow.'
        }

        // Plan summary once runnable
        let planSummary: string | undefined
        if (status === 'runnable') {
            const src = Array.isArray(merged.sources) ? merged.sources.join(' + ') : merged.sources
            const topic = merged.topic || merged.goal || 'your topic'
            const tf = merged.timeframe || 'Today'
            const del = merged.delivery || 'In-app'
            const sched = merged.schedule || ''
            planSummary = `I'll search ${src} for "${topic}" (${tf}), scrape pages for details, synthesize insights, and deliver to ${del}`
            if (sched && sched !== 'Run now') planSummary += ` [${sched}]`
            planSummary += '.'
        }
        
        // Persist to CopilotState
        if (flowId) {
            try {
                const ds = getDataSource()
                const stateRepo = ds.getRepository(CopilotState)
                const existingState = await stateRepo.findOne({ where: { flowId }, order: { updatedAt: 'DESC' } })
                
                if (existingState) {
                    existingState.answers = JSON.stringify(merged)
                    existingState.planType = planType
                    await stateRepo.save(existingState)
                } else {
                    const newState = new CopilotState()
                    newState.id = uuidv4()
                    newState.flowId = flowId
                    newState.answers = JSON.stringify(merged)
                    newState.planType = planType
                    await stateRepo.save(newState)
                }
            } catch (err: any) {
                // Silent fail if table doesn't exist yet
            }
        }

        return res.json({
            planType,
            status,
            assistantMessage,
            questionSchema: questionSchema.map((q) => ({ id: q.id, type: (q as any).type, required: (q as any).required, options: (q as any).options || [], multi: (q as any).multi || false, text: q.text })),
            nextQuestions,
            requiredFields: requiredIds,
            missingFields,
            answeredCount,
            totalRequired: requiredIds.length,
            answers: merged,
            planSummary,
            // Use plain-language suggestions; hide tooling jargon
            suggestions: isResearch ? ['Set timeframe', 'Choose delivery'] : ['Describe your goal']
        })
    } catch (err) {
        next(err)
    }
}

export const autoApply = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId } = req.body || {}
        if (!flowId) return res.status(400).json({ message: 'flowId is required' })
        
        const result = await copilotService.autoApplyFromState(flowId)
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

// Review endpoint: inspect flow and return summary + gaps
export const review = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId, flowData, workspaceId } = req.body || {}
        
        // Load from DB if flowData not provided
        let data = flowData
        if (!data && flowId) {
            const app = require('../../utils/getRunningExpressApp').getRunningExpressApp()
            const chatflow = await app.AppDataSource.getRepository(require('../../database/entities/ChatFlow').ChatFlow).findOneBy({ id: flowId })
            if (chatflow) {
                data = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
            }
        }
        
        if (!data) return res.status(400).json({ message: 'flowData or flowId is required' })
        
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data
        const result = await copilotService.reviewFlow(parsedData, workspaceId)
        
        // Debug logging
        console.log('[COPILOT] Review response:', JSON.stringify({
            runnable: result.runnable,
            missingCredentials: result.missingCredentials,
            missingParams: result.missingParams,
            issues: result.issues
        }, null, 2))
        
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

// Annotate endpoint: add explanatory sticky notes to nodes
export const annotate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId, mode = 'all' } = req.body || {}
        if (!flowId) return res.status(400).json({ message: 'flowId is required' })
        
        const result = await copilotService.annotateFlow(flowId, mode)
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

// Replace endpoint: replace flow in-place or create new
export const replace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId, template, answers = {}, inPlace = false } = req.body || {}
        if (!flowId) return res.status(400).json({ message: 'flowId is required' })
        if (!template) return res.status(400).json({ message: 'template is required' })
        
        const result = await copilotService.replaceFlow(flowId, template, { answers, inPlace })
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

// Auto-fix endpoint: automatically fix workflow issues
export const autoFix = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowId, action, params = {} } = req.body || {}
        if (!flowId) return res.status(400).json({ message: 'flowId is required' })
        if (!action) return res.status(400).json({ message: 'action is required' })

        const app = require('../../utils/getRunningExpressApp').getRunningExpressApp()
        const { ChatFlow } = require('../../database/entities/ChatFlow')
        const chatflow = await app.AppDataSource.getRepository(ChatFlow).findOneBy({ id: flowId })
        if (!chatflow) return res.status(404).json({ message: 'Chatflow not found' })

        const currentFlowData = JSON.parse(chatflow.flowData || '{"nodes":[],"edges":[]}')
        let updatedFlowData = currentFlowData

        console.log(`[COPILOT] Auto-fix action: ${action}`, params)

        switch (action) {
            case 'addChatGPT':
                updatedFlowData = await AutoFixService.addChatModel(currentFlowData, 'chatOpenAI')
                break
            case 'addClaude':
                updatedFlowData = await AutoFixService.addChatModel(currentFlowData, 'chatAnthropic')
                break
            case 'autoConnect':
                if (params.nodeId) {
                    updatedFlowData = await AutoFixService.autoConnectNode(currentFlowData, params.nodeId)
                }
                break
            case 'deleteNode':
                if (params.nodeId) {
                    updatedFlowData = await AutoFixService.removeNode(currentFlowData, params.nodeId)
                }
                break
            case 'autoFixAll':
                if (params.issues) {
                    updatedFlowData = await AutoFixService.fixAll(currentFlowData, params.issues)
                }
                break
            default:
                return res.status(400).json({ message: `Unknown action: ${action}` })
        }

        // Save the updated workflow
        await AutoFixService.saveWorkflow(flowId, updatedFlowData)

        console.log(`[COPILOT] Auto-fix completed: ${action}, nodes: ${updatedFlowData.nodes?.length}`)

        return res.json({ 
            flowData: updatedFlowData, 
            success: true,
            message: 'Workflow updated successfully'
        })
    } catch (err) {
        console.error('[COPILOT] Auto-fix error:', err)
        next(err)
    }
}

// Tier 3: LLM-based intent extraction for complex user requests
export const interpretIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message, flowId } = req.body
        if (!message) return res.status(400).json({ message: 'message is required' })
        
        const result = await intentExtractor.extractIntent(message)
        return res.json(result)
    } catch (err) {
        next(err)
    }
}

// LLM Workflow Compiler: Decompose any workflow into primitives
export const compileWorkflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message, flowId, context = {} } = req.body
        if (!message) return res.status(400).json({ message: 'message is required' })

        // Load existing state for context
        let existingAnswers: Record<string, any> = {}
        let flowData: any = null

        if (flowId) {
            try {
                const ds = getDataSource()
                const stateRepo = ds.getRepository(CopilotState)
                const existingState = await stateRepo.findOne({ where: { flowId }, order: { updatedAt: 'DESC' } })
                if (existingState) {
                    existingAnswers = JSON.parse(existingState.answers || '{}')
                }
            } catch (err: any) {
                // Silent fail
            }
        }

        // Compile workflow using LLM
        const workflowSpec = await workflowCompiler.compileWorkflow(message, {
            existingAnswers,
            flowData: context.flowData || flowData
        })

        // Generate dynamic questions from spec
        const questions = await DynamicQuestionGenerator.generateQuestions(workflowSpec, context.workspaceId)

        // Estimate cost
        const costEstimate = CostEstimator.estimateCost(workflowSpec, existingAnswers.schedule)

        // Save workflowSpec to CopilotState
        if (flowId) {
            try {
                const ds = getDataSource()
                const stateRepo = ds.getRepository(CopilotState)
                const existingState = await stateRepo.findOne({ where: { flowId }, order: { updatedAt: 'DESC' } })

                const specData = {
                    workflowSpec: JSON.stringify(workflowSpec),
                    planType: workflowSpec.workflow.pattern || 'custom'
                }

                if (existingState) {
                    Object.assign(existingState, specData)
                    await stateRepo.save(existingState)
                } else {
                    const newState = new CopilotState()
                    newState.id = uuidv4()
                    newState.flowId = flowId
                    newState.answers = '{}'
                    Object.assign(newState, specData)
                    await stateRepo.save(newState)
                }
            } catch (err: any) {
                // Silent fail
            }
        }

        return res.json({
            workflowSpec,
            questions,
            costEstimate,
            pattern: workflowSpec.workflow.pattern,
            description: workflowSpec.workflow.description
        })
    } catch (err) {
        next(err)
    }
}

