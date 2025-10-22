import React from 'react'
import { Box, Alert } from '@mui/material'

const OrchestratorDebug = () => {
    return (
        <Box sx={{ p: 4, m: 4, border: '4px solid blue' }}>
            <Alert severity='warning'>
                This is the Orchestrator Debug View. If you can see this, the routing works.
            </Alert>
        </Box>
    )
}

export default OrchestratorDebug
