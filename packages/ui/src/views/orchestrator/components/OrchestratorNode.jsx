import PropTypes from 'prop-types'
import { Handle, Position } from 'reactflow'
import { Box, Typography, Chip } from '@mui/material'
import { IconWebhook, IconGitBranch, IconTransform, IconClock, IconAlertTriangle, IconBoxMultiple } from '@tabler/icons-react'

const nodeIcons = {
    RemoteWebhook: IconWebhook,
    LocalFlow: IconGitBranch,
    DataMapper: IconTransform,
    WaitForCallback: IconClock,
    ErrorBoundary: IconAlertTriangle,
    Condition: IconGitBranch,
    Parallel: IconBoxMultiple
}

const OrchestratorNode = ({ data }) => {
    const Icon = nodeIcons[data.nodeType] || IconWebhook
    
    return (
        <Box
            sx={{
                padding: 2,
                borderRadius: 1,
                border: '2px solid',
                borderColor: 'primary.main',
                backgroundColor: 'background.paper',
                minWidth: 200,
                boxShadow: 2
            }}
        >
            <Handle type='target' position={Position.Top} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Icon size={20} />
                <Typography variant='subtitle2'>{data.label}</Typography>
            </Box>
            
            <Chip label={data.nodeType} size='small' variant='outlined' />
            
            {data.config?.url && (
                <Typography variant='caption' sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                    {data.config.url}
                </Typography>
            )}
            
            <Handle type='source' position={Position.Bottom} />
        </Box>
    )
}

OrchestratorNode.propTypes = {
    data: PropTypes.object.isRequired
}

export default OrchestratorNode

