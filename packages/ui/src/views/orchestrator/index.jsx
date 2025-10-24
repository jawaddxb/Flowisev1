import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton } from '@mui/material'
import { IconPlus, IconEdit, IconTrash, IconPlayerPlay, IconCopy } from '@tabler/icons-react'
import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import useApi from '@/hooks/useApi'
import orchestratorApi from '@/api/orchestrator'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import useConfirm from '@/hooks/useConfirm'

const OrchestratorList = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { confirm } = useConfirm()
    const [searchTerm, setSearchTerm] = useState('')
    
    const getAllOrchestratorsApi = useApi(orchestratorApi.getAllOrchestrators)
    const deleteOrchestratorApi = useApi(orchestratorApi.deleteOrchestrator)
    const runOrchestratorApi = useApi(orchestratorApi.runOrchestrator)

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))

    useEffect(() => {
        getAllOrchestratorsApi.request()
        // eslint-disable-next-line
    }, [])

    const handleCreate = () => {
        navigate('/test-canvas')
    }

    const handleEdit = (id) => {
        navigate(`/test-canvas/${id}`)
    }

    const handleDuplicate = async (orchestrator) => {
        try {
            const duplicate = {
                name: `${orchestrator.name} (Copy)`,
                definition: orchestrator.definition
            }
            await orchestratorApi.createOrchestrator(duplicate)
            enqueueSnackbar({
                message: 'Orchestrator duplicated successfully',
                options: { variant: 'success' }
            })
            getAllOrchestratorsApi.request()
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to duplicate: ${error.message}`,
                options: { variant: 'error' }
            })
        }
    }

    const handleDelete = async (id, name) => {
        const confirmPayload = {
            title: `Delete Orchestrator`,
            description: `Are you sure you want to delete "${name}"?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)
        
        if (isConfirmed) {
            try {
                await deleteOrchestratorApi.request(id)
                enqueueSnackbar({
                    message: 'Orchestrator deleted successfully',
                    options: { variant: 'success' }
                })
                getAllOrchestratorsApi.request()
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete: ${error.message}`,
                    options: { variant: 'error' }
                })
            }
        }
    }

    const handleRun = async (id, name) => {
        try {
            await runOrchestratorApi.request(id, {})
            enqueueSnackbar({
                message: `Orchestrator "${name}" started`,
                options: { variant: 'success' }
            })
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to run: ${error.message}`,
                options: { variant: 'error' }
            })
        }
    }

    // Normalize data - handle both array and object responses
    const orchestratorData = getAllOrchestratorsApi.data
    const dataArray = Array.isArray(orchestratorData) 
        ? orchestratorData 
        : (orchestratorData?.data || orchestratorData?.orchestrators || [])

    const filteredData = dataArray.filter((item) =>
        item?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader
                        title='Orchestrator'
                        onBack={() => {}}
                        search={true}
                        searchPlaceholder='Search orchestrators...'
                        onSearchChange={(event) => setSearchTerm(event.target.value)}
                    >
                        <Button variant='contained' startIcon={<IconPlus />} onClick={handleCreate}>
                            New Orchestrator
                        </Button>
                    </ViewHeader>
                    
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Nodes</TableCell>
                                    <TableCell>Last Updated</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align='right'>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align='center'>
                                            No orchestrators found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((row) => {
                                        const definition = typeof row.definition === 'string' ? JSON.parse(row.definition) : row.definition
                                        const nodeCount = definition?.nodes?.length || 0
                                        
                                        return (
                                            <TableRow key={row.id} hover>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{nodeCount} nodes</TableCell>
                                                <TableCell>{new Date(row.updatedDate).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Chip label='Ready' size='small' color='success' />
                                                </TableCell>
                                                <TableCell align='right'>
                                                    <IconButton size='small' onClick={() => handleRun(row.id, row.name)} title='Run'>
                                                        <IconPlayerPlay />
                                                    </IconButton>
                                                    <IconButton size='small' onClick={() => handleEdit(row.id)} title='Edit'>
                                                        <IconEdit />
                                                    </IconButton>
                                                    <IconButton size='small' onClick={() => handleDuplicate(row)} title='Duplicate'>
                                                        <IconCopy />
                                                    </IconButton>
                                                    <IconButton size='small' onClick={() => handleDelete(row.id, row.name)} title='Delete'>
                                                        <IconTrash />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            </MainCard>
            <ConfirmDialog />
        </>
    )
}

export default OrchestratorList

