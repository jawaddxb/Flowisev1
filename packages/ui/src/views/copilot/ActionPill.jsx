import PropTypes from 'prop-types'
import { Button, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
import { IconSparkles } from '@tabler/icons-react'

// Styled button for action pills
const StyledActionButton = styled(Button)(({ theme, variant: buttonVariant, highlight }) => ({
    borderRadius: '20px',
    textTransform: 'none',
    padding: '8px 16px',
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
    animation: highlight ? 'pulse 2s infinite' : 'none',
    '@keyframes pulse': {
        '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.4)'
        },
        '50%': {
            boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)'
        }
    },
    ...(buttonVariant === 'primary' && {
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        color: 'white',
        '&:hover': {
            background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)'
        }
    }),
    ...(buttonVariant === 'danger' && {
        backgroundColor: theme.palette.error.main,
        color: 'white',
        '&:hover': {
            backgroundColor: theme.palette.error.dark
        }
    })
}))

/**
 * ActionPill - Clickable suggestion button for copilot actions
 */
const ActionPill = ({ text, icon, variant = 'secondary', highlight = false, onClick, loading = false, disabled = false }) => {
    return (
        <StyledActionButton
            variant={variant === 'primary' || variant === 'danger' ? 'contained' : 'outlined'}
            buttonVariant={variant}
            highlight={highlight}
            onClick={onClick}
            disabled={loading || disabled}
            startIcon={icon === '✨' ? <IconSparkles size={16} /> : null}
        >
            {loading ? 'Processing...' : text}
        </StyledActionButton>
    )
}

ActionPill.propTypes = {
    text: PropTypes.string.isRequired,
    icon: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
    highlight: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    disabled: PropTypes.bool
}

export default ActionPill

