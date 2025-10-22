import PropTypes from 'prop-types'
import { Box, Chip, Typography } from '@mui/material'
import { IconBulb } from '@tabler/icons-react'

/**
 * PromptSuggestions - Show contextual prompt examples that users can click
 */
const PromptSuggestions = ({ prompts = [], onSelect, title = 'Try these prompts:' }) => {
    if (!prompts || prompts.length === 0) return null

    return (
        <Box sx={{ mt: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <IconBulb size={14} />
                <Typography variant="caption" color="text.secondary">
                    {title}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {prompts.map((prompt, index) => (
                    <Chip
                        key={index}
                        label={prompt}
                        onClick={() => onSelect && onSelect(prompt)}
                        clickable
                        size="small"
                        variant="outlined"
                        sx={{
                            borderRadius: '16px',
                            '&:hover': {
                                backgroundColor: 'action.hover'
                            }
                        }}
                    />
                ))}
            </Box>
        </Box>
    )
}

PromptSuggestions.propTypes = {
    prompts: PropTypes.arrayOf(PropTypes.string),
    onSelect: PropTypes.func,
    title: PropTypes.string
}

export default PromptSuggestions

