import axios, { AxiosInstance } from 'axios'
import { BaseProvider, ProviderCredentials, Workflow, WorkflowPreview, ExecutionResult, ExecutionStatus } from './base'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { ProviderConnection } from '../../../database/entities/ProviderConnection'

/**
 * Zapier Provider Adapter
 * 
 * Integrates with Zapier for workflow orchestration.
 * 
 * Zapier API Documentation: https://platform.zapier.com/docs/api
 * 
 * Key capabilities:
 * - List Zaps (workflows) via REST API
 * - Get Zap details including webhook URLs
 * - Execute Zaps via webhook triggers
 * - Limited execution status polling (Zapier doesn't expose detailed execution APIs)
 * 
 * Authentication: API Key (available in Zapier account settings)
 * 
 * Note: Zapier's API is more limited than n8n or Make. Most interactions
 * happen via webhooks, and execution tracking is minimal.
 */
export class ZapierProvider extends BaseProvider {
    constructor() {
        super('zapier')
    }

    /**
     * Authenticate with Zapier API
     * Validates the API key by attempting to fetch user profile
     */
    async authenticate(credentials: ProviderCredentials): Promise<boolean> {
        try {
            const { apiKey } = credentials
            if (!apiKey) {
                throw new Error('Zapier API key is required')
            }

            const client = this.createClient(credentials)
            
            // Test connection by fetching user profile
            const response = await client.get('/users/me')

            return response.status === 200
        } catch (error: any) {
            console.error('[ZapierProvider] Authentication failed:', error.message)
            return false
        }
    }

    /**
     * List all Zaps (workflows) from Zapier
     */
    async listWorkflows(connectionId: string): Promise<Workflow[]> {
        try {
            const credentials = await this.getCredentials(connectionId)
            const client = this.createClient(credentials)

            // Zapier API: GET /zaps
            const response = await client.get('/zaps')
            const zaps = response.data || []

            return zaps.map((zap: any) => ({
                id: zap.id?.toString(),
                name: zap.title || zap.name || 'Unnamed Zap',
                description: zap.description || '',
                active: zap.state === 'on',
                provider: 'zapier'
            }))
        } catch (error: any) {
            console.error('[ZapierProvider] Failed to list workflows:', error.message)
            throw new Error(`Failed to list Zapier Zaps: ${error.message}`)
        }
    }

    /**
     * Get detailed preview of a Zapier Zap
     * Includes webhook URL extraction and basic flow visualization
     */
    async getWorkflowPreview(workflowId: string, connectionId: string): Promise<WorkflowPreview> {
        try {
            const credentials = await this.getCredentials(connectionId)
            const client = this.createClient(credentials)

            // Zapier API: GET /zaps/{zapId}
            const response = await client.get(`/zaps/${workflowId}`)
            const zap = response.data

            // Extract webhook URL from trigger step
            let webhookUrl: string | undefined
            const steps = zap.steps || []
            const webhookStep = steps.find((step: any) => 
                step.type === 'read' && 
                (step.app === 'webhook' || step.app === 'webhooks')
            )

            if (webhookStep && webhookStep.url) {
                webhookUrl = webhookStep.url
            }

            // Convert Zapier steps to ReactFlow format
            const flowData = this.convertZapierToReactFlow(zap)

            return {
                id: workflowId,
                name: zap.title || zap.name || 'Unnamed Zap',
                description: zap.description || '',
                provider: 'zapier',
                flowData,
                webhookUrl,
                metadata: {
                    active: zap.state === 'on',
                    modified_at: zap.modified_at,
                    url: zap.url // Link to Zapier editor
                }
            }
        } catch (error: any) {
            console.error('[ZapierProvider] Failed to get workflow preview:', error.message)
            throw new Error(`Failed to get Zapier Zap preview: ${error.message}`)
        }
    }

    /**
     * Execute a Zapier Zap via webhook
     */
    async executeWorkflow(workflowId: string, data: any, connectionId: string): Promise<ExecutionResult> {
        try {
            const credentials = await this.getCredentials(connectionId)
            
            // First, get the webhook URL from the Zap
            const preview = await this.getWorkflowPreview(workflowId, connectionId)
            
            if (!preview.webhookUrl) {
                throw new Error(`No webhook URL found for Zapier Zap: ${workflowId}`)
            }

            // Execute via webhook (no auth needed for webhook calls)
            const startTime = Date.now()
            const response = await axios.post(preview.webhookUrl, data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            })

            const duration = Date.now() - startTime

            // Zapier webhooks typically return 200 OK with minimal data
            return {
                success: response.status >= 200 && response.status < 300,
                executionId: `zapier-${workflowId}-${Date.now()}`,
                output: response.data,
                duration,
                metadata: {
                    statusCode: response.status,
                    webhookUrl: preview.webhookUrl,
                    message: 'Zapier webhook triggered successfully'
                }
            }
        } catch (error: any) {
            console.error('[ZapierProvider] Failed to execute workflow:', error.message)
            return {
                success: false,
                executionId: `zapier-${workflowId}-${Date.now()}`,
                output: null,
                error: error.message,
                duration: 0
            }
        }
    }

    /**
     * Poll execution status (Zapier doesn't provide execution polling)
     */
    async pollExecution(executionId: string, connectionId: string): Promise<ExecutionStatus> {
        // Zapier doesn't provide a public API for execution status
        // Executions are tracked in the Zapier dashboard, not via API
        console.warn('[ZapierProvider] Polling not supported for Zapier')
        
        return {
            executionId,
            status: 'unknown',
            output: null,
            metadata: {
                message: 'Zapier does not provide execution polling API. Check Zapier dashboard for execution history.'
            }
        }
    }

    /**
     * Convert Zapier Zap to ReactFlow format
     */
    private convertZapierToReactFlow(zap: any): any {
        const steps = zap.steps || []
        const nodes: any[] = []
        const edges: any[] = []

        steps.forEach((step: any, index: number) => {
            const nodeId = step.id?.toString() || `step-${index}`
            
            // Determine step type (trigger vs action)
            const stepType = step.type === 'read' ? 'Trigger' : 'Action'
            const appName = step.app_name || step.app || 'Unknown'
            
            nodes.push({
                id: nodeId,
                type: 'default',
                position: { x: 100 + (index * 250), y: 100 },
                data: {
                    label: `${stepType}: ${appName}`,
                    type: stepType.toLowerCase(),
                    description: step.description || step.title || '',
                    app: appName
                }
            })

            // Create edges (sequential flow)
            if (index > 0) {
                const prevNodeId = steps[index - 1].id?.toString() || `step-${index - 1}`
                edges.push({
                    id: `e-${prevNodeId}-${nodeId}`,
                    source: prevNodeId,
                    target: nodeId,
                    type: 'smoothstep'
                })
            }
        })

        return {
            nodes,
            edges,
            viewport: { x: 0, y: 0, zoom: 1 }
        }
    }

    /**
     * Create authenticated axios client for Zapier API
     */
    private createClient(credentials: ProviderCredentials): AxiosInstance {
        const baseURL = credentials.baseUrl || 'https://api.zapier.com/v1'
        
        return axios.create({
            baseURL,
            headers: {
                'X-API-Key': credentials.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        })
    }
}

export const zapierProvider = new ZapierProvider()

