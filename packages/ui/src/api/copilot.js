import client from './client'

const generate = (body) => client.post('/copilot/generate', body)
const planEdits = (body) => client.post('/copilot/plan-edits', body)
const apply = (body) => client.post('/copilot/apply', body)
const undo = (flowId) => client.post(`/copilot/undo/${flowId}`)
const classifyAndPlan = (body) => client.post('/copilot/classify-and-plan', body)
const clarify = (body) => client.post('/copilot/clarify', body)
const capabilities = () => client.get('/copilot/capabilities')
const getHistory = (flowId) => client.get(`/copilot/history/${flowId}`)
const clearHistory = (flowId) => client.post(`/copilot/history/${flowId}/clear`)
const chat = (body) => client.post('/copilot/chat', body)
const autoApply = (body) => client.post('/copilot/auto-apply', body)
const review = (body) => client.post('/copilot/review', body)
const annotate = (body) => client.post('/copilot/annotate', body)
const replace = (body) => client.post('/copilot/replace', body)
const autoFix = (body) => client.post('/copilot/auto-fix', body)
const interpretIntent = (body) => client.post('/copilot/interpret-intent', body)

export default {
    generate,
    planEdits,
    apply,
    undo,
    classifyAndPlan,
    clarify,
    capabilities,
    getHistory,
    clearHistory,
    chat,
    autoApply,
    review,
    annotate,
    replace,
    autoFix,
    interpretIntent
}


