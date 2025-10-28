import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import { Box, Card, CardContent, Typography, Stack, Fade, useMediaQuery } from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import PropTypes from 'prop-types'

const getPrimitiveIconForPreview = (primitive) => ({
    'data_source': '📥',
    'processor': '⚙️',
    'ai_agent': '🤖',
    'integrator': '🔗',
    'controller': '🎛️',
    'storage': '💾',
    'communicator': '📤'
}[primitive] || '📦')

const WorkflowPreviewPanel = ({ answers, workflowSpec, visible, dockWidth = 400 }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'))
    
    // Don't show on small screens to avoid overlap
    if (!visible || !isLargeScreen) return null
    
    let nodes = []
    
    // NEW: If we have workflowSpec from LLM, use primitives
    if (workflowSpec?.workflow?.nodes) {
        nodes = workflowSpec.workflow.nodes.map((node, idx) => ({
            key: node.id || `node-${idx}`,
            icon: getPrimitiveIconForPreview(node.primitive),
            label: node.label,
            primitive: node.primitive
        }))
    } else if (answers) {
        // FALLBACK: Legacy logic for backward compatibility
        const sources = Array.isArray(answers.sources) ? answers.sources : 
                        answers.sources ? [answers.sources] : []
        
        // Build nodes array from answers
        if (sources.includes('YouTube')) nodes.push({ key: 'youtube', icon: '🎥', label: 'YouTube Monitor', primitive: 'data_source' })
        if (sources.includes('Web')) nodes.push({ key: 'web', icon: '🌐', label: 'Web Search', primitive: 'data_source' })
        if (sources.includes('News')) nodes.push({ key: 'news', icon: '📰', label: 'News Search', primitive: 'data_source' })
        if (sources.includes('Twitter')) nodes.push({ key: 'twitter', icon: '🐦', label: 'Twitter Search', primitive: 'data_source' })
        if (sources.includes('Reddit')) nodes.push({ key: 'reddit', icon: '💬', label: 'Reddit Search', primitive: 'data_source' })
        
        // Add transcription for YouTube
        if (sources.includes('YouTube')) {
            nodes.push({ key: 'transcribe', icon: '🎙️', label: 'Transcribe Audio', primitive: 'ai_agent' })
        }
        
        if (answers.topic) {
            nodes.push({ key: 'research', icon: '🔍', label: `Research: ${answers.topic}`, primitive: 'processor' })
        }
        
        // Add AI processing
        if (nodes.length > 0) {
            nodes.push({ key: 'ai', icon: '🤖', label: 'AI Synthesize', primitive: 'ai_agent' })
        }
        
        if (answers.delivery === 'Email') nodes.push({ key: 'email', icon: '📧', label: 'Send Email', primitive: 'communicator' })
        if (answers.delivery === 'Slack') nodes.push({ key: 'slack', icon: '💬', label: 'Post to Slack', primitive: 'communicator' })
        if (answers.delivery === 'Notion') nodes.push({ key: 'notion', icon: '📝', label: 'Save to Notion', primitive: 'communicator' })
    }
    
    if (nodes.length === 0) return null
    
    const getNodeColor = (node) => {
        // Use primitive type for universal coloring
        const primitive = node.primitive || 'default'
        
        if (customization.isDarkMode) {
            const darkColors = {
                data_source: '#1e3a8a',
                processor: '#14532d',
                ai_agent: '#6b21a8',
                integrator: '#7c2d12',
                controller: '#713f12',
                storage: '#404040',
                communicator: '#7f1d1d',
                default: theme.palette.card.main
            }
            return darkColors[primitive] || darkColors.default
        } else {
            const lightColors = {
                data_source: '#dbeafe',
                processor: '#dcfce7',
                ai_agent: '#f3e8ff',
                integrator: '#fed7aa',
                controller: '#fef3c7',
                storage: '#e2e8f0',
                communicator: '#fee2e2',
                default: theme.palette.card.main
            }
            return lightColors[primitive] || lightColors.default
        }
    }
    
    return (
        <Fade in={visible}>
            <Box sx={{
                position: 'absolute',
                right: `calc(${dockWidth}px + 16px)`,
                top: 70,
                width: 300,
                maxHeight: 'calc(100vh - 100px)',
                overflow: 'auto',
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.grey[900]}25`,
                borderRadius: `${customization.borderRadius}px`,
                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                p: 2,
                zIndex: 1100
            }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
                    Building Workflow...
                </Typography>
                <Stack spacing={1.5} alignItems="center">
                    {nodes.map((node, idx) => (
                        <Box key={idx} sx={{ width: '100%' }}>
                            <Card sx={{
                                bgcolor: getNodeColor(node),
                                border: `1px solid ${theme.palette.grey[900]}25`,
                                borderRadius: `${customization.borderRadius}px`,
                                boxShadow: 'none',
                                transition: 'transform 0.2s',
                                '&:hover': { 
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 2px 8px 0 rgb(32 40 45 / 12%)'
                                }
                            }}>
                                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h6">{node.icon}</Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontWeight: 500,
                                                color: customization.isDarkMode ? 'text.primary' : '#333'
                                            }}
                                        >
                                            {node.label}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                            {idx < nodes.length - 1 && (
                                <Box sx={{ textAlign: 'center', py: 0.5 }}>
                                    <ArrowDownwardIcon sx={{ fontSize: 20, color: 'text.secondary', opacity: 0.5 }} />
                                </Box>
                            )}
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Fade>
    )
}

WorkflowPreviewPanel.propTypes = {
    answers: PropTypes.object,
    workflowSpec: PropTypes.object,
    visible: PropTypes.bool,
    dockWidth: PropTypes.number
}

export default WorkflowPreviewPanel

