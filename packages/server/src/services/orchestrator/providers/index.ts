import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import { ProviderConnection } from '../../../database/entities/ProviderConnection'
import n8nProvider from './n8n'
import { makeProvider } from './make'
import { zapierProvider } from './zapier'

interface Provider {
    id: string
    name: string
    status: 'connected' | 'disconnected' | 'error'
    type: string
    connectionId?: string
}

interface Workflow {
    id: string
    name: string
    description?: string
    provider: string
    lastUpdated: Date
    status: string
    type?: string
}

const getProviders = async (workspaceId?: string): Promise<Provider[]> => {
    const appServer = getRunningExpressApp()
    
    // Get active connections for this workspace
    const connections = workspaceId 
        ? await appServer.AppDataSource.getRepository(ProviderConnection).find({
            where: { workspaceId, status: 'ACTIVE' }
        })
        : []
    
    const connectionMap = new Map(connections.map(c => [c.provider, c]))
    
    return [
        {
            id: 'local',
            name: 'Local Flows',
            status: 'connected',
            type: 'local'
        },
        {
            id: 'n8n',
            name: 'n8n',
            status: connectionMap.has('n8n') ? 'connected' : 'disconnected',
            type: 'external',
            connectionId: connectionMap.get('n8n')?.id
        },
        {
            id: 'make',
            name: 'Make',
            status: connectionMap.has('make') ? 'connected' : 'disconnected',
            type: 'external',
            connectionId: connectionMap.get('make')?.id
        },
        {
            id: 'zapier',
            name: 'Zapier',
            status: connectionMap.has('zapier') ? 'connected' : 'disconnected',
            type: 'external',
            connectionId: connectionMap.get('zapier')?.id
        }
    ]
}

const getProviderWorkflows = async (provider: string, workspaceId?: string): Promise<Workflow[]> => {
    if (provider === 'local') {
        return await getLocalFlows(workspaceId)
    }
    
    // Get connection for this provider
    const appServer = getRunningExpressApp()
    const connection = await appServer.AppDataSource.getRepository(ProviderConnection).findOne({
        where: { workspaceId, provider, status: 'ACTIVE' }
    })
    
    if (!connection) {
        throw new Error(`No active connection found for provider: ${provider}`)
    }
    
    // Use provider adapter
    switch (provider) {
        case 'n8n':
            return await n8nProvider.listWorkflows(connection.id)
        case 'make':
            return await makeProvider.listWorkflows(connection.id)
        case 'zapier':
            return await zapierProvider.listWorkflows(connection.id)
        default:
            return []
    }
}

const getLocalFlows = async (workspaceId?: string): Promise<Workflow[]> => {
    const appServer = getRunningExpressApp()
    const query = appServer.AppDataSource.getRepository(ChatFlow).createQueryBuilder('chatflow')
    
    if (workspaceId) {
        query.where('chatflow.workspaceId = :workspaceId', { workspaceId })
    }
    
    const flows = await query.orderBy('chatflow.updatedDate', 'DESC').getMany()
    
    return flows.map(flow => ({
        id: flow.id,
        name: flow.name,
        description: flow.category || '',
        provider: 'local',
        lastUpdated: flow.updatedDate,
        status: 'active',
        type: flow.type || 'CHATFLOW'
    }))
}

const getWorkflowPreview = async (provider: string, workflowId: string, workspaceId?: string): Promise<any> => {
    if (provider === 'local') {
        const appServer = getRunningExpressApp()
        const flow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({ id: workflowId })
        
        if (!flow) {
            throw new Error(`Flow ${workflowId} not found`)
        }
        
        return {
            id: flow.id,
            name: flow.name,
            description: flow.category || '',
            provider: 'local',
            flowData: flow.flowData,
            type: flow.type || 'CHATFLOW'
        }
    }
    
    // Get connection for this provider
    const appServer = getRunningExpressApp()
    const connection = await appServer.AppDataSource.getRepository(ProviderConnection).findOne({
        where: { workspaceId, provider, status: 'ACTIVE' }
    })
    
    if (!connection) {
        throw new Error(`No active connection found for provider: ${provider}`)
    }
    
    // Use provider adapter
    switch (provider) {
        case 'n8n':
            return await n8nProvider.getWorkflowPreview(workflowId, connection.id)
        case 'make':
            return await makeProvider.getWorkflowPreview(workflowId, connection.id)
        case 'zapier':
            return await zapierProvider.getWorkflowPreview(workflowId, connection.id)
        default:
            return null
    }
}

export default {
    getProviders,
    getProviderWorkflows,
    getWorkflowPreview
}

