import PropTypes from 'prop-types'
import { Chip, Stack } from '@mui/material'

const CopilotPillBar = ({ pills = [], onPick }) => {
    return (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
            {pills.map((p) => (
                <Chip key={p} size='small' label={p} onClick={() => onPick && onPick(p)} />
            ))}
        </Stack>
    )
}

CopilotPillBar.propTypes = {
    pills: PropTypes.array,
    onPick: PropTypes.func
}

export default CopilotPillBar



