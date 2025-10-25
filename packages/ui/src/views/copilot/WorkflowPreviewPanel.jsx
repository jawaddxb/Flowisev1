import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import { Box, Card, CardContent, Typography, Stack, Fade, useMediaQuery } from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import PropTypes from 'prop-types'

const WorkflowPreviewPanel = ({ answers, visible, dockWidth = 400 }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'))
    
    // Don't show on small screens to avoid overlap
    if (!visible || !answers || !isLargeScreen) return null
    
    const nodes = []
    const sources = Array.isArray(answers.sources) ? answers.sources : 
                    answers.sources ? [answers.sources] : []
    
    // Build nodes array
    if (sources.includes('YouTube')) nodes.push({ key: 'youtube', icon: '🎥', label: 'YouTube Monitor' })
    if (sources.includes('Web')) nodes.push({ key: 'web', icon: '🌐', label: 'Web Search' })
    if (sources.includes('News')) nodes.push({ key: 'news', icon: '📰', label: 'News Search' })
    if (sources.includes('Twitter')) nodes.push({ key: 'twitter', icon: '🐦', label: 'Twitter Search' })
    if (sources.includes('Reddit')) nodes.push({ key: 'reddit', icon: '💬', label: 'Reddit Search' })
    
    // Add transcription for YouTube
    if (sources.includes('YouTube')) {
        nodes.push({ key: 'transcribe', icon: '🎙️', label: 'Transcribe Audio' })
    }
    
    if (answers.topic) {
        nodes.push({ key: 'research', icon: '🔍', label: `Research: ${answers.topic}` })
    }
    
    // Add AI processing
    if (nodes.length > 0) {
        nodes.push({ key: 'ai', icon: '🤖', label: 'AI Synthesize' })
    }
    
    if (answers.delivery === 'Email') nodes.push({ key: 'email', icon: '📧', label: 'Send Email' })
    if (answers.delivery === 'Slack') nodes.push({ key: 'slack', icon: '💬', label: 'Post to Slack' })
    if (answers.delivery === 'Notion') nodes.push({ key: 'notion', icon: '📝', label: 'Save to Notion' })
    
    if (nodes.length === 0) return null
    
    const getNodeColor = (key) => {
        if (customization.isDarkMode) {
            const darkColors = {
                youtube: '#404040',
                web: '#1e3a8a',
                news: '#4c1d95',
                twitter: '#1e40af',
                reddit: '#7c2d12',
                research: '#14532d',
                transcribe: '#713f12',
                ai: '#6b21a8',
                email: '#7f1d1d',
                slack: '#064e3b',
                notion: '#1e293b',
                default: theme.palette.card.main
            }
            return darkColors[key] || darkColors.default
        } else {
            const lightColors = {
                youtube: '#fff8e1',
                web: '#dbeafe',
                news: '#f3e8ff',
                twitter: '#dbeafe',
                reddit: '#fed7aa',
                research: '#dcfce7',
                transcribe: '#fef3c7',
                ai: '#f3e8ff',
                email: '#fee2e2',
                slack: '#d1fae5',
                notion: '#e2e8f0',
                default: theme.palette.card.main
            }
            return lightColors[key] || lightColors.default
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
                                bgcolor: getNodeColor(node.key),
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
    visible: PropTypes.bool,
    dockWidth: PropTypes.number
}

export default WorkflowPreviewPanel

