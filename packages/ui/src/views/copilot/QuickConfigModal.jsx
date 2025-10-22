import PropTypes from 'prop-types'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography, Chip } from '@mui/material'
import { useState } from 'react'
import { IconAlertCircle } from '@tabler/icons-react'

const QuickConfigModal = ({ open, gaps, onClose, onSubmit }) => {
    const [values, setValues] = useState({})

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

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle>
                <Stack direction='row' alignItems='center' spacing={1}>
                    <IconAlertCircle size={20} color='#f59e0b' />
                    <Typography variant='h6'>Quick Configuration</Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Some required information is missing. Please provide the following to continue:
                </Typography>
                <Stack spacing={2}>
                    {gaps.map((gap) => {
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
                                    <Typography variant='caption' sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
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
                {gaps.some((g) => g.type === 'credential') ? (
                    <Button variant='contained' color='primary' onClick={handleClose}>
                        Go to Credentials
                    </Button>
                ) : (
                    <Button variant='contained' onClick={handleSubmit} disabled={gaps.some((g) => g.type !== 'credential' && !values[g.field])}>
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

