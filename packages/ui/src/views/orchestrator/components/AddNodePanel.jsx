import { Box, Typography, Paper, Stack } from '@mui/material'
import { IconWebhook, IconGitBranch, IconTransform, IconClock, IconAlertTriangle, IconBoxMultiple } from '@tabler/icons-react'

const nodeTypes = [
    { type: 'RemoteWebhook', label: 'Remote Webhook', icon: IconWebhook, description: 'Call external webhook' },
    { type: 'LocalFlow', label: 'Local Flow', icon: IconGitBranch, description: 'Execute Flowise flow' },
    { type: 'DataMapper', label: 'Data Mapper', icon: IconTransform, description: 'Transform data' },
    { type: 'WaitForCallback', label: 'Wait for Callback', icon: IconClock, description: 'Pause for webhook' },
    { type: 'Condition', label: 'Condition', icon: IconGitBranch, description: 'Conditional branch' },
    { type: 'ErrorBoundary', label: 'Error Handler', icon: IconAlertTriangle, description: 'Handle errors' },
    { type: 'Parallel', label: 'Parallel', icon: IconBoxMultiple, description: 'Run in parallel' }
]

const AddNodePanel = () => {
    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType))
        event.dataTransfer.effectAllowed = 'move'
    }

    return (
        <Box
            sx={{
                width: 250,
                borderRight: '1px solid',
                borderColor: 'divider',
                p: 2,
                overflowY: 'auto'
            }}
        >
            <Typography variant='h6' sx={{ mb: 2 }}>
                Node Palette
            </Typography>
            
            <Stack spacing={1}>
                {nodeTypes.map((node) => {
                    const Icon = node.icon
                    return (
                        <Paper
                            key={node.type}
                            draggable
                            onDragStart={(e) => onDragStart(e, node)}
                            sx={{
                                p: 1.5,
                                cursor: 'grab',
                                '&:hover': {
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Icon size={18} />
                                <Typography variant='subtitle2'>{node.label}</Typography>
                            </Box>
                            <Typography variant='caption' color='text.secondary'>
                                {node.description}
                            </Typography>
                        </Paper>
                    )
                })}
            </Stack>
        </Box>
    )
}

export default AddNodePanel

