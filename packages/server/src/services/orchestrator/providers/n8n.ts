import axios, { AxiosInstance } from 'axios'
import { BaseProvider, ProviderCredentials, Workflow, WorkflowPreview, ExecutionResult, ExecutionStatus } from './base'

export interface N8nCredentials extends ProviderCredentials {
    baseUrl: string
    apiKey: string
}

export class N8nProvider extends BaseProvider {
    constructor() {
        super('n8n')
    }

    /**
     * Create authenticated axios instance
     */
    private createClient(credentials: N8nCredentials): AxiosInstance {
        return axios.create({
            baseURL: credentials.baseUrl,
            headers: {
                'X-N8N-API-KEY': credentials.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        })
    }

    async authenticate(credentials: ProviderCredentials): Promise<boolean> {
        try {
            const n8nCreds = credentials as N8nCredentials
            const client = this.createClient(n8nCreds)
            
            // Test connection by fetching current user
            const response = await client.get('/api/v1/users/me')
            return response.status === 200
        } catch (error: any) {
            console.error('n8n authentication failed:', error.message)
            return false
        }
    }

    async listWorkflows(connectionId: string): Promise<Workflow[]> {
        try {
            const credentials = await this.getCredentials(connectionId) as N8nCredentials
            const client = this.createClient(credentials)
            
            const response = await client.get('/api/v1/workflows')
            const workflows = response.data.data || response.data
            
            return workflows.map((wf: any) => ({
                id: wf.id,
                name: wf.name,
                description: wf.settings?.description || '',
                provider: 'n8n',
                lastUpdated: new Date(wf.updatedAt),
                status: wf.active ? 'active' : 'inactive',
                tags: wf.tags?.map((t: any) => t.name) || []
            }))
        } catch (error: any) {
            console.error('Failed to list n8n workflows:', error.message)
            throw new Error(`Failed to list n8n workflows: ${error.message}`)
        }
    }

    async getWorkflowPreview(workflowId: string, connectionId: string): Promise<WorkflowPreview> {
        try {
            const credentials = await this.getCredentials(connectionId) as N8nCredentials
            const client = this.createClient(credentials)
            
            const response = await client.get(`/api/v1/workflows/${workflowId}`)
            const workflow = response.data
            
            // Extract webhook URL if workflow has a webhook trigger
            let webhookUrl: string | undefined
            const webhookNode = workflow.nodes?.find((n: any) => n.type === 'n8n-nodes-base.webhook')
            if (webhookNode) {
                const path = webhookNode.parameters?.path || workflowId
                webhookUrl = `${credentials.baseUrl}/webhook/${path}`
            }
            
            // Count nodes and identify triggers
            const nodes = workflow.nodes || []
            const triggers = nodes
                .filter((n: any) => n.type?.includes('trigger') || n.type?.includes('webhook'))
                .map((n: any) => n.type)
            
            return {
                id: workflow.id,
                name: workflow.name,
                description: workflow.settings?.description || '',
                provider: 'n8n',
                flowData: this.convertN8nToReactFlow(workflow),
                metadata: {
                    nodes: nodes.length,
                    triggers,
                    inputs: this.extractInputs(workflow),
                    outputs: this.extractOutputs(workflow)
                },
                webhookUrl
            }
        } catch (error: any) {
            console.error('Failed to get n8n workflow preview:', error.message)
            throw new Error(`Failed to get n8n workflow preview: ${error.message}`)
        }
    }

    async executeWorkflow(workflowId: string, data: any, connectionId: string): Promise<ExecutionResult> {
        try {
            const credentials = await this.getCredentials(connectionId) as N8nCredentials
            const client = this.createClient(credentials)
            
            // Get workflow to find webhook URL
            const preview = await this.getWorkflowPreview(workflowId, connectionId)
            
            if (!preview.webhookUrl) {
                throw new Error('Workflow does not have a webhook trigger')
            }
            
            // Execute via webhook
            const response = await axios.post(preview.webhookUrl, data, {
                timeout: 60000
            })
            
            return {
                success: true,
                data: response.data,
                status: 'completed'
            }
        } catch (error: any) {
            console.error('Failed to execute n8n workflow:', error.message)
            return {
                success: false,
                error: error.message,
                status: 'failed'
            }
        }
    }

    async pollExecution(executionId: string, connectionId: string): Promise<ExecutionStatus> {
        try {
            const credentials = await this.getCredentials(connectionId) as N8nCredentials
            const client = this.createClient(credentials)
            
            const response = await client.get(`/api/v1/executions/${executionId}`)
            const execution = response.data
            
            let status: 'completed' | 'running' | 'failed' | 'pending'
            if (execution.finished) {
                status = execution.stoppedAt ? 'failed' : 'completed'
            } else {
                status = execution.startedAt ? 'running' : 'pending'
            }
            
            return {
                executionId,
                status,
                data: execution.data,
                startedAt: execution.startedAt ? new Date(execution.startedAt) : undefined,
                finishedAt: execution.finishedAt ? new Date(execution.finishedAt) : undefined
            }
        } catch (error: any) {
            console.error('Failed to poll n8n execution:', error.message)
            return {
                executionId,
                status: 'failed',
                error: error.message
            }
        }
    }

    /**
     * Convert n8n workflow format to ReactFlow format for preview
     */
    private convertN8nToReactFlow(workflow: any): any {
        const nodes = (workflow.nodes || []).map((node: any, index: number) => ({
            id: node.name,
            type: 'default',
            position: node.position || [index * 200, index * 100],
            data: {
                label: node.parameters?.name || node.name,
                type: node.type
            }
        }))
        
        const edges = (workflow.connections || []).flatMap((conn: any) => {
            const sourceNode = conn.source || conn.node
            const targets = conn.main || []
            
            return targets.flatMap((targetList: any[], outputIndex: number) => 
                targetList.map((target: any) => ({
                    id: `${sourceNode}-${target.node}`,
                    source: sourceNode,
                    target: target.node,
                    sourceHandle: `output_${outputIndex}`,
                    targetHandle: `input_${target.type || 0}`
                }))
            )
        })
        
        return { nodes, edges }
    }

    /**
     * Extract input parameters from workflow
     */
    private extractInputs(workflow: any): Array<{ name: string; type: string; required: boolean }> {
        const webhookNode = workflow.nodes?.find((n: any) => 
            n.type === 'n8n-nodes-base.webhook'
        )
        
        if (!webhookNode) return []
        
        // Try to extract expected parameters from webhook node
        const params = webhookNode.parameters?.options?.responseData || []
        return params.map((p: any) => ({
            name: p.name || 'data',
            type: p.type || 'string',
            required: p.required || false
        }))
    }

    /**
     * Extract output structure from workflow
     */
    private extractOutputs(workflow: any): Array<{ name: string; type: string }> {
        // Find the last node (usually the output)
        const nodes = workflow.nodes || []
        if (nodes.length === 0) return []
        
        return [{
            name: 'result',
            type: 'object'
        }]
    }
}

export default new N8nProvider()

