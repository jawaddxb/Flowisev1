/**
 * Workflow Explainer Generator
 * Builds a visual diagram representation from Copilot answers
 */

export function buildExplainerFromAnswers(answers = {}, llm = null) {
    const nodes = []
    const sources = Array.isArray(answers.sources) ? answers.sources : (answers.sources ? [answers.sources] : [])

    // Add source nodes
    if (sources.includes('YouTube')) {
        nodes.push({ key: 'youtube', icon: '🎥', label: 'YouTube Monitor', description: 'Watch for new videos' })
    }
    if (sources.includes('Web')) {
        nodes.push({ key: 'web', icon: '🌐', label: 'Web Search', description: 'Search the internet' })
    }
    if (sources.includes('News')) {
        nodes.push({ key: 'news', icon: '📰', label: 'News Search', description: 'Track news sites' })
    }
    if (sources.includes('Twitter')) {
        nodes.push({ key: 'twitter', icon: '🐦', label: 'Twitter Search', description: 'Find tweets' })
    }
    if (sources.includes('Reddit')) {
        nodes.push({ key: 'reddit', icon: '💬', label: 'Reddit Search', description: 'Scan subreddits' })
    }

    // Add research/intent node
    if (answers.topic) {
        nodes.push({ key: 'research', icon: '🔍', label: `Research: ${answers.topic}`, description: 'Gather and analyze information' })
    }

    // Add transformation nodes based on sources
    if (sources.includes('YouTube')) {
        nodes.push({ key: 'whisper', icon: '🎙️', label: 'Transcribe', description: 'Extract audio as text' })
    }
    
    // Add summarization if we have content to process
    if (answers.topic || sources.length > 0) {
        nodes.push({ key: 'summarize', icon: '🤖', label: 'AI Summarize', description: 'Synthesize insights with AI' })
    }

    // Add delivery nodes
    if (answers.delivery === 'Email') {
        const desc = answers.frequency ? `Send ${answers.frequency}` : 'Send via email'
        nodes.push({ key: 'email', icon: '📧', label: 'Email Sender', description: desc })
    }
    if (answers.delivery === 'Slack') {
        nodes.push({ key: 'slack', icon: '💬', label: 'Slack Message', description: 'Post to Slack channel' })
    }
    if (answers.delivery === 'Notion') {
        nodes.push({ key: 'notion', icon: '📝', label: 'Notion Page', description: 'Create/update Notion page' })
    }

    // Build summary text
    const summary = llm?.clarifications_needed?.length
        ? `Note: ${llm.clarifications_needed.join(' ')}`
        : buildSummary(answers, sources)

    return {
        version: 1,
        createdAt: new Date().toISOString(),
        source: 'copilot-v2',
        nodes,
        summary
    }
}

function buildSummary(answers, sources) {
    const parts = []
    
    if (sources.length > 0) {
        parts.push(`Use ${sources.join(', ')}`)
    }
    
    if (answers.topic) {
        parts.push(`to research "${answers.topic}"`)
    }
    
    if (answers.delivery) {
        const freqText = answers.frequency ? ` (${answers.frequency})` : ''
        parts.push(`and deliver via ${answers.delivery}${freqText}`)
    }
    
    if (parts.length === 0) {
        return 'Visual summary of your workflow intent.'
    }
    
    return parts.join(' ') + '.'
}


