import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material'
import { IconChevronDown, IconPlayerPlay, IconX } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import copilotApi from '@/api/copilot'
import WorkflowCopilotDialog from './WorkflowCopilotDialog'
import CopilotPillBar from './CopilotPillBar'
import CopilotRunPanel from './CopilotRunPanel'

const Pane = ({ children, width }) => (
    <Box sx={{ width, minWidth: width, maxWidth: width, height: '100%', overflow: 'hidden' }}>{children}</Box>
)

const Section = ({ title, children, actions }) => (
    <Stack sx={{ height: '100%' }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ py: 1 }}>
            <Typography variant='subtitle2'>{title}</Typography>
            <Stack direction='row' spacing={1}>{actions}</Stack>
        </Stack>
        <Divider />
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>{children}</Box>
    </Stack>
)

const WorkflowCopilotOverlay = ({ open, onClose, chatflow, isAgentCanvas, onApplyPreview, onRun }) => {
    const [minimized, setMinimized] = useState(false)
    const [pills, setPills] = useState(['Add Web Search', 'Change Model', 'Add Memory'])
    const [preview, setPreview] = useState(null)
    const [logs, setLogs] = useState([])

    const capabilitiesApi = useApi(copilotApi.capabilities)
    useEffect(() => {
        if (open) capabilitiesApi.request()
        // eslint-disable-next-line
    }, [open])

    const startRun = () => {
        onRun && onRun()
    }

    if (!open) return null

    return (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 1400, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.25)' }}>
            <Box
                sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    left: 16,
                    bottom: 16,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    boxShadow: 8,
                    display: 'flex',
                    flexDirection: 'row',
                    p: 2
                }}
            >
                <Pane width='36%'>
                    <Section
                        title='Conversation'
                        actions={
                            <IconButton size='small' onClick={() => setMinimized(!minimized)}>
                                <IconChevronDown size={16} />
                            </IconButton>
                        }
                    >
                        <WorkflowCopilotDialog
                            show={!minimized}
                            onCancel={() => setMinimized(true)}
                            chatflow={chatflow}
                            isAgentCanvas={isAgentCanvas}
                            onPreview={(f) => setPreview(f)}
                            onApply={(f) => onApplyPreview && onApplyPreview(f)}
                        />
                    </Section>
                </Pane>
                <Divider orientation='vertical' flexItem />
                <Pane width='34%'>
                    <Section title='Preview & Diff' actions={<></>}>
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                            Review changes before applying.
                        </Typography>
                        <Box sx={{ border: '1px dashed #ccc', borderRadius: 1, p: 1, fontFamily: 'monospace', fontSize: 12 }}>
                            {preview ? <pre style={{ margin: 0 }}>{JSON.stringify(preview, null, 2)}</pre> : 'No preview yet.'}
                        </Box>
                        <CopilotPillBar pills={pills} onPick={() => {}} />
                    </Section>
                </Pane>
                <Divider orientation='vertical' flexItem />
                <Pane width='30%'>
                    <Section
                        title='Run & Feedback'
                        actions={
                            <IconButton size='small' onClick={onClose}>
                                <IconX size={16} />
                            </IconButton>
                        }
                    >
                        <CopilotRunPanel onRun={startRun} logs={logs} sources={[]} />
                    </Section>
                </Pane>
            </Box>
        </Box>
    )
}

WorkflowCopilotOverlay.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    chatflow: PropTypes.object,
    isAgentCanvas: PropTypes.bool,
    onApplyPreview: PropTypes.func,
    onRun: PropTypes.func
}

export default WorkflowCopilotOverlay


