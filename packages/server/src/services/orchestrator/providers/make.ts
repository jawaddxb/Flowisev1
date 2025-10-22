import axios, { AxiosInstance } from 'axios'
import { BaseProvider, ProviderCredentials, Workflow, WorkflowPreview, ExecutionResult, ExecutionStatus } from './base'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { ProviderConnection } from '../../../database/entities/ProviderConnection'

/**
 * Make.com Provider Adapter
 * 
 * Integrates with Make.com (formerly Integromat) for workflow orchestration.
 * 
 * Make API Documentation: https://www.make.com/en/api-documentation
 * 
 * Key capabilities:
 * - List scenarios (workflows) via REST API
 * - Get scenario details including webhook URLs
 * - Execute scenarios via webhook triggers
 * - Poll execution status (if execution ID available)
 * 
 * Authentication: API Token (Organization-level or Team-level)
 */
export class MakeProvider extends BaseProvider {
    constructor() {
        super('make')
    }

    /**
     * Authenticate with Make.com API
     * Validates the API token by attempting to list scenarios
     */
    async authenticate(credentials: ProviderCredentials): Promise<boolean> {
        try {
            const { apiKey, baseUrl } = credentials
            if (!apiKey) {
                throw new Error('Make API token is required')
            }

            const client = this.createClient(credentials)
            
            // Test connection by listing scenarios (with limit 1)
            const response = await client.get('/scenarios', {
                params: { limit: 1 }
            })

            return response.status === 200
        } catch (error: any) {
            console.error('[MakeProvider] Authentication failed:', error.message)
            return false
        }
    }

    /**
     * List all scenarios (workflows) from Make.com
     */
    async listWorkflows(connectionId: string): Promise<Workflow[]> {
        try {
            const credentials = await this.getCredentials(connectionId)
            const client = this.createClient(credentials)

            // Make API: GET /scenarios
            const response = await client.get('/scenarios')
            const scenarios = response.data?.scenarios || response.data || []

            return scenarios.map((scenario: any) => ({
                id: scenario.id?.toString() || scenario.scenarioId?.toString(),
                name: scenario.name || 'Unnamed Scenario',
                description: scenario.description || '',
                active: scenario.scheduling?.type === 'indefinitely', // Active if scheduled indefinitely
                provider: 'make'
            }))
        } catch (error: any) {
            console.error('[MakeProvider] Failed to list workflows:', error.message)
            throw new Error(`Failed to list Make scenarios: ${error.message}`)
        }
    }

    /**
     * Get detailed preview of a Make scenario
     * Includes webhook URL extraction and basic flow visualization
     */
    async getWorkflowPreview(workflowId: string, connectionId: string): Promise<WorkflowPreview> {
        try {
            const credentials = await this.getCredentials(connectionId)
            const client = this.createClient(credentials)

            // Make API: GET /scenarios/{scenarioId}
            const response = await client.get(`/scenarios/${workflowId}`)
            const scenario = response.data

            // Extract webhook URL from the first webhook module
            let webhookUrl: string | undefined
            const modules = scenario.blueprint?.flow || []
            const webhookModule = modules.find((m: any) => 
                m.module?.includes('webhook') || 
                m.type === 'webhook' ||
                m.mapper?.url // Some webhook modules have mapper.url
            )

            if (webhookModule) {
                // Make webhooks are typically in format: https://hook.{region}.make.com/{hookId}
                webhookUrl = webhookModule.mapper?.url || webhookModule.url
                
                // If not found, construct from scenario ID (fallback)
                if (!webhookUrl && scenario.hook) {
                    const region = credentials.baseUrl?.includes('eu') ? 'eu1' : 'us1'
                    webhookUrl = `https://hook.${region}.make.com/${scenario.hook}`
                }
            }

            // Convert Make blueprint to ReactFlow format
            const flowData = this.convertMakeToReactFlow(scenario)

            return {
                id: workflowId,
                name: scenario.name || 'Unnamed Scenario',
                description: scenario.description || '',
                provider: 'make',
                flowData,
                webhookUrl,
                metadata: {
                    active: scenario.scheduling?.type === 'indefinitely',
                    lastEdit: scenario.lastEdit,
                    teamId: scenario.teamId,
                    organizationId: scenario.organizationId
                }
            }
        } catch (error: any) {
            console.error('[MakeProvider] Failed to get workflow preview:', error.message)
            throw new Error(`Failed to get Make scenario preview: ${error.message}`)
        }
    }

    /**
     * Execute a Make scenario via webhook
     */
    async executeWorkflow(workflowId: string, data: any, connectionId: string): Promise<ExecutionResult> {
        try {
            const credentials = await this.getCredentials(connectionId)
            
            // First, get the webhook URL from the scenario
            const preview = await this.getWorkflowPreview(workflowId, connectionId)
            
            if (!preview.webhookUrl) {
                throw new Error(`No webhook URL found for Make scenario: ${workflowId}`)
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

            return {
                success: response.status >= 200 && response.status < 300,
                executionId: response.data?.executionId || `make-${workflowId}-${Date.now()}`,
                output: response.data,
                duration,
                metadata: {
                    statusCode: response.status,
                    webhookUrl: preview.webhookUrl
                }
            }
        } catch (error: any) {
            console.error('[MakeProvider] Failed to execute workflow:', error.message)
            return {
                success: false,
                executionId: `make-${workflowId}-${Date.now()}`,
                output: null,
                error: error.message,
                duration: 0
            }
        }
    }

    /**
     * Poll execution status (Make doesn't provide easy polling, so this is limited)
     */
    async pollExecution(executionId: string, connectionId: string): Promise<ExecutionStatus> {
        // Make.com doesn't provide a straightforward execution polling API
        // Executions are typically tracked via webhooks or the Make UI
        console.warn('[MakeProvider] Polling not fully supported for Make.com')
        
        return {
            executionId,
            status: 'unknown',
            output: null,
            metadata: {
                message: 'Make.com does not provide execution polling API. Use webhooks for async scenarios.'
            }
        }
    }

    /**
     * Convert Make blueprint to ReactFlow format
     */
    private convertMakeToReactFlow(scenario: any): any {
        const modules = scenario.blueprint?.flow || []
        const nodes: any[] = []
        const edges: any[] = []

        modules.forEach((module: any, index: number) => {
            const nodeId = module.id?.toString() || `module-${index}`
            
            nodes.push({
                id: nodeId,
                type: 'default',
                position: { x: 100 + (index * 250), y: 100 },
                data: {
                    label: module.module || module.name || `Module ${index + 1}`,
                    type: module.type || 'module',
                    description: module.note || ''
                }
            })

            // Create edges based on module connections
            if (index > 0) {
                const prevNodeId = modules[index - 1].id?.toString() || `module-${index - 1}`
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
     * Create authenticated axios client for Make API
     */
    private createClient(credentials: ProviderCredentials): AxiosInstance {
        const baseURL = credentials.baseUrl || 'https://us1.make.com/api/v2'
        
        return axios.create({
            baseURL,
            headers: {
                'Authorization': `Token ${credentials.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        })
    }
}

export const makeProvider = new MakeProvider()

