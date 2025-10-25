import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Card, CardContent, Typography, Stack, Box, Alert } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

const WorkflowExplainerModal = ({ open, onClose, explainer, onSave }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    
    if (!explainer || !explainer.nodes || explainer.nodes.length === 0) {
        return null
    }

    // Node type to gradient mapping (subtle, theme-aware)
    const getNodeGradient = (key) => {
        if (customization.isDarkMode) {
            const darkGradients = {
                youtube: 'linear-gradient(135deg, #303030 0%, #424242 100%)',
                web: 'linear-gradient(135deg, #1e3a8a15 0%, #3b82f625 100%)',
                news: 'linear-gradient(135deg, #4c1d9520 0%, #7c3aed30 100%)',
                twitter: 'linear-gradient(135deg, #1e40af15 0%, #3b82f625 100%)',
                reddit: 'linear-gradient(135deg, #7c2d1215 0%, #ea580c25 100%)',
                research: 'linear-gradient(135deg, #14532d15 0%, #16a34a25 100%)',
                transcribe: 'linear-gradient(135deg, #713f1215 0%, #f59e0b25 100%)',
                whisper: 'linear-gradient(135deg, #713f1215 0%, #f59e0b25 100%)',
                summarize: 'linear-gradient(135deg, #6b21a815 0%, #a855f725 100%)',
                ai: 'linear-gradient(135deg, #6b21a815 0%, #a855f725 100%)',
                email: 'linear-gradient(135deg, #7f1d1d15 0%, #dc262625 100%)',
                slack: 'linear-gradient(135deg, #064e3b15 0%, #10b98125 100%)',
                notion: 'linear-gradient(135deg, #1e293b15 0%, #47556925 100%)',
                default: `linear-gradient(135deg, ${theme.palette.card.main} 0%, ${theme.palette.card.hover} 100%)`
            }
            return darkGradients[key] || darkGradients.default
        } else {
            const lightGradients = {
                youtube: 'linear-gradient(135deg, #fff8e14e 0%, #ffcc802f 100%)',
                web: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                news: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                twitter: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                reddit: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                research: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                transcribe: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                whisper: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                summarize: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                ai: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                email: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                slack: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                notion: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                default: 'linear-gradient(135deg, #f6f3fb 0%, #f2f8fc 100%)'
            }
            return lightGradients[key] || lightGradients.default
        }
    }

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: `${customization.borderRadius}px`
                }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>📊</span>
                    <span>Workflow Preview</span>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} alignItems="center" sx={{ pt: 1, pb: 2 }}>
                    {explainer.nodes.map((node, idx) => (
                        <Box key={node.key || idx} sx={{ width: '100%', maxWidth: 400 }}>
                            <Card 
                                sx={{ 
                                    minWidth: 240, 
                                    textAlign: 'center',
                                    background: getNodeGradient(node.key),
                                    border: `1px solid ${theme.palette.grey[900]}25`,
                                    borderRadius: `${customization.borderRadius}px`,
                                    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 20px 0 rgb(32 40 45 / 12%)'
                                    }
                                }}
                            >
                                <CardContent>
                                    <Typography variant="h3" sx={{ mb: 1 }}>
                                        {node.icon}
                                    </Typography>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{ 
                                            fontWeight: 600, 
                                            mb: 0.5,
                                            color: customization.isDarkMode ? 'text.primary' : '#333'
                                        }}
                                    >
                                        {node.label}
                                    </Typography>
                                    {node.description && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: customization.isDarkMode ? 'text.secondary' : '#666'
                                            }}
                                        >
                                            {node.description}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                            {idx < explainer.nodes.length - 1 && (
                                <Box sx={{ textAlign: 'center', py: 1.5 }}>
                                    <ArrowDownwardIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                                </Box>
                            )}
                        </Box>
                    ))}
                </Stack>
                {explainer.summary && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <strong>Summary:</strong> {explainer.summary}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
                {onSave && (
                    <Button variant="contained" onClick={onSave} color="primary">
                        💾 Save & Attach to Workflow
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    )
}

export default WorkflowExplainerModal
