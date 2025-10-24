import { Box, AppBar, Toolbar, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import { IconArrowLeft, IconPlus, IconPlayerPlay, IconDeviceFloppy } from '@tabler/icons-react'
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, MiniMap, addEdge } from 'reactflow'
import 'reactflow/dist/style.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import useApi from '@/hooks/useApi'
import orchestratorApi from '@/api/orchestrator'
import AddNodePanel from '../../views/orchestrator/components/AddNodePanel'
import WorkflowBrowser from '../../views/orchestrator/WorkflowBrowser'
import NodeConfigDrawer from '../../views/orchestrator/components/NodeConfigDrawer'
import OrchestratorNode from '../../views/orchestrator/components/OrchestratorNode'

const nodeTypes = { orchestratorNode: OrchestratorNode }

const TestView = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { id } = useParams()
    
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [orchestratorName, setOrchestratorName] = useState('Untitled Orchestrator')
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [browserOpen, setBrowserOpen] = useState(false)
    const [selectedNode, setSelectedNode] = useState(null)
    const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
    
    const reactFlowWrapper = useRef(null)
    const [reactFlowInstance, setReactFlowInstance] = useState(null)
    
    const getOrchestratorApi = useApi(orchestratorApi.getOrchestrator)
    const createOrchestratorApi = useApi(orchestratorApi.createOrchestrator)
    const updateOrchestratorApi = useApi(orchestratorApi.updateOrchestrator)
    const runOrchestratorApi = useApi(orchestratorApi.runOrchestrator)
    
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))

    useEffect(() => {
        if (id) {
            getOrchestratorApi.request(id)
        }
    }, [id])

    useEffect(() => {
        if (getOrchestratorApi.data) {
            const data = getOrchestratorApi.data
            setOrchestratorName(data.name)
            const definition = typeof data.definition === 'string' ? JSON.parse(data.definition) : data.definition
            setNodes(definition.nodes || [])
            setEdges(definition.edges || [])
        }
    }, [getOrchestratorApi.data])

    const onConnect = useCallback((params) => {
        setEdges((eds) => addEdge({ ...params, type: 'default' }, eds))
    }, [setEdges])

    const onDragOver = useCallback((event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event) => {
            event.preventDefault()
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            const nodeDataString = event.dataTransfer.getData('application/reactflow')
            if (!nodeDataString) return
            const nodeData = JSON.parse(nodeDataString)
            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top
            })
            const newNode = {
                id: `${nodeData.type}_${Date.now()}`,
                type: 'orchestratorNode',
                position,
                data: { label: nodeData.label, nodeType: nodeData.type, config: nodeData.config || {} }
            }
            setNodes((nds) => nds.concat(newNode))
        },
        [reactFlowInstance, setNodes]
    )

    const handleSave = async () => {
        const definition = {
            nodes: nodes.map(n => ({ ...n, selected: false })),
            edges: edges,
            version: 1
        }
        try {
            if (id) {
                await updateOrchestratorApi.request(id, { name: orchestratorName, definition: JSON.stringify(definition) })
                enqueueSnackbar({ message: 'Orchestrator saved successfully', options: { variant: 'success' } })
            } else {
                const createResp = await createOrchestratorApi.request({ name: orchestratorName, definition: JSON.stringify(definition) })
                enqueueSnackbar({ message: 'Orchestrator created successfully', options: { variant: 'success' } })
                navigate(`/test-canvas/${createResp.data.id}`)
            }
            setSaveDialogOpen(false)
        } catch (error) {
            enqueueSnackbar({ message: `Failed to save: ${error.message}`, options: { variant: 'error' } })
        }
    }

    const handleRun = async () => {
        if (!id) {
            enqueueSnackbar({ message: 'Please save the orchestrator before running', options: { variant: 'warning' } })
            return
        }
        try {
            await runOrchestratorApi.request(id, {})
            enqueueSnackbar({ message: 'Orchestrator started', options: { variant: 'success' } })
        } catch (error) {
            enqueueSnackbar({ message: `Failed to run: ${error.message}`, options: { variant: 'error' } })
        }
    }

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node)
        setConfigDrawerOpen(true)
    }, [])

    const handleConfigSave = useCallback((nodeId, config) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, config: config } }
                }
                return node
            })
        )
    }, [setNodes])

    return (
        <>
            <Box>
                <AppBar
                    enableColorOnDark
                    position="fixed"
                    color="inherit"
                    elevation={1}
                    sx={{ bgcolor: theme.palette.background.default }}
                >
                    <Toolbar>
                        <Button startIcon={<IconArrowLeft />} onClick={() => navigate('/orchestrator')}>
                            Back
                        </Button>
                        <Box sx={{ flexGrow: 1, mx: 2 }}>
                            <TextField
                                size="small"
                                value={orchestratorName}
                                onChange={(e) => setOrchestratorName(e.target.value)}
                                variant="standard"
                                sx={{ minWidth: 300 }}
                            />
                        </Box>
                        <Button variant="outlined" startIcon={<IconPlus />} onClick={() => setBrowserOpen(true)} sx={{ mr: 1 }}>
                            Add Workflow
                        </Button>
                        <Button variant="outlined" startIcon={<IconPlayerPlay />} onClick={handleRun} sx={{ mr: 1 }}>
                            Run
                        </Button>
                        <Button variant="contained" startIcon={<IconDeviceFloppy />} onClick={() => setSaveDialogOpen(true)}>
                            Save
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%', display: 'flex' }}>
                    <AddNodePanel />
                    <Box ref={reactFlowWrapper} sx={{ flexGrow: 1 }}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onNodeClick={onNodeClick}
                            nodeTypes={nodeTypes}
                            fitView
                            minZoom={0.1}
                        >
                            <Controls />
                            <MiniMap />
                            <Background color="#aaa" gap={16} />
                        </ReactFlow>
                    </Box>
                </Box>
            </Box>
            
            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
                <DialogTitle>Save Orchestrator</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={orchestratorName}
                        onChange={(e) => setOrchestratorName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
            
            <WorkflowBrowser
                open={browserOpen}
                onClose={() => setBrowserOpen(false)}
                onAddWorkflow={(workflow) => {
                    const newNode = {
                        id: `${workflow.type}_${Date.now()}`,
                        type: 'orchestratorNode',
                        position: { x: 100, y: 100 },
                        data: { label: workflow.name, nodeType: workflow.type, config: workflow.config || {} }
                    }
                    setNodes((nds) => nds.concat(newNode))
                    setBrowserOpen(false)
                }}
            />

            <NodeConfigDrawer
                open={configDrawerOpen}
                node={selectedNode}
                onClose={() => {
                    setConfigDrawerOpen(false)
                    setSelectedNode(null)
                }}
                onSave={handleConfigSave}
            />
        </>
    )
}

export default TestView
