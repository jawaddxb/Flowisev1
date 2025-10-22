import PropTypes from 'prop-types'
import { Box, Chip, Stack, Typography } from '@mui/material'

const Badge = ({ type, label }) => {
    const color = type === 'add' ? 'success' : type === 'remove' ? 'error' : 'warning'
    return <Chip size='small' color={color} label={label} sx={{ mr: 0.5, mb: 0.5 }} />
}

const GraphDiffView = ({ diff = { added: [], removed: [], changed: [] } }) => {
    const { added = [], removed = [], changed = [] } = diff || {}
    const empty = added.length + removed.length + changed.length === 0
    return (
        <Box sx={{ p: 1 }}>
            {empty && <Typography variant='body2' color='text.secondary'>No changes yet.</Typography>}
            {!empty && (
                <Stack spacing={0.5}>
                    {added.length > 0 && (
                        <Box>
                            <Typography variant='caption' color='success.main'>Added</Typography>
                            <Box sx={{ mt: 0.5 }}>
                                {added.map((a) => <Badge key={`a-${a}`} type='add' label={a} />)}
                            </Box>
                        </Box>
                    )}
                    {changed.length > 0 && (
                        <Box>
                            <Typography variant='caption' color='warning.main'>Changed</Typography>
                            <Box sx={{ mt: 0.5 }}>
                                {changed.map((c) => <Badge key={`c-${c}`} type='change' label={c} />)}
                            </Box>
                        </Box>
                    )}
                    {removed.length > 0 && (
                        <Box>
                            <Typography variant='caption' color='error.main'>Removed</Typography>
                            <Box sx={{ mt: 0.5 }}>
                                {removed.map((r) => <Badge key={`r-${r}`} type='remove' label={r} />)}
                            </Box>
                        </Box>
                    )}
                </Stack>
            )}
        </Box>
    )
}

GraphDiffView.propTypes = {
    diff: PropTypes.object
}

export default GraphDiffView


