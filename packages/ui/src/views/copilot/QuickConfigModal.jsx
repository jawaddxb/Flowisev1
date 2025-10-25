import PropTypes from 'prop-types'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography, Chip, Alert, Box } from '@mui/material'
import { useState, useEffect } from 'react'
import { IconAlertCircle, IconCheck } from '@tabler/icons-react'

const QuickConfigModal = ({ open, gaps, onClose, onSubmit }) => {
    const [values, setValues] = useState({})

    // Filter out managed (non-personal) credential gaps - they should be auto-resolved
    const personalGaps = gaps.filter(gap => !(gap.type === 'credential' && gap.isPersonal === false))
    const managedCredGaps = gaps.filter(gap => gap.type === 'credential' && gap.isPersonal === false)

    useEffect(() => {
        // If only managed credential gaps remain, auto-close and let the system resolve them
        if (open && gaps.length > 0 && personalGaps.length === 0 && managedCredGaps.length > 0) {
            // All gaps are managed credentials - these should be auto-resolved
            setTimeout(() => {
                onClose()
            }, 100)
        }
    }, [open, gaps, personalGaps.length, managedCredGaps.length, onClose])

    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = () => {
        onSubmit(values)
        setValues({})
    }

    const handleClose = () => {
        setValues({})
        onClose()
    }

    // Don't show modal if only managed creds are missing
    if (personalGaps.length === 0 && managedCredGaps.length > 0) {
        return null
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle>
                <Stack direction='row' alignItems='center' spacing={1}>
                    <IconAlertCircle size={20} color='#f59e0b' />
                    <Typography variant='h6'>Quick Configuration</Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                {managedCredGaps.length > 0 && (
                    <Alert severity='success' sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconCheck size={16} />
                            <Typography variant='caption'>
                                Using workspace credentials for: {managedCredGaps.map(g => g.label).join(', ')}
                            </Typography>
                        </Box>
                    </Alert>
                )}
                
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    {personalGaps.length > 0 
                        ? 'Add your personal credentials to complete the setup:'
                        : 'Some required information is missing. Please provide the following to continue:'}
                </Typography>
                <Stack spacing={2}>
                    {personalGaps.map((gap) => {
                        const isCredential = gap.type === 'credential'
                        const isPersonalCred = isCredential && gap.isPersonal
                        
                        return (
                            <div key={gap.field}>
                                <Stack direction='row' spacing={1} alignItems='center'>
                                    <Typography variant='caption' color='text.secondary'>
                                        {gap.label}
                                    </Typography>
                                    {isCredential && <Chip label='Credential' size='small' color='warning' />}
                                    {isPersonalCred && <Chip label='Personal' size='small' color='info' />}
                                </Stack>
                                {isCredential ? (
                                    <Typography variant='caption' sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                                        Please add this credential in Settings → Credentials, then retry.
                                    </Typography>
                                ) : (
                                    <TextField
                                        size='small'
                                        fullWidth
                                        placeholder={`Enter ${gap.label.toLowerCase()}`}
                                        value={values[gap.field] || ''}
                                        onChange={(e) => handleChange(gap.field, e.target.value)}
                                        sx={{ mt: 0.5 }}
                                    />
                                )}
                            </div>
                        )
                    })}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                {personalGaps.some((g) => g.type === 'credential') ? (
                    <Button variant='contained' color='primary' onClick={handleClose}>
                        Go to Credentials
                    </Button>
                ) : (
                    <Button variant='contained' onClick={handleSubmit} disabled={personalGaps.some((g) => g.type !== 'credential' && !values[g.field])}>
                        Save and Continue
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    )
}

QuickConfigModal.propTypes = {
    open: PropTypes.bool.isRequired,
    gaps: PropTypes.arrayOf(
        PropTypes.shape({
            field: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            type: PropTypes.string.isRequired
        })
    ).isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired
}

export default QuickConfigModal

