import { Orchestrator } from '../../database/entities/Orchestrator'
import { OrchestratorRun } from '../../database/entities/OrchestratorRun'
import { ProviderConnection } from '../../database/entities/ProviderConnection'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import axios from 'axios'
import n8nProvider from './providers/n8n'
import { makeProvider } from './providers/make'
import { zapierProvider } from './providers/zapier'

interface OrchestratorNode {
    id: string
    type: string
    data: {
        label: string
        nodeType: string
        config: any
    }
}

interface OrchestratorEdge {
    id: string
    source: string
    target: string
}

interface OrchestratorDefinition {
    nodes: OrchestratorNode[]
    edges: OrchestratorEdge[]
    version: number
}

class OrchestratorRunner {
    async execute(orchestrator: Orchestrator, run: OrchestratorRun, inputs: any): Promise<void> {
        const appServer = getRunningExpressApp()
        const definition: OrchestratorDefinition = JSON.parse(orchestrator.definition)
        
        try {
            const logs: any[] = JSON.parse(run.logs || '[]')
            
            // Find entry nodes (nodes with no incoming edges)
            const targetNodeIds = new Set(definition.edges.map(e => e.target))
            const entryNodes = definition.nodes.filter(n => !targetNodeIds.has(n.id))
            
            if (entryNodes.length === 0) {
                throw new Error('No entry nodes found')
            }
            
            // Build adjacency map for edge-aware traversal
            const adjacency = new Map<string, string[]>()
            for (const edge of definition.edges) {
                if (!adjacency.has(edge.source)) {
                    adjacency.set(edge.source, [])
                }
                adjacency.get(edge.source)!.push(edge.target)
            }
            
            // Execute nodes in topological order (BFS from entry nodes)
            const executed = new Set<string>()
            const queue = [...entryNodes.map(n => n.id)]
            let currentData = inputs
            
            while (queue.length > 0) {
                const nodeId = queue.shift()!
                if (executed.has(nodeId)) continue
                
                const node = definition.nodes.find(n => n.id === nodeId)
                if (!node) continue
                
                logs.push({ timestamp: new Date(), message: `Executing node: ${node.data.label}` })
                currentData = await this.executeNode(node, currentData, run)
                executed.add(nodeId)
                
                // Enqueue child nodes
                const children = adjacency.get(nodeId) || []
                for (const childId of children) {
                    if (!executed.has(childId)) {
                        queue.push(childId)
                    }
                }
            }
            
            // Update run status
            run.status = 'COMPLETED'
            run.finishedAt = new Date()
            run.logs = JSON.stringify(logs)
            
            await appServer.AppDataSource.getRepository(OrchestratorRun).save(run)
        } catch (error: any) {
            const logs: any[] = JSON.parse(run.logs || '[]')
            logs.push({ timestamp: new Date(), message: `Error: ${error.message}`, level: 'error' })
            
            run.status = 'FAILED'
            run.finishedAt = new Date()
            run.logs = JSON.stringify(logs)
            
            await appServer.AppDataSource.getRepository(OrchestratorRun).save(run)
            throw error
        }
    }
    
    private async executeNode(node: OrchestratorNode, data: any, run: OrchestratorRun): Promise<any> {
        switch (node.data.nodeType) {
            case 'RemoteWebhook':
                return await this.executeRemoteWebhook(node, data)
            case 'LocalFlow':
                return await this.executeLocalFlow(node, data)
            case 'DataMapper':
                return await this.executeDataMapper(node, data)
            case 'WaitForCallback':
                return await this.executeWaitForCallback(node, data, run)
            case 'Condition':
                return data // Pass through for MVP
            case 'ErrorBoundary':
                return data // Pass through for MVP
            case 'Parallel':
                return data // Pass through for MVP
            default:
                return data
        }
    }
    
    private async executeRemoteWebhook(node: OrchestratorNode, data: any): Promise<any> {
        const { 
            url, 
            method = 'POST', 
            headers = {}, 
            bodyTemplate, 
            timeout = 30000,
            provider,
            workflowId,
            enablePolling = false,
            pollingInterval = 2000,
            maxPollingAttempts = 30,
            retryAttempts = 0,
            retryDelay = 1000
        } = node.data.config
        
        return await this.executeWithRetry(
            async () => {
                // If provider is specified, use provider adapter for execution
                if (provider && workflowId) {
                    return await this.executeViaProvider(provider, workflowId, data, enablePolling, pollingInterval, maxPollingAttempts)
                }
                
                // Otherwise, direct webhook call
                const response = await axios({
                    method,
                    url,
                    headers,
                    data: bodyTemplate ? this.interpolateTemplate(bodyTemplate, data) : data,
                    timeout
                })
                
                return response.data
            },
            retryAttempts,
            retryDelay,
            `RemoteWebhook (${node.data.label})`
        )
    }
    
    private async executeWithRetry<T>(
        fn: () => Promise<T>,
        maxRetries: number,
        retryDelay: number,
        context: string
    ): Promise<T> {
        let lastError: Error | null = null
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn()
            } catch (error: any) {
                lastError = error
                
                if (attempt < maxRetries) {
                    console.warn(`[${context}] Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`)
                    await this.sleep(retryDelay)
                    
                    // Exponential backoff
                    retryDelay *= 2
                } else {
                    console.error(`[${context}] All ${maxRetries + 1} attempts failed`)
                }
            }
        }
        
        throw new Error(`${context} failed after ${maxRetries + 1} attempts: ${lastError?.message}`)
    }
    
    private async executeViaProvider(
        provider: string, 
        workflowId: string, 
        data: any,
        enablePolling: boolean,
        pollingInterval: number,
        maxPollingAttempts: number
    ): Promise<any> {
        const appServer = getRunningExpressApp()
        
        // Get active connection for this provider
        const connection = await appServer.AppDataSource.getRepository(ProviderConnection).findOne({
            where: { provider, status: 'ACTIVE' }
        })
        
        if (!connection) {
            throw new Error(`No active connection found for provider: ${provider}`)
        }
        
        // Get provider adapter
        let providerAdapter
        switch (provider) {
            case 'n8n':
                providerAdapter = n8nProvider
                break
            case 'make':
                providerAdapter = makeProvider
                break
            case 'zapier':
                providerAdapter = zapierProvider
                break
            default:
                throw new Error(`Unknown provider: ${provider}`)
        }
        
        // Execute workflow
        const result = await providerAdapter.executeWorkflow(workflowId, data, connection.id)
        
        if (!result.success) {
            throw new Error(result.error || 'Workflow execution failed')
        }
        
        // If polling is enabled and provider supports it, poll for completion
        if (enablePolling && typeof providerAdapter.pollExecution === 'function' && result.executionId) {
            return await this.pollForCompletion(
                providerAdapter,
                result.executionId,
                connection.id,
                pollingInterval,
                maxPollingAttempts
            )
        }
        
        return result.output || result.data
    }
    
    private async pollForCompletion(
        providerAdapter: any,
        executionId: string,
        connectionId: string,
        interval: number,
        maxAttempts: number
    ): Promise<any> {
        let attempts = 0
        
        while (attempts < maxAttempts) {
            await this.sleep(interval)
            
            const status = await providerAdapter.pollExecution(executionId, connectionId)
            
            if (status.status === 'success' || status.status === 'completed') {
                return status.output || status.data
            }
            
            if (status.status === 'failed' || status.status === 'error') {
                throw new Error(`Workflow execution failed: ${status.error || 'Unknown error'}`)
            }
            
            attempts++
        }
        
        throw new Error(`Polling timeout after ${maxAttempts} attempts`)
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
    
    private async executeLocalFlow(node: OrchestratorNode, data: any): Promise<any> {
        const { flowId, baseURL = 'http://localhost:3000' } = node.data.config
        
        try {
            const response = await axios.post(
                `${baseURL}/api/v1/prediction/${flowId}`,
                { question: data.question || JSON.stringify(data) }
            )
            
            return response.data
        } catch (error: any) {
            throw new Error(`LocalFlow failed: ${error.message}`)
        }
    }
    
    private async executeDataMapper(node: OrchestratorNode, data: any): Promise<any> {
        const { mappings = [] } = node.data.config
        const result: any = {}
        
        for (const mapping of mappings) {
            const value = this.getNestedValue(data, mapping.from)
            this.setNestedValue(result, mapping.to, value)
        }
        
        return result
    }
    
    private async executeWaitForCallback(node: OrchestratorNode, data: any, run: OrchestratorRun): Promise<any> {
        // For MVP, this would pause execution and wait for callback
        // In a real implementation, this would use a queue/state machine
        return data
    }
    
    async resumeFromCallback(run: OrchestratorRun, callbackData: any): Promise<void> {
        const appServer = getRunningExpressApp()
        
        try {
            const logs: any[] = JSON.parse(run.logs || '[]')
            logs.push({ 
                timestamp: new Date(), 
                message: 'Callback received', 
                data: callbackData,
                correlationId: callbackData.correlationId || run.id
            })
            
            // Store callback data in run metadata
            const metadata = run.metadata ? JSON.parse(run.metadata) : {}
            metadata.callbackData = callbackData
            metadata.callbackReceivedAt = new Date()
            
            run.logs = JSON.stringify(logs)
            run.metadata = JSON.stringify(metadata)
            
            // If run is in WAITING state, resume execution
            if (run.status === 'WAITING') {
                logs.push({ timestamp: new Date(), message: 'Resuming execution after callback' })
                run.status = 'RUNNING'
                run.logs = JSON.stringify(logs)
                
                await appServer.AppDataSource.getRepository(OrchestratorRun).save(run)
                
                // Get orchestrator and continue execution
                const orchestrator = await appServer.AppDataSource.getRepository(Orchestrator).findOneBy({ id: run.orchestratorId })
                if (orchestrator) {
                    await this.execute(orchestrator, run, callbackData)
                }
            } else {
                await appServer.AppDataSource.getRepository(OrchestratorRun).save(run)
            }
        } catch (error: any) {
            const logs: any[] = JSON.parse(run.logs || '[]')
            logs.push({ 
                timestamp: new Date(), 
                message: `Callback processing error: ${error.message}`, 
                level: 'error' 
            })
            
            run.logs = JSON.stringify(logs)
            run.status = 'FAILED'
            
            await appServer.AppDataSource.getRepository(OrchestratorRun).save(run)
            throw error
        }
    }
    
    generateCorrelationId(orchestratorId: string, runId: string, nodeId?: string): string {
        const parts = [orchestratorId, runId]
        if (nodeId) parts.push(nodeId)
        return parts.join(':')
    }
    
    parseCorrelationId(correlationId: string): { orchestratorId: string; runId: string; nodeId?: string } {
        const parts = correlationId.split(':')
        return {
            orchestratorId: parts[0],
            runId: parts[1],
            nodeId: parts[2]
        }
    }
    
    private interpolateTemplate(template: string, data: any): any {
        if (typeof template !== 'string') return template
        
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            return this.getNestedValue(data, path.trim())
        })
    }
    
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj)
    }
    
    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.')
        const lastKey = keys.pop()!
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {}
            return current[key]
        }, obj)
        target[lastKey] = value
    }
}

export default new OrchestratorRunner()

