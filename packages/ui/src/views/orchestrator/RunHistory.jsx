import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material'
import { IconRefresh, IconEye, IconChevronDown } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'
import orchestratorApi from '@/api/orchestrator'
import useApi from '@/hooks/useApi'

const RunHistory = () => {
    const theme = useTheme()
    const { id } = useParams()
    const [runs, setRuns] = useState([])
    const [selectedRun, setSelectedRun] = useState(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    
    const getRunsApi = useApi(orchestratorApi.getRuns)
    
    useEffect(() => {
        loadRuns()
    }, [id])
    
    useEffect(() => {
        if (getRunsApi.data) {
            const runsData = getRunsApi.data?.data || getRunsApi.data?.runs || getRunsApi.data || []
            setRuns(Array.isArray(runsData) ? runsData : [])
        }
    }, [getRunsApi.data])
    
    const loadRuns = () => {
        if (id) {
            getRunsApi.request(id)
        }
    }
    
    const handleViewDetails = (run) => {
        setSelectedRun(run)
        setDetailsOpen(true)
    }
    
    const handleCloseDetails = () => {
        setDetailsOpen(false)
        setSelectedRun(null)
    }
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED':
                return 'success'
            case 'RUNNING':
                return 'info'
            case 'FAILED':
                return 'error'
            case 'PENDING':
                return 'default'
            default:
                return 'default'
        }
    }
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleString()
    }
    
    const formatDuration = (startedAt, finishedAt) => {
        if (!startedAt) return 'N/A'
        const start = new Date(startedAt)
        const end = finishedAt ? new Date(finishedAt) : new Date()
        const duration = Math.floor((end - start) / 1000)
        
        if (duration < 60) return `${duration}s`
        if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
        return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
    }
    
    const parseLogs = (logsString) => {
        try {
            return JSON.parse(logsString || '[]')
        } catch {
            return []
        }
    }
    
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h4'>Run History</Typography>
                <IconButton onClick={loadRuns} color='primary'>
                    <IconRefresh />
                </IconButton>
            </Box>
            
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Run ID</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Started</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {runs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align='center'>
                                    <Typography variant='body2' color='text.secondary'>
                                        No runs yet. Execute this orchestrator to see run history.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            runs.map((run) => (
                                <TableRow key={run.id} hover>
                                    <TableCell>
                                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                            {run.id.substring(0, 8)}...
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={run.status} 
                                            color={getStatusColor(run.status)} 
                                            size='small' 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant='body2'>
                                            {formatDate(run.startedAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant='body2'>
                                            {formatDuration(run.startedAt, run.finishedAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton 
                                            size='small' 
                                            onClick={() => handleViewDetails(run)}
                                            color='primary'
                                        >
                                            <IconEye />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            
            {/* Run Details Dialog */}
            <Dialog 
                open={detailsOpen} 
                onClose={handleCloseDetails}
                maxWidth='md'
                fullWidth
            >
                <DialogTitle>
                    Run Details
                    {selectedRun && (
                        <Chip 
                            label={selectedRun.status} 
                            color={getStatusColor(selectedRun.status)} 
                            size='small' 
                            sx={{ ml: 2 }}
                        />
                    )}
                </DialogTitle>
                <DialogContent dividers>
                    {selectedRun && (
                        <Box>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant='subtitle2' color='text.secondary'>Run ID</Typography>
                                <Typography variant='body1' sx={{ fontFamily: 'monospace' }}>
                                    {selectedRun.id}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant='subtitle2' color='text.secondary'>Timeline</Typography>
                                <Typography variant='body2'>
                                    Started: {formatDate(selectedRun.startedAt)}
                                </Typography>
                                {selectedRun.finishedAt && (
                                    <Typography variant='body2'>
                                        Finished: {formatDate(selectedRun.finishedAt)}
                                    </Typography>
                                )}
                                <Typography variant='body2'>
                                    Duration: {formatDuration(selectedRun.startedAt, selectedRun.finishedAt)}
                                </Typography>
                            </Box>
                            
                            {selectedRun.inputs && (
                                <Accordion sx={{ mb: 2 }}>
                                    <AccordionSummary expandIcon={<IconChevronDown />}>
                                        <Typography variant='subtitle2'>Inputs</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box 
                                            component='pre' 
                                            sx={{ 
                                                p: 2, 
                                                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                                                borderRadius: 1,
                                                overflow: 'auto',
                                                fontSize: '0.875rem',
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {JSON.stringify(
                                                typeof selectedRun.inputs === 'string' 
                                                    ? JSON.parse(selectedRun.inputs) 
                                                    : selectedRun.inputs, 
                                                null, 
                                                2
                                            )}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            )}
                            
                            <Accordion sx={{ mb: 2 }}>
                                <AccordionSummary expandIcon={<IconChevronDown />}>
                                    <Typography variant='subtitle2'>Execution Logs</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                                            borderRadius: 1,
                                            maxHeight: 400,
                                            overflow: 'auto'
                                        }}
                                    >
                                        {parseLogs(selectedRun.logs).map((log, index) => (
                                            <Box 
                                                key={index} 
                                                sx={{ 
                                                    mb: 1, 
                                                    pb: 1, 
                                                    borderBottom: index < parseLogs(selectedRun.logs).length - 1 
                                                        ? `1px solid ${theme.palette.divider}` 
                                                        : 'none'
                                                }}
                                            >
                                                <Typography 
                                                    variant='caption' 
                                                    color='text.secondary'
                                                    sx={{ fontFamily: 'monospace' }}
                                                >
                                                    {formatDate(log.timestamp)}
                                                </Typography>
                                                <Typography 
                                                    variant='body2' 
                                                    sx={{ 
                                                        fontFamily: 'monospace',
                                                        color: log.level === 'error' ? 'error.main' : 'text.primary'
                                                    }}
                                                >
                                                    {log.message}
                                                </Typography>
                                                {log.data && (
                                                    <Box 
                                                        component='pre' 
                                                        sx={{ 
                                                            mt: 0.5, 
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'monospace',
                                                            color: 'text.secondary'
                                                        }}
                                                    >
                                                        {JSON.stringify(log.data, null, 2)}
                                                    </Box>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetails}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default RunHistory

