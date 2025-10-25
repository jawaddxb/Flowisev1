import PropTypes from 'prop-types'
import { useState } from 'react'
import { Box, TextField, Button, Typography, IconButton, InputAdornment, Alert } from '@mui/material'
import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react'
import { LoadingButton } from '@mui/lab'

/**
 * InlineCredentialInput - Allow users to add credentials without leaving copilot
 */
const InlineCredentialInput = ({ credentialName, credentialLabel, onSave, onCancel }) => {
    const [apiKey, setApiKey] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setError('Please enter an API key')
            return
        }

        setSaving(true)
        setError('')

        try {
            // Call the save handler (will save to credentials)
            await onSave({ credentialName, apiKey })
            setApiKey('')
        } catch (err) {
            setError(err.message || 'Failed to save credential')
        } finally {
            setSaving(false)
        }
    }

    const getPlaceholder = () => {
        if (credentialName.toLowerCase().includes('openai')) {
            return 'sk-...'
        } else if (credentialName.toLowerCase().includes('anthropic')) {
            return 'sk-ant-...'
        } else if (credentialName.toLowerCase().includes('google')) {
            return 'AIza...'
        }
        return 'Enter your API key'
    }

    const getHelpLink = () => {
        if (credentialName.toLowerCase().includes('openai')) {
            return 'https://platform.openai.com/api-keys'
        } else if (credentialName.toLowerCase().includes('anthropic')) {
            return 'https://console.anthropic.com/settings/keys'
        } else if (credentialName.toLowerCase().includes('google')) {
            return 'https://aistudio.google.com/app/apikey'
        }
        return '#'
    }

    return (
        <Box
            sx={{
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: 2,
                p: 2,
                my: 2,
                backgroundColor: 'rgba(33, 150, 243, 0.05)'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <IconLock size={18} color="#2196F3" />
                <Typography variant="subtitle2" color="primary">
                    Add {credentialLabel} API Key
                </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                To use {credentialLabel}, I need your API key. It will be stored securely and never shared.
            </Typography>

            <TextField
                fullWidth
                size="small"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={getPlaceholder()}
                error={!!error}
                helperText={error}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                }}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowKey(!showKey)} edge="end">
                                {showKey ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                            </IconButton>
                        </InputAdornment>
                    )
                }}
                sx={{ mb: 1.5 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    size="small"
                    href={getHelpLink()}
                    target="_blank"
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                    Get API key →
                </Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                    <LoadingButton size="small" variant="contained" onClick={handleSave} loading={saving}>
                        Save
                    </LoadingButton>
                </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.75rem' }}>
                <Typography variant="caption">
                    🔒 Your API key is encrypted before storage on the server and never shown in plain text.
                </Typography>
            </Alert>
        </Box>
    )
}

InlineCredentialInput.propTypes = {
    credentialName: PropTypes.string.isRequired,
    credentialLabel: PropTypes.string.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
}

export default InlineCredentialInput

