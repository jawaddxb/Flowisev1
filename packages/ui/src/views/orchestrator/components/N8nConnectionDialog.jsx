import PropTypes from 'prop-types'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Alert, CircularProgress } from '@mui/material'
import { useState } from 'react'
import useApi from '@/hooks/useApi'
import orchestratorProvidersApi from '@/api/orchestrator-providers'

const N8nConnectionDialog = ({ open, onClose, onSuccess }) => {
    const [baseUrl, setBaseUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [error, setError] = useState('')
    const [testing, setTesting] = useState(false)
    
    const testConnectionApi = useApi(orchestratorProvidersApi.testConnection)
    const connectProviderApi = useApi(orchestratorProvidersApi.connectProvider)

    const handleTest = async () => {
        setError('')
        setTesting(true)
        
        try {
            const result = await testConnectionApi.request('n8n', {
                baseUrl,
                apiKey
            })
            
            if (result.valid) {
                setError('')
            } else {
                setError('Invalid credentials. Please check your n8n URL and API key.')
            }
        } catch (err) {
            setError(`Connection failed: ${err.message}`)
        } finally {
            setTesting(false)
        }
    }

    const handleConnect = async () => {
        setError('')
        
        try {
            await connectProviderApi.request('n8n', {
                credentials: {
                    baseUrl,
                    apiKey
                }
            })
            
            onSuccess()
            handleClose()
        } catch (err) {
            setError(`Failed to save connection: ${err.message}`)
        }
    }

    const handleClose = () => {
        setBaseUrl('')
        setApiKey('')
        setError('')
        onClose()
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle>Connect to n8n</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity='error'>{error}</Alert>}
                    
                    <TextField
                        label='n8n Base URL'
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder='https://your-n8n-instance.com'
                        fullWidth
                        helperText='The URL of your n8n instance'
                    />
                    
                    <TextField
                        label='API Key'
                        type='password'
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder='n8n_api_key_...'
                        fullWidth
                        helperText='Your n8n API key (Settings → API)'
                    />
                    
                    <Button 
                        variant='outlined' 
                        onClick={handleTest}
                        disabled={!baseUrl || !apiKey || testing}
                        startIcon={testing && <CircularProgress size={16} />}
                    >
                        {testing ? 'Testing...' : 'Test Connection'}
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button 
                    onClick={handleConnect} 
                    variant='contained'
                    disabled={!baseUrl || !apiKey || connectProviderApi.loading}
                >
                    Connect
                </Button>
            </DialogActions>
        </Dialog>
    )
}

N8nConnectionDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired
}

export default N8nConnectionDialog

