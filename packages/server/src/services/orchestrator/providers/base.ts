/**
 * Base interface for orchestrator provider adapters
 */

export interface ProviderCredentials {
    [key: string]: any
}

export interface Workflow {
    id: string
    name: string
    description?: string
    provider: string
    lastUpdated: Date
    status: string
    type?: string
    tags?: string[]
}

export interface WorkflowPreview {
    id: string
    name: string
    description?: string
    provider: string
    flowData?: any // Graph structure if available
    metadata?: {
        inputs?: Array<{ name: string; type: string; required: boolean }>
        outputs?: Array<{ name: string; type: string }>
        nodes?: number
        triggers?: string[]
        active?: boolean
        lastEdit?: string
        teamId?: string
        organizationId?: string
        modified_at?: string
        url?: string
        [key: string]: any
    }
    webhookUrl?: string
}

export interface ExecutionResult {
    success: boolean
    data?: any
    output?: any
    error?: string
    executionId?: string
    status?: 'completed' | 'running' | 'failed' | 'pending'
    duration?: number
    metadata?: {
        [key: string]: any
    }
}

export interface ExecutionStatus {
    status: 'completed' | 'running' | 'failed' | 'pending' | 'unknown'
    executionId: string
    data?: any
    output?: any
    error?: string
    progress?: number
    startedAt?: Date
    finishedAt?: Date
    metadata?: {
        [key: string]: any
    }
}

export interface ProviderAdapter {
    /**
     * Test connection with provided credentials
     */
    authenticate(credentials: ProviderCredentials): Promise<boolean>

    /**
     * List available workflows from this provider
     */
    listWorkflows(connectionId: string): Promise<Workflow[]>

    /**
     * Get detailed preview/metadata for a specific workflow
     */
    getWorkflowPreview(workflowId: string, connectionId: string): Promise<WorkflowPreview>

    /**
     * Execute a workflow
     */
    executeWorkflow(workflowId: string, data: any, connectionId: string): Promise<ExecutionResult>

    /**
     * Poll execution status (for async workflows)
     */
    pollExecution?(executionId: string, connectionId: string): Promise<ExecutionStatus>
}

export abstract class BaseProvider implements ProviderAdapter {
    protected providerName: string

    constructor(providerName: string) {
        this.providerName = providerName
    }

    abstract authenticate(credentials: ProviderCredentials): Promise<boolean>
    abstract listWorkflows(connectionId: string): Promise<Workflow[]>
    abstract getWorkflowPreview(workflowId: string, connectionId: string): Promise<WorkflowPreview>
    abstract executeWorkflow(workflowId: string, data: any, connectionId: string): Promise<ExecutionResult>

    /**
     * Get stored credentials for a connection
     */
    protected async getCredentials(connectionId: string): Promise<ProviderCredentials> {
        const { getRunningExpressApp } = require('../../../utils/getRunningExpressApp')
        const { ProviderConnection } = require('../../../database/entities/ProviderConnection')
        
        const appServer = getRunningExpressApp()
        const connection = await appServer.AppDataSource.getRepository(ProviderConnection).findOneBy({ 
            id: connectionId 
        })
        
        if (!connection) {
            throw new Error(`Connection ${connectionId} not found`)
        }
        
        if (connection.provider !== this.providerName) {
            throw new Error(`Connection is for ${connection.provider}, not ${this.providerName}`)
        }
        
        // Decrypt credentials (assuming they're stored as JSON)
        const credentials = JSON.parse(connection.credentials)
        return credentials
    }

    /**
     * Store credentials for a new connection
     */
    protected async storeCredentials(
        workspaceId: string, 
        credentials: ProviderCredentials,
        name?: string
    ): Promise<string> {
        const { getRunningExpressApp } = require('../../../utils/getRunningExpressApp')
        const { ProviderConnection } = require('../../../database/entities/ProviderConnection')
        const { v4: uuidv4 } = require('uuid')
        
        const appServer = getRunningExpressApp()
        const connection = new ProviderConnection()
        connection.id = uuidv4()
        connection.workspaceId = workspaceId
        connection.provider = this.providerName
        connection.credentials = JSON.stringify(credentials)
        connection.status = 'ACTIVE'
        
        await appServer.AppDataSource.getRepository(ProviderConnection).save(connection)
        return connection.id
    }
}

