import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Box, Card, Typography, IconButton, Collapse, Chip, Stack } from '@mui/material'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import useApi from '@/hooks/useApi'
import copilotApi from '@/api/copilot'

const CanvasSummaryCard = ({ flowId }) => {
    const [collapsed, setCollapsed] = useState(false)
    const [summary, setSummary] = useState(null)
    const [mode, setMode] = useState('Applied')
    const [explain, setExplain] = useState(null)
    const autoApplyApi = useApi(copilotApi.autoApply)

    // Initial fetch and event listener for reactive updates
    useEffect(() => {
        if (!flowId) return
        
        // Fetch initial summary
        autoApplyApi.request({ flowId })
        
        // Listen for copilot mode updates
        const handleModeUpdate = (event) => {
            if (event.detail?.flowId === flowId) {
                setMode(event.detail.mode || 'Applied')
            }
        }
        
        // Listen for copilot summary updates
        const handleSummaryUpdate = (event) => {
            if (event.detail?.flowId === flowId) {
                const summaryText = event.detail.summary || ''
                if (!summaryText) {
                    setSummary(null)
                    return
                }
                
                // Parse summary text
                const topicMatch = summaryText.match(/for "([^"]+)"/)
                const sourcesMatch = summaryText.match(/Search ([^f]+) for/)
                const deliveryMatch = summaryText.match(/deliver to ([^,\n.[\]]+)/)
                const timeframeMatch = summaryText.match(/\(([^)]+)\)/)
                const scheduleMatch = summaryText.match(/\[([^\]]+)\]/)
                
                setSummary({
                    topic: topicMatch ? topicMatch[1] : null,
                    sources: sourcesMatch ? sourcesMatch[1].split(' + ').map(s => s.trim()) : [],
                    delivery: deliveryMatch ? deliveryMatch[1].trim() : null,
                    timeframe: timeframeMatch ? timeframeMatch[1] : null,
                    schedule: scheduleMatch ? scheduleMatch[1] : null,
                    fullText: summaryText
                })
            }
        }
        
        // Listen for copilot review updates
        const handleReviewUpdate = (event) => {
            if (event.detail?.flowId === flowId) {
                const { summary: reviewSummary, steps } = event.detail
                setExplain({ summary: reviewSummary, steps })
            }
        }
        
        window.addEventListener('copilot:mode', handleModeUpdate)
        window.addEventListener('copilot:summary-updated', handleSummaryUpdate)
        window.addEventListener('copilot:review-updated', handleReviewUpdate)
        return () => {
            window.removeEventListener('copilot:mode', handleModeUpdate)
            window.removeEventListener('copilot:summary-updated', handleSummaryUpdate)
            window.removeEventListener('copilot:review-updated', handleReviewUpdate)
        }
        // eslint-disable-next-line
    }, [flowId])

    useEffect(() => {
        if (autoApplyApi.data?.applied && autoApplyApi.data?.summary) {
            const summaryText = autoApplyApi.data.summary
            const answers = autoApplyApi.data.answers || {}
            
            setSummary({
                topic: answers.topic || answers.goal || null,
                sources: Array.isArray(answers.sources) ? answers.sources : answers.sources ? [answers.sources] : [],
                delivery: answers.delivery || null,
                timeframe: answers.timeframe || null,
                schedule: answers.schedule || null,
                fullText: summaryText
            })
        }
    }, [autoApplyApi.data])

    if (!summary) return null

    return (
        <Card
            sx={{
                position: 'absolute',
                top: 90,
                left: 20,
                width: 320,
                zIndex: 1000,
                bgcolor: 'background.paper',
                boxShadow: 3,
                border: '2px solid',
                borderColor: 'primary.main'
            }}
        >
            <Box
                sx={{
                    px: 1.5,
                    py: 1,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <Stack direction='row' spacing={1} alignItems='center' sx={{ flex: 1 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'primary.dark' }}>
                        Copilot Plan
                    </Typography>
                    <Chip label={mode} size='small' color='primary' variant='outlined' />
                </Stack>
                <IconButton size='small' sx={{ color: 'primary.dark' }}>
                    {collapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
                </IconButton>
            </Box>
            <Collapse in={!collapsed}>
                <Box sx={{ p: 1.5 }}>
                    {summary.topic && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant='caption' color='text.secondary'>Topic</Typography>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>{summary.topic}</Typography>
                        </Box>
                    )}
                    {summary.sources && summary.sources.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant='caption' color='text.secondary'>Sources</Typography>
                            <Stack direction='row' spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                {summary.sources.map((src) => (
                                    <Chip key={src} label={src} size='small' color='primary' variant='outlined' />
                                ))}
                            </Stack>
                        </Box>
                    )}
                    {summary.delivery && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant='caption' color='text.secondary'>Delivery</Typography>
                            <Typography variant='body2'>{summary.delivery}</Typography>
                        </Box>
                    )}
                    {summary.timeframe && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant='caption' color='text.secondary'>Timeframe</Typography>
                            <Typography variant='body2'>{summary.timeframe}</Typography>
                        </Box>
                    )}
                    {summary.schedule && summary.schedule !== 'Run now' && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant='caption' color='text.secondary'>Schedule</Typography>
                            <Chip label={summary.schedule} size='small' color='secondary' variant='outlined' />
                        </Box>
                    )}
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                        <Typography variant='caption' sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            {summary.fullText}
                        </Typography>
                    </Box>
                    {explain && explain.summary && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
                                How this works
                            </Typography>
                            <Typography variant='body2' sx={{ mb: 0.5, mt: 0.5 }}>
                                {explain.summary}
                            </Typography>
                            {Array.isArray(explain.steps) && explain.steps.length > 0 && (
                                <Stack component='ul' sx={{ pl: 2, m: 0, mt: 0.5 }}>
                                    {explain.steps.slice(0, 4).map((s, i) => (
                                        <Typography key={i} component='li' variant='caption' sx={{ color: 'text.secondary' }}>
                                            {s}
                                        </Typography>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Card>
    )
}

CanvasSummaryCard.propTypes = {
    flowId: PropTypes.string
}

export default CanvasSummaryCard

