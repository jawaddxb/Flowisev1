import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Typography, Box, Divider } from '@mui/material'
import useApi from '@/hooks/useApi'
import copilotApi from '@/api/copilot'

const WorkflowCopilotDialog = ({ show, onCancel, chatflow, isAgentCanvas, onPreview, onApply }) => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [preview, setPreview] = useState(null)
    const [ops, setOps] = useState([])

    const generateApi = useApi(copilotApi.generate)
    const planApi = useApi(copilotApi.planEdits)
    const applyApi = useApi(copilotApi.apply)

    const canGenerate = useMemo(() => !chatflow?.id, [chatflow])

    const send = async () => {
        if (!input.trim()) return
        const userMsg = { role: 'user', content: input }
        setMessages((m) => [...m, userMsg])

        if (canGenerate) {
            generateApi.request({ prompt: input, type: isAgentCanvas ? 'MULTIAGENT' : 'CHATFLOW' })
        } else {
            const flowData = chatflow?.flowData ? JSON.parse(chatflow.flowData) : { nodes: [], edges: [] }
            planApi.request({ chatflowId: chatflow.id, flowData, instruction: input })
        }
        setInput('')
    }

    useEffect(() => {
        if (generateApi.data) {
            setPreview(generateApi.data.flowData)
            onPreview && onPreview(generateApi.data.flowData)
            setMessages((m) => [...m, { role: 'assistant', content: 'Generated a draft flow.' }])
        }
    }, [generateApi.data])

    useEffect(() => {
        if (planApi.data) {
            setPreview(planApi.data.previewFlowData)
            setOps(planApi.data.operations || [])
            onPreview && onPreview(planApi.data.previewFlowData)
            setMessages((m) => [...m, { role: 'assistant', content: 'Planned edits ready. Review and Apply.' }])
        }
    }, [planApi.data])

    const apply = async () => {
        if (canGenerate) {
            onApply && onApply(preview)
            onCancel()
            return
        }
        if (!chatflow?.id) return
        await applyApi.request({ chatflowId: chatflow.id, operations: ops })
        if (applyApi.data) {
            onApply && onApply(applyApi.data.flowData)
            onCancel()
        }
    }

    return (
        <Dialog fullWidth maxWidth='md' open={show} onClose={onCancel}>
            <DialogTitle>Workflow Copilot</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <Box sx={{ maxHeight: 280, overflow: 'auto', border: '1px solid #eee', p: 1, borderRadius: 1 }}>
                        {messages.map((m, idx) => (
                            <Typography key={idx} variant='body2' sx={{ color: m.role === 'user' ? 'text.primary' : 'text.secondary' }}>
                                <strong>{m.role === 'user' ? 'You' : 'Copilot'}:</strong> {m.content}
                            </Typography>
                        ))}
                        {!messages.length && (
                            <Typography variant='body2' color='text.secondary'>
                                {canGenerate
                                    ? 'Describe the workflow you want. Example: "Build a web research agent that uses Brave and writes a summary".'
                                    : 'Tell me how to change this flow. Example: "Swap model to gpt-4o-mini and add a report step".'}
                            </Typography>
                        )}
                    </Box>
                    <Stack direction='row' spacing={1}>
                        <TextField fullWidth size='small' value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={canGenerate ? 'What do you want to build?' : 'What should I change?'} />
                        <Button variant='contained' onClick={send} disabled={generateApi.loading || planApi.loading}>Send</Button>
                    </Stack>
                    <Divider />
                    <Typography variant='subtitle2'>Preview</Typography>
                    <Box sx={{ maxHeight: 260, overflow: 'auto', border: '1px dashed #ccc', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: 12 }}>
                        {preview ? <pre style={{ margin: 0 }}>{JSON.stringify(preview, null, 2)}</pre> : <Typography variant='body2' color='text.secondary'>No preview yet.</Typography>}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Close</Button>
                <Button variant='contained' onClick={apply} disabled={!preview && !ops.length}>Apply</Button>
            </DialogActions>
        </Dialog>
    )
}

WorkflowCopilotDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    chatflow: PropTypes.object,
    isAgentCanvas: PropTypes.bool,
    onPreview: PropTypes.func,
    onApply: PropTypes.func
}

export default WorkflowCopilotDialog







