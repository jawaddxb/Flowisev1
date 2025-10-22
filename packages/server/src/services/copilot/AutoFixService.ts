import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { IReactFlowObject, IReactFlowNode, IReactFlowEdge } from '../../Interface'

/**
 * AutoFixService - Automatically fix common workflow issues
 */
export class AutoFixService {
    /**
     * Add a chat model node to the workflow
     */
    static async addChatModel(flowData: IReactFlowObject, modelType: string = 'chatOpenAI'): Promise<IReactFlowObject> {
        const app = getRunningExpressApp()
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        // Find the chat model node template
        const nodeTemplate = app.nodesPool.componentNodes[modelType]
        if (!nodeTemplate) {
            throw new Error(`Chat model type ${modelType} not found`)
        }

        // Generate unique node ID
        const nodeId = `${modelType}_${Date.now()}`

        // Calculate position (center-left of canvas)
        const newNode: any = {
            id: nodeId,
            type: 'customNode',
            position: { x: 100, y: 200 },
            data: {
                id: nodeId,
                label: nodeTemplate.label,
                name: modelType,
                type: nodeTemplate.type,
                baseClasses: nodeTemplate.baseClasses,
                category: nodeTemplate.category,
                description: nodeTemplate.description,
                inputParams: nodeTemplate.inputs || [],
                inputAnchors: (nodeTemplate as any).inputAnchors || [],
                inputs: {},
                outputAnchors: (nodeTemplate as any).outputAnchors || [],
                outputs: {}
            },
            width: 300,
            height: 500,
            selected: false,
            positionAbsolute: { x: 100, y: 200 },
            dragging: false
        }

        return {
            nodes: [...nodes, newNode],
            edges: [...edges],
            viewport: flowData.viewport || { x: 0, y: 0, zoom: 1 }
        }
    }

    /**
     * Remove a node and its edges from the workflow
     */
    static async removeNode(flowData: IReactFlowObject, nodeId: string): Promise<IReactFlowObject> {
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        return {
            nodes: nodes.filter((n) => n.id !== nodeId),
            edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            viewport: flowData.viewport || { x: 0, y: 0, zoom: 1 }
        }
    }

    /**
     * Auto-connect a disconnected node to the most appropriate node
     */
    static async autoConnectNode(flowData: IReactFlowObject, nodeId: string): Promise<IReactFlowObject> {
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        const targetNode = nodes.find((n) => n.id === nodeId)
        if (!targetNode) {
            throw new Error(`Node ${nodeId} not found`)
        }

        // Find a suitable node to connect to based on category
        let sourceNode: IReactFlowNode | undefined

        // If target is an Agent, connect it to a Chat Model
        if (targetNode.data.category === 'Agents') {
            sourceNode = nodes.find((n) => n.data.category === 'Chat Models' && n.id !== nodeId)
        }
        // If target is a Tool, connect it to an Agent
        else if (targetNode.data.category === 'Tools') {
            sourceNode = nodes.find((n) => n.data.category === 'Agents' && n.id !== nodeId)
        }
        // If target is a Chat Model with no connections, it might be an entry point (no connection needed)
        else if (targetNode.data.category === 'Chat Models') {
            // Chat models can be entry points, so we might not need to connect them
            return flowData
        }
        // For other nodes, find any compatible node
        else {
            sourceNode = nodes.find((n) => n.id !== nodeId && n.data.category !== 'Sticky Notes')
        }

        if (!sourceNode) {
            throw new Error(`Could not find a suitable node to connect to ${nodeId}`)
        }

        // Find compatible anchors
        const sourceAnchor = targetNode.data.inputAnchors?.[0]?.name || 'input'
        const targetAnchor = sourceNode.data.outputAnchors?.[0]?.name || 'output'

        // Create new edge
        const newEdge: any = {
            id: `${sourceNode.id}-${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            sourceHandle: `${sourceNode.id}-output-${targetAnchor}`,
            targetHandle: `${targetNode.id}-input-${sourceAnchor}`,
            type: 'buttonedge',
            data: { label: '' }
        }

        return {
            nodes: [...nodes],
            edges: [...edges, newEdge],
            viewport: flowData.viewport || { x: 0, y: 0, zoom: 1 }
        }
    }

    /**
     * Ensure workflow has exactly one chat model with defaults
     */
    static async enforceSingleChatModel(flowData: IReactFlowObject, defaultModel: string = 'chatOpenAI'): Promise<IReactFlowObject> {
        const app = getRunningExpressApp()
        const nodes = flowData.nodes || []
        const chatModels = nodes.filter((n) => n.data.category === 'Chat Models')

        // If no chat model, add one
        if (chatModels.length === 0) {
            return await this.addChatModel(flowData, defaultModel)
        }

        // If multiple chat models, keep only the first and set defaults
        if (chatModels.length > 1) {
            const keepModel = chatModels[0]
            const removeIds = chatModels.slice(1).map((n) => n.id)
            
            let updatedFlow = flowData
            for (const nodeId of removeIds) {
                updatedFlow = await this.removeNode(updatedFlow, nodeId)
            }
            
            // Set default params on the kept model
            return this.setDefaultParams(updatedFlow, keepModel.id)
        }

        // Set default params on the single model
        return this.setDefaultParams(flowData, chatModels[0].id)
    }

    /**
     * Set default parameters on a node (e.g., modelName = gpt-4o-mini)
     */
    static setDefaultParams(flowData: IReactFlowObject, nodeId: string): IReactFlowObject {
        const nodes = flowData.nodes || []
        const updatedNodes = nodes.map((node) => {
            if (node.id !== nodeId) return node

            const inputs = { ...node.data.inputs }
            
            // Set defaults for ChatOpenAI
            if (node.data.name === 'chatOpenAI') {
                inputs.modelName = inputs.modelName || 'gpt-4o-mini'
                inputs.temperature = inputs.temperature || 0.7
            }
            // Set defaults for ChatAnthropic
            else if (node.data.name === 'chatAnthropic') {
                inputs.modelName = inputs.modelName || 'claude-3-5-sonnet-20240620'
            }

            return {
                ...node,
                data: {
                    ...node.data,
                    inputs
                }
            }
        })

        return {
            ...flowData,
            nodes: updatedNodes
        }
    }

    /**
     * Remove all disconnected nodes
     */
    static removeDisconnected(flowData: IReactFlowObject): IReactFlowObject {
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        // Find nodes that have no edges
        const connectedNodeIds = new Set<string>()
        edges.forEach((edge) => {
            connectedNodeIds.add(edge.source)
            connectedNodeIds.add(edge.target)
        })

        // Keep chat models and agents even if disconnected (they can be entry points)
        const filteredNodes = nodes.filter((node) => {
            if (node.type === 'stickyNote') return true
            if (node.data.category === 'Chat Models' || node.data.category === 'Agents') return true
            return connectedNodeIds.has(node.id)
        })

        return {
            ...flowData,
            nodes: filteredNodes
        }
    }

    /**
     * Auto-connect tools to the chat model/agent
     */
    static async connectToolsToModel(flowData: IReactFlowObject): Promise<IReactFlowObject> {
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        // Find the chat model or agent
        const entryNode = nodes.find((n) => n.data.category === 'Chat Models' || n.data.category === 'Agents')
        if (!entryNode) return flowData

        // Find unconnected tools
        const connectedNodeIds = new Set(edges.map((e) => e.target))
        const unconnectedTools = nodes.filter(
            (n) => n.data.category === 'Tools' && !connectedNodeIds.has(n.id) && n.id !== entryNode.id
        )

        let updatedFlowData = flowData
        for (const tool of unconnectedTools) {
            try {
                // Create edge from tool to entry node
                const newEdge: any = {
                    id: `${tool.id}-${entryNode.id}`,
                    source: tool.id,
                    target: entryNode.id,
                    sourceHandle: `${tool.id}-output-${tool.data.outputAnchors?.[0]?.name || 'output'}`,
                    targetHandle: `${entryNode.id}-input-tools`,
                    type: 'buttonedge',
                    data: { label: '' }
                }
                updatedFlowData = {
                    ...updatedFlowData,
                    edges: [...(updatedFlowData.edges || []), newEdge]
                }
            } catch (e) {
                console.error(`Failed to connect tool ${tool.id}:`, e)
            }
        }

        return updatedFlowData
    }

    /**
     * Fix all issues automatically with normalization
     */
    static async fixAll(flowData: IReactFlowObject, issues: string[]): Promise<IReactFlowObject> {
        let updatedFlowData = { ...flowData }

        // Step 1: Normalize - ensure single chat model with defaults
        updatedFlowData = await this.enforceSingleChatModel(updatedFlowData)

        // Step 2: Auto-connect tools to the model
        updatedFlowData = await this.connectToolsToModel(updatedFlowData)

        // Step 3: Remove any remaining disconnected nodes
        updatedFlowData = this.removeDisconnected(updatedFlowData)

        return updatedFlowData
    }

    /**
     * Save the fixed workflow to database
     */
    static async saveWorkflow(flowId: string, flowData: IReactFlowObject): Promise<ChatFlow> {
        const app = getRunningExpressApp()
        const repo = app.AppDataSource.getRepository(ChatFlow)
        const chatflow = await repo.findOneBy({ id: flowId })
        
        if (!chatflow) {
            throw new Error('Chatflow not found')
        }

        chatflow.flowData = JSON.stringify(flowData)
        chatflow.updatedDate = new Date()
        
        return await repo.save(chatflow)
    }
}

