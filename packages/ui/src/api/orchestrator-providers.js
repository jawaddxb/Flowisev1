import client from './client'

const getProviders = () => client.get('/orchestrator/providers')
const getProviderWorkflows = (provider) => client.get(`/orchestrator/providers/${provider}/workflows`)
const getWorkflowPreview = (provider, workflowId) => client.get(`/orchestrator/providers/${provider}/workflows/${workflowId}/preview`)

// Connection management
const listConnections = () => client.get('/orchestrator/connections')
const connectProvider = (provider, body) => client.post(`/orchestrator/providers/${provider}/connect`, body)
const disconnectProvider = (connectionId) => client.delete(`/orchestrator/connections/${connectionId}`)
const testConnection = (provider, body) => client.post(`/orchestrator/providers/${provider}/test`, body)

export default {
    getProviders,
    getProviderWorkflows,
    getWorkflowPreview,
    listConnections,
    connectProvider,
    disconnectProvider,
    testConnection
}

