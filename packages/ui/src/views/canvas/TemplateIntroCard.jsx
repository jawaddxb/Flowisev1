import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Box, Card, Typography, Button, Stack, Chip, IconButton } from '@mui/material'
import { IconX, IconSparkles } from '@tabler/icons-react'

const TEMPLATE_CONTENT = {
    'deep-research-subagents': {
        title: 'Deep Research with SubAgents',
        description: 'This workflow orchestrates multiple AI agents to conduct comprehensive research on any topic. Perfect for in-depth analysis and multi-source investigations.',
        useCases: [
            'Market research and competitive analysis',
            'Academic research with multiple sources',
            'News monitoring and trend analysis',
            'Technical deep-dives and documentation review'
        ],
        prerequisites: [
            'AI model credentials (OpenAI, Anthropic, or OpenRouter)',
            'Optional: Web search API (Brave, Serper, etc.)'
        ],
        exampleAsks: [
            'Research latest AI trends in healthcare',
            'Compare pricing models for SaaS products',
            'Analyze customer sentiment from reviews'
        ]
    },
    'rag-chatbot': {
        title: 'RAG Chatbot',
        description: 'Ask questions about your documents using AI. This workflow loads your files, chunks them, stores embeddings, and retrieves relevant context to answer queries.',
        useCases: [
            'Internal knowledge base Q&A',
            'Customer support over documentation',
            'Research assistant for legal/medical docs',
            'Personal note-taking assistant'
        ],
        prerequisites: [
            'AI model credentials',
            'Vector database (Pinecone, Weaviate, or local)',
            'Documents to upload'
        ],
        exampleAsks: [
            'What are our refund policies?',
            'Summarize meeting notes from last week',
            'Find all mentions of budget in quarterly reports'
        ]
    }
}

const TemplateIntroCard = ({ flowId, templateKey, onStartCopilot }) => {
    const [visible, setVisible] = useState(false)
    const [content, setContent] = useState(null)

    useEffect(() => {
        if (!flowId || !templateKey) return
        
        // Check if permanently dismissed
        const dismissedKey = `template_intro_dismissed_${flowId}`
        if (localStorage.getItem(dismissedKey) === 'permanent') {
            setVisible(false)
            return
        }
        
        // Show intro card every time (not just first visit)
        const templateContent = TEMPLATE_CONTENT[templateKey]
        if (templateContent) {
            setContent(templateContent)
            setVisible(true)
        }
    }, [flowId, templateKey])

    const handleDismiss = () => {
        setVisible(false)
        // Don't persist - will show again next time
    }
    
    const handlePermanentDismiss = () => {
        setVisible(false)
        localStorage.setItem(`template_intro_dismissed_${flowId}`, 'permanent')
    }

    const handleStart = () => {
        handleDismiss()
        if (onStartCopilot) onStartCopilot()
    }

    if (!visible || !content) return null

    return (
        <Card
            sx={{
                position: 'absolute',
                top: 90,
                left: 20,
                width: 420,
                zIndex: 1100,
                bgcolor: 'background.paper',
                boxShadow: 4,
                border: '2px solid',
                borderColor: 'primary.main'
            }}
        >
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Stack direction='row' spacing={1} alignItems='center'>
                    <IconSparkles size={20} color='white' />
                    <Typography variant='h6' sx={{ color: 'white', fontWeight: 600 }}>
                        {content.title}
                    </Typography>
                </Stack>
                <IconButton size='small' onClick={handleDismiss} sx={{ color: 'white' }}>
                    <IconX size={18} />
                </IconButton>
            </Box>
            <Box sx={{ p: 2 }}>
                <Typography variant='body2' sx={{ mb: 2, lineHeight: 1.6 }}>
                    {content.description}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Best for:
                    </Typography>
                    <Stack component='ul' sx={{ pl: 2.5, m: 0 }}>
                        {content.useCases.slice(0, 3).map((useCase, i) => (
                            <Typography key={i} component='li' variant='body2' sx={{ mb: 0.3 }}>
                                {useCase}
                            </Typography>
                        ))}
                    </Stack>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        You'll need:
                    </Typography>
                    <Stack direction='row' spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {content.prerequisites.map((prereq, i) => (
                            <Chip key={i} label={prereq} size='small' variant='outlined' color='primary' />
                        ))}
                    </Stack>
                </Box>

                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                    <Typography variant='caption' sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Try asking:
                    </Typography>
                    {content.exampleAsks.slice(0, 2).map((ask, i) => (
                        <Typography key={i} variant='caption' sx={{ display: 'block', fontStyle: 'italic', color: 'text.secondary', mb: 0.3 }}>
                            "{ask}"
                        </Typography>
                    ))}
                </Box>

                <Stack spacing={1}>
                    <Button 
                        variant='contained' 
                        color='primary' 
                        fullWidth 
                        onClick={handleStart}
                        startIcon={<IconSparkles size={16} />}
                    >
                        Start with Copilot
                    </Button>
                    <Stack direction='row' spacing={1}>
                        <Button variant='text' size='small' fullWidth onClick={handleDismiss}>
                            Later
                        </Button>
                        <Button variant='text' size='small' fullWidth onClick={handlePermanentDismiss}>
                            Don't show again
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Card>
    )
}

TemplateIntroCard.propTypes = {
    flowId: PropTypes.string,
    templateKey: PropTypes.string,
    onStartCopilot: PropTypes.func
}

export default TemplateIntroCard

