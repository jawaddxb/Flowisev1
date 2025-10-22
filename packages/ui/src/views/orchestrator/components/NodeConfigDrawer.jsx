import PropTypes from 'prop-types'
import { Drawer, Box, Typography, TextField, Button, Stack, Select, MenuItem, FormControl, InputLabel, IconButton } from '@mui/material'
import { IconX, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState, useEffect } from 'react'

const NodeConfigDrawer = ({ open, node, onClose, onSave }) => {
    const [config, setConfig] = useState({})

    useEffect(() => {
        if (node) {
            setConfig(node.data?.config || {})
        }
    }, [node])

    const handleSave = () => {
        onSave(node.id, config)
        onClose()
    }

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    const addHeader = () => {
        const headers = config.headers || {}
        headers[`Header-${Object.keys(headers).length + 1}`] = ''
        updateConfig('headers', headers)
    }

    const updateHeader = (oldKey, newKey, value) => {
        const headers = { ...config.headers }
        if (oldKey !== newKey) {
            delete headers[oldKey]
        }
        headers[newKey] = value
        updateConfig('headers', headers)
    }

    const deleteHeader = (key) => {
        const headers = { ...config.headers }
        delete headers[key]
        updateConfig('headers', headers)
    }

    const addMapping = () => {
        const mappings = config.mappings || []
        mappings.push({ from: '', to: '' })
        updateConfig('mappings', mappings)
    }

    const updateMapping = (index, field, value) => {
        const mappings = [...(config.mappings || [])]
        mappings[index][field] = value
        updateConfig('mappings', mappings)
    }

    const deleteMapping = (index) => {
        const mappings = [...(config.mappings || [])]
        mappings.splice(index, 1)
        updateConfig('mappings', mappings)
    }

    if (!node) return null

    const renderRemoteWebhookConfig = () => (
        <>
            <TextField
                fullWidth
                label='URL'
                value={config.url || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder='https://api.example.com/webhook'
                sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Method</InputLabel>
                <Select
                    value={config.method || 'POST'}
                    onChange={(e) => updateConfig('method', e.target.value)}
                    label='Method'
                >
                    <MenuItem value='GET'>GET</MenuItem>
                    <MenuItem value='POST'>POST</MenuItem>
                    <MenuItem value='PUT'>PUT</MenuItem>
                    <MenuItem value='DELETE'>DELETE</MenuItem>
                    <MenuItem value='PATCH'>PATCH</MenuItem>
                </Select>
            </FormControl>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Headers</Typography>
            {Object.entries(config.headers || {}).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                        size='small'
                        value={key}
                        onChange={(e) => updateHeader(key, e.target.value, value)}
                        placeholder='Header name'
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        size='small'
                        value={value}
                        onChange={(e) => updateHeader(key, key, e.target.value)}
                        placeholder='Header value'
                        sx={{ flex: 1 }}
                    />
                    <IconButton size='small' onClick={() => deleteHeader(key)}>
                        <IconTrash size={16} />
                    </IconButton>
                </Box>
            ))}
            <Button startIcon={<IconPlus />} onClick={addHeader} size='small' sx={{ mb: 2 }}>
                Add Header
            </Button>
            <TextField
                fullWidth
                multiline
                rows={4}
                label='Body Template (JSON)'
                value={config.bodyTemplate || ''}
                onChange={(e) => updateConfig('bodyTemplate', e.target.value)}
                placeholder='{"key": "{{data.value}}"}'
                sx={{ mb: 2 }}
            />
            <TextField
                fullWidth
                type='number'
                label='Timeout (ms)'
                value={config.timeout || 30000}
                onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                sx={{ mb: 2 }}
            />
        </>
    )

    const renderLocalFlowConfig = () => (
        <>
            <TextField
                fullWidth
                label='Flow ID'
                value={config.flowId || ''}
                onChange={(e) => updateConfig('flowId', e.target.value)}
                placeholder='Use "Add Workflow" to select'
                disabled
                sx={{ mb: 2 }}
            />
            <TextField
                fullWidth
                label='Base URL'
                value={config.baseURL || window.location.origin}
                onChange={(e) => updateConfig('baseURL', e.target.value)}
                placeholder='http://localhost:3000'
                sx={{ mb: 2 }}
            />
        </>
    )

    const renderDataMapperConfig = () => (
        <>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Field Mappings</Typography>
            {(config.mappings || []).map((mapping, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                        size='small'
                        value={mapping.from}
                        onChange={(e) => updateMapping(index, 'from', e.target.value)}
                        placeholder='From path (e.g., data.result)'
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        size='small'
                        value={mapping.to}
                        onChange={(e) => updateMapping(index, 'to', e.target.value)}
                        placeholder='To path (e.g., output.value)'
                        sx={{ flex: 1 }}
                    />
                    <IconButton size='small' onClick={() => deleteMapping(index)}>
                        <IconTrash size={16} />
                    </IconButton>
                </Box>
            ))}
            <Button startIcon={<IconPlus />} onClick={addMapping} size='small'>
                Add Mapping
            </Button>
        </>
    )

    const renderConfig = () => {
        switch (node.data?.nodeType) {
            case 'RemoteWebhook':
                return renderRemoteWebhookConfig()
            case 'LocalFlow':
                return renderLocalFlowConfig()
            case 'DataMapper':
                return renderDataMapperConfig()
            default:
                return (
                    <Typography variant='body2' color='text.secondary'>
                        No configuration available for this node type yet.
                    </Typography>
                )
        }
    }

    return (
        <Drawer
            anchor='right'
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: 400, p: 3 } }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h6'>{node.data?.label}</Typography>
                <IconButton onClick={onClose}>
                    <IconX />
                </IconButton>
            </Box>

            <Box sx={{ mb: 3 }}>
                <Typography variant='caption' color='text.secondary'>
                    Node Type: {node.data?.nodeType}
                </Typography>
            </Box>

            {renderConfig()}

            <Stack direction='row' spacing={2} sx={{ mt: 4 }}>
                <Button variant='contained' onClick={handleSave} fullWidth>
                    Save
                </Button>
                <Button variant='outlined' onClick={onClose} fullWidth>
                    Cancel
                </Button>
            </Stack>
        </Drawer>
    )
}

NodeConfigDrawer.propTypes = {
    open: PropTypes.bool.isRequired,
    node: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired
}

export default NodeConfigDrawer

