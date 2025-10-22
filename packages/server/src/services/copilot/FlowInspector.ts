import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { IReactFlowObject, IReactFlowNode } from '../../Interface'
import { GraphValidator } from './GraphValidator'
import { CredentialValidator } from './CredentialValidator'

export interface FlowInspection {
    type: 'MULTIAGENT' | 'CHATFLOW' | 'RAG' | 'EMPTY'
    summary: string
    steps?: string[]
    entryNodes: string[]
    nodeCount: number
    issues: string[]
    missingCredentials: Array<{ field: string; label: string; nodeName: string }>
    missingParams: Array<{ nodeId: string; nodeLabel: string; paramName: string; paramLabel: string }>
    recommendedActions: string[]
    runnable: boolean
}

/**
 * Inspects a flow and returns a summary of its structure, issues, and gaps
 */
export class FlowInspector {
    static async inspect(flowData: IReactFlowObject, workspaceId?: string): Promise<FlowInspection> {
        const app = getRunningExpressApp()
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        // Empty flow
        if (nodes.length === 0) {
            return {
                type: 'EMPTY',
                summary: 'This flow is currently empty.',
                entryNodes: [],
                nodeCount: 0,
                issues: [],
                missingCredentials: [],
                missingParams: [],
                recommendedActions: ['Create a new flow', 'Add nodes manually'],
                runnable: false
            }
        }

        // Detect flow type
        const type = this.detectFlowType(nodes)

        // Find entry nodes (agents or chat models without incoming edges)
        const entryNodes = nodes
            .filter(node => {
                const isAgentOrChatModel = node.data.category === 'Agents' || node.data.category === 'Chat Models'
                const hasIncomingEdge = edges.some(edge => edge.target === node.id)
                return isAgentOrChatModel && !hasIncomingEdge
            })
            .map(node => node.data.label || node.data.name)

        // Graph validation
        const validation = GraphValidator.validateGraph(flowData)
        const issues = validation.issues

        // Credential validation
        const nodeNames = nodes
            .filter(node => node.type === 'customNode')
            .map(node => node.data.name)
        const { gaps: credentialGaps } = await CredentialValidator.validateNodeCredentials(nodeNames, workspaceId)

        // Parameter validation
        const missingParams = this.findMissingRequiredParams(nodes)

        // Generate summary
        const summary = this.generateSummary(nodes, edges, type, entryNodes)
        
        // Generate plain-English steps
        const steps = this.generateSteps(nodes, edges, type)

        // Determine if runnable
        const runnable = validation.valid && credentialGaps.length === 0 && missingParams.length === 0

        // Recommended actions
        const recommendedActions = this.generateRecommendedActions(runnable, issues, credentialGaps, missingParams)

        return {
            type,
            summary,
            steps,
            entryNodes,
            nodeCount: nodes.length,
            issues,
            missingCredentials: credentialGaps.map(gap => ({
                field: gap.field,
                label: gap.label,
                nodeName: gap.credentialName
            })),
            missingParams,
            recommendedActions,
            runnable
        }
    }

    private static detectFlowType(nodes: IReactFlowNode[]): 'MULTIAGENT' | 'CHATFLOW' | 'RAG' | 'EMPTY' {
        if (nodes.length === 0) return 'EMPTY'

        const hasAgents = nodes.some(node => node.data.category === 'Agents')
        const hasVectorStores = nodes.some(node => node.data.category === 'Vector Stores')
        const hasDocumentLoaders = nodes.some(node => node.data.category === 'Document Loaders')
        const hasTools = nodes.some(node => node.data.category === 'Tools')

        if (hasAgents && hasTools) return 'MULTIAGENT'
        if (hasVectorStores || hasDocumentLoaders) return 'RAG'
        return 'CHATFLOW'
    }

    private static generateSummary(nodes: IReactFlowNode[], edges: any[], type: string, entryNodes: string[]): string {
        const nodeCount = nodes.length
        const edgeCount = edges.length

        if (type === 'MULTIAGENT') {
            const tools = nodes.filter(node => node.data.category === 'Tools').map(n => n.data.label).join(', ')
            const agents = entryNodes.join(', ') || 'an agent'
            return `This multi-agent flow uses ${agents} with ${nodeCount} components (${tools || 'various tools'}) connected by ${edgeCount} edges.`
        }

        if (type === 'RAG') {
            const vectorStores = nodes.filter(node => node.data.category === 'Vector Stores').map(n => n.data.label).join(', ')
            return `This RAG flow includes ${nodeCount} components with ${vectorStores || 'vector storage'} and ${edgeCount} connections.`
        }

        return `This chatflow has ${nodeCount} components connected by ${edgeCount} edges.`
    }

    private static generateSteps(nodes: IReactFlowNode[], edges: any[], type: string): string[] {
        const steps: string[] = []
        
        if (type === 'MULTIAGENT') {
            const tools = nodes.filter(node => node.data.category === 'Tools')
            const agents = nodes.filter(node => node.data.category === 'Agents')
            
            if (tools.length > 0) {
                const toolNames = tools.map(n => n.data.label).join(', ')
                steps.push(`Searches using: ${toolNames}`)
            }
            
            if (agents.length > 0) {
                steps.push(`Agent analyzes and synthesizes results`)
            }
            
            steps.push(`Delivers findings in your preferred format`)
            
            return steps
        }
        
        if (type === 'RAG') {
            steps.push('Loads and chunks your documents')
            steps.push('Stores embeddings in vector database')
            steps.push('Retrieves relevant context for each query')
            steps.push('Generates answers using AI + your data')
            return steps
        }
        
        // Generic chatflow
        const chatModels = nodes.filter(node => node.data.category === 'Chat Models')
        if (chatModels.length > 0) {
            steps.push(`Uses ${chatModels[0].data.label} to process queries`)
        }
        steps.push('Returns AI-generated responses')
        
        return steps
    }

    private static findMissingRequiredParams(nodes: IReactFlowNode[]): Array<{ nodeId: string; nodeLabel: string; paramName: string; paramLabel: string }> {
        const app = getRunningExpressApp()
        const missing: Array<{ nodeId: string; nodeLabel: string; paramName: string; paramLabel: string }> = []

        for (const node of nodes) {
            if (node.type !== 'customNode') continue

            const nodeTemplate = app.nodesPool.componentNodes[node.data.name]
            if (!nodeTemplate) continue

            const requiredParams = nodeTemplate.inputs?.filter(input => !input.optional) || []
            for (const param of requiredParams) {
                const value = node.data.inputs?.[param.name]
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    missing.push({
                        nodeId: node.id,
                        nodeLabel: node.data.label || node.data.name,
                        paramName: param.name,
                        paramLabel: param.label
                    })
                }
            }
        }

        return missing
    }

    private static generateRecommendedActions(
        runnable: boolean,
        issues: string[],
        credentialGaps: any[],
        missingParams: any[]
    ): string[] {
        if (runnable) {
            return ['Test the flow', 'Deploy to production']
        }

        const actions: string[] = []

        if (credentialGaps.length > 0) {
            actions.push('Add missing credentials')
        }

        if (missingParams.length > 0) {
            actions.push('Configure required parameters')
        }

        if (issues.length > 0) {
            actions.push('Fix graph issues')
        }

        if (actions.length === 0) {
            actions.push('Review and test')
        }

        return actions
    }
}

