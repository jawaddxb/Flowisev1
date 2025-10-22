import PropTypes from 'prop-types'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { IconPlayerPlay } from '@tabler/icons-react'

const CopilotRunPanel = ({ onRun, logs = [], sources = [] }) => {
    return (
        <Stack sx={{ height: '100%' }}>
            <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between' sx={{ py: 1 }}>
                <Typography variant='subtitle2'>Run</Typography>
                <Button variant='contained' size='small' startIcon={<IconPlayerPlay size={14} />} onClick={onRun}>
                    Run
                </Button>
            </Stack>
            <Divider />
            <Box sx={{ flex: 1, overflow: 'auto', py: 1, fontFamily: 'monospace', fontSize: 12 }}>
                {logs.length ? logs.map((l, i) => <div key={i}>{l}</div>) : <Typography variant='body2'>No output yet.</Typography>}
                {sources.length > 0 && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant='caption'>Sources</Typography>
                        {sources.map((s, i) => (
                            <div key={i}>{s.title || s.url || 'source'}</div>
                        ))}
                    </>
                )}
            </Box>
        </Stack>
    )
}

CopilotRunPanel.propTypes = {
    onRun: PropTypes.func,
    logs: PropTypes.array,
    sources: PropTypes.array
}

export default CopilotRunPanel



