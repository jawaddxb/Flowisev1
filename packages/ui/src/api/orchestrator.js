import client from './client'

const getAllOrchestrators = () => client.get('/orchestrator')
const getOrchestrator = (id) => client.get(`/orchestrator/${id}`)
const createOrchestrator = (body) => client.post('/orchestrator', body)
const updateOrchestrator = (id, body) => client.put(`/orchestrator/${id}`, body)
const deleteOrchestrator = (id) => client.delete(`/orchestrator/${id}`)
const runOrchestrator = (id, body) => client.post(`/orchestrator/${id}/run`, body)
const getOrchestratorRuns = (id) => client.get(`/orchestrator/${id}/runs`)

export default {
    getAllOrchestrators,
    getOrchestrator,
    createOrchestrator,
    updateOrchestrator,
    deleteOrchestrator,
    runOrchestrator,
    getOrchestratorRuns
}

