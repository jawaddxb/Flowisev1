import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    Chip,
    Typography
} from '@mui/material'
import { IconSearch, IconPlus } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import providersApi from '@/api/orchestrator-providers'
import chatflowsApi from '@/api/chatflows'
import N8nConnectionDialog from './components/N8nConnectionDialog'

const WorkflowBrowser = ({ open, onClose, onAddWorkflow }) => {
    const [tab, setTab] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const [localFlows, setLocalFlows] = useState([])
    const [providers, setProviders] = useState([])
    const [n8nDialogOpen, setN8nDialogOpen] = useState(false)
    const [n8nWorkflows, setN8nWorkflows] = useState([])
    
    const getProvidersApi = useApi(providersApi.getProviders)
    const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const getN8nWorkflowsApi = useApi(providersApi.getProviderWorkflows)
    const getWorkflowPreviewApi = useApi(providersApi.getWorkflowPreview)

    useEffect(() => {
        if (open) {
            getProvidersApi.request()
            getAllChatflowsApi.request()
        }
        // eslint-disable-next-line
    }, [open])

    useEffect(() => {
        if (getProvidersApi.data) {
            const providersData = Array.isArray(getProvidersApi.data) 
                ? getProvidersApi.data 
                : (getProvidersApi.data?.data || getProvidersApi.data?.providers || [])
            setProviders(providersData)
        }
    }, [getProvidersApi.data])

    // Auto-load n8n workflows when n8n is connected
    useEffect(() => {
        const n8nProvider = providers.find(p => p.id === 'n8n')
        if (n8nProvider?.status === 'connected') {
            getN8nWorkflowsApi.request('n8n').then((data) => {
                const workflows = Array.isArray(data) ? data : (data?.data || data?.workflows || [])
                setN8nWorkflows(workflows)
            }).catch(err => {
                console.error('Failed to load n8n workflows:', err)
            })
        }
        // eslint-disable-next-line
    }, [providers])

    useEffect(() => {
        if (getAllChatflowsApi.data) {
            // Normalize data - handle both array and object responses
            const flowsData = getAllChatflowsApi.data
            const flows = Array.isArray(flowsData) 
                ? flowsData 
                : (flowsData?.data || flowsData?.chatflows || [])
            setLocalFlows(flows)
        }
    }, [getAllChatflowsApi.data])

    const handleAddLocalFlow = (flow) => {
        onAddWorkflow({
            type: 'LocalFlow',
            name: flow.name,
            config: {
                flowId: flow.id,
                baseURL: window.location.origin
            }
        })
    }

    const filteredFlows = localFlows.filter((flow) =>
        flow.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredN8nWorkflows = n8nWorkflows.filter((flow) =>
        flow.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleN8nConnect = () => {
        setN8nDialogOpen(true)
    }

    const handleN8nConnected = () => {
        // Refresh providers (which will trigger auto-load of workflows via useEffect)
        getProvidersApi.request()
    }

    const handleAddN8nWorkflow = async (workflow) => {
        try {
            // Fetch preview to get webhook URL
            const previewResp = await getWorkflowPreviewApi.request('n8n', workflow.id)
            const preview = previewResp?.data || previewResp
            const webhookUrl = preview?.webhookUrl || ''
            
            if (!webhookUrl) {
                console.warn('No webhook URL found for workflow:', workflow.name)
            }
            
            onAddWorkflow({
                type: 'RemoteWebhook',
                name: workflow.name,
                config: {
                    provider: 'n8n',
                    workflowId: workflow.id,
                    url: webhookUrl,
                    method: 'POST',
                    headers: {},
                    timeout: 60000
                }
            })
        } catch (error) {
            console.error('Failed to fetch workflow preview:', error)
            // Fallback: add without webhook URL (user can configure manually)
            onAddWorkflow({
                type: 'RemoteWebhook',
                name: workflow.name,
                config: {
                    provider: 'n8n',
                    workflowId: workflow.id,
                    url: '',
                    method: 'POST',
                    headers: {},
                    timeout: 60000
                }
            })
        }
    }

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
                <DialogTitle>Browse Workflows</DialogTitle>
                <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
                        {providers.length > 0 ? (
                            providers.map((provider, index) => (
                                <Tab 
                                    key={provider.id} 
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {provider.name}
                                            <Chip 
                                                label={provider.status} 
                                                size='small' 
                                                color={provider.status === 'connected' ? 'success' : 'default'}
                                                sx={{ height: 16, fontSize: '0.65rem' }}
                                            />
                                        </Box>
                                    }
                                    disabled={provider.status !== 'connected'}
                                />
                            ))
                        ) : (
                            <>
                                <Tab label='Local Flows' />
                                <Tab label='n8n' disabled />
                                <Tab label='Make' disabled />
                                <Tab label='Zapier' disabled />
                            </>
                        )}
                    </Tabs>
                </Box>

                <TextField
                    fullWidth
                    size='small'
                    placeholder='Search workflows...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <IconSearch size={20} style={{ marginRight: 8 }} />
                    }}
                    sx={{ mb: 2 }}
                />

                {tab === 0 && (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Updated</TableCell>
                                    <TableCell align='right'>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredFlows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align='center'>
                                            <Typography variant='body2' color='text.secondary'>
                                                No local flows found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredFlows.map((flow) => (
                                        <TableRow key={flow.id} hover>
                                            <TableCell>{flow.name}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={flow.type || 'CHATFLOW'} 
                                                    size='small' 
                                                    variant='outlined' 
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(flow.updatedDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell align='right'>
                                                <Button
                                                    size='small'
                                                    variant='contained'
                                                    onClick={() => handleAddLocalFlow(flow)}
                                                >
                                                    Add to Canvas
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {tab === 1 && (
                    <>
                        {providers.find(p => p.id === 'n8n')?.status === 'connected' ? (
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Updated</TableCell>
                                            <TableCell align='right'>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredN8nWorkflows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} align='center'>
                                                    <Typography variant='body2' color='text.secondary'>
                                                        No n8n workflows found
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredN8nWorkflows.map((workflow) => (
                                                <TableRow key={workflow.id} hover>
                                                    <TableCell>{workflow.name}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={workflow.status} 
                                                            size='small' 
                                                            variant='outlined'
                                                            color={workflow.status === 'active' ? 'success' : 'default'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(workflow.lastUpdated).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell align='right'>
                                                        <Button
                                                            size='small'
                                                            variant='contained'
                                                            onClick={() => handleAddN8nWorkflow(workflow)}
                                                            disabled={getWorkflowPreviewApi.loading}
                                                        >
                                                            {getWorkflowPreviewApi.loading ? 'Loading...' : 'Add to Canvas'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                                    Connect to n8n to browse workflows
                                </Typography>
                                <Button 
                                    variant='contained' 
                                    startIcon={<IconPlus />}
                                    onClick={handleN8nConnect}
                                >
                                    Connect n8n
                                </Button>
                            </Box>
                        )}
                    </>
                )}

                {tab > 1 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant='body2' color='text.secondary'>
                            Provider integration coming soon
                        </Typography>
                    </Box>
                )}
                </DialogContent>
            </Dialog>
            
            <N8nConnectionDialog
                open={n8nDialogOpen}
                onClose={() => setN8nDialogOpen(false)}
                onSuccess={handleN8nConnected}
            />
        </>
    )
}

WorkflowBrowser.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAddWorkflow: PropTypes.func.isRequired
}

export default WorkflowBrowser

