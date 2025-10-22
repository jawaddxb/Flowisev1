/**
 * Friendly message templates for copilot
 * Transforms technical error messages into newbie-friendly guidance
 */

export const FRIENDLY_MESSAGES = {
    missingEntryPoint: {
        emoji: '🚀',
        title: "Let's get your workflow ready to run!",
        description: "Your workflow needs a starting point - this is the AI model that will handle conversations.",
        quickFixes: [
            { label: 'Add ChatGPT (GPT-4o-mini)', action: 'addChatGPT', variant: 'primary' },
            { label: 'Add Claude (Sonnet)', action: 'addClaude', variant: 'secondary' },
            { label: 'Show all AI models', action: 'showModels', variant: 'secondary' }
        ],
        prompts: ['Use GPT-4 for this workflow', "What's the best model for research?", 'Add Claude Sonnet']
    },

    disconnectedNode: {
        emoji: '🔧',
        title: (nodeName) => `Almost there! "${nodeName}" needs to be connected`,
        description: (nodeName) =>
            `The "${nodeName}" node isn't connected to your workflow yet. Disconnected nodes won't run.`,
        quickFixes: (nodeName) => [
            { label: `Connect ${nodeName} automatically`, action: 'autoConnect', variant: 'primary', params: { nodeName } },
            { label: `Remove ${nodeName}`, action: 'deleteNode', variant: 'danger', params: { nodeName } },
            { label: `Explain what ${nodeName} does`, action: 'explain', variant: 'secondary', params: { nodeName } }
        ],
        tip: '💡 All nodes need connections to work together'
    },

    multipleIssues: {
        emoji: '👋',
        title: (count) => `Almost there – ${count} quick ${count === 1 ? 'step' : 'steps'}`,
        description: "I can handle this for you automatically, or guide you through each step.",
        quickFixes: [
            { label: '✨ Fix everything automatically', action: 'autoFixAll', variant: 'primary', highlight: true },
            { label: 'Guide me step-by-step', action: 'wizard', variant: 'secondary' },
            { label: 'Let me fix it manually', action: 'dismiss', variant: 'secondary' }
        ],
        estimate: '⏱️ Estimated time: 30 seconds'
    },

    missingCredentials: {
        emoji: '🔑',
        title: (credNames) => `You need ${credNames.length === 1 ? 'a credential' : 'some credentials'} to run this`,
        description: (credNames) =>
            `To use ${credNames.join(' and ')}, you'll need to add ${credNames.length === 1 ? 'an API key' : 'API keys'}.`,
        quickFixes: (credNames, credentials) => [
            { label: 'Add API key here', action: 'showCredentialInput', variant: 'primary', params: { credentials } },
            { label: 'Open credentials page', action: 'openCredentials', variant: 'secondary' }
        ],
        tip: '🔒 Your credentials are stored securely and never shared'
    },

    missingParams: {
        emoji: '⚙️',
        title: 'A few settings need your attention',
        description: (paramNames) => `Please fill in: ${paramNames.join(', ')}`,
        quickFixes: [
            { label: 'Show me what to fill in', action: 'highlightParams', variant: 'primary' },
            { label: 'Fill in automatically', action: 'autoFillParams', variant: 'secondary' }
        ]
    }
}

/**
 * Transform technical issue messages into friendly ones
 */
export const transformIssues = (reviewData) => {
    const { issues = [], missingCredentials = [], missingParams = [], runnable } = reviewData

    // If workflow is runnable, return success message
    if (runnable) {
        return {
            type: 'success',
            emoji: '✅',
            title: 'This workflow looks good!',
            description: "You're all set. Ready to test it?",
            quickFixes: [
                { label: 'Test it now', action: 'test', variant: 'primary' },
                { label: 'More actions', action: 'moreActions', variant: 'secondary' }
            ]
        }
    }

    // Count total issues
    const totalIssues = issues.length + missingCredentials.length + missingParams.length

    // Multiple issues - show grouped summary
    if (totalIssues > 1) {
        const grouped = []
        
        // Group credentials
        if (missingCredentials.length > 0) {
            const uniqueCreds = [...new Set(missingCredentials.map(c => c.label.split(' - ')[0]))]
            grouped.push(`Add ${uniqueCreds.length} API ${uniqueCreds.length === 1 ? 'credential' : 'credentials'}`)
        }
        
        // Group params by node
        if (missingParams.length > 0) {
            const nodeGroups = {}
            missingParams.forEach(p => {
                if (!nodeGroups[p.nodeLabel]) nodeGroups[p.nodeLabel] = []
                nodeGroups[p.nodeLabel].push(p.paramLabel)
            })
            const nodeCount = Object.keys(nodeGroups).length
            grouped.push(`Configure ${nodeCount} ${nodeCount === 1 ? 'component' : 'components'}`)
        }
        
        // Group connection issues
        const connectionIssues = issues.filter(i => i.includes('not connected'))
        if (connectionIssues.length > 0) {
            grouped.push(`Connect ${connectionIssues.length} ${connectionIssues.length === 1 ? 'component' : 'components'}`)
        }
        
        // Other issues
        const otherIssues = issues.filter(i => !i.includes('not connected'))
        if (otherIssues.length > 0) {
            grouped.push(...otherIssues.slice(0, 2).map(transformSingleIssue))
        }
        
        return {
            type: 'multipleIssues',
            ...FRIENDLY_MESSAGES.multipleIssues,
            title: FRIENDLY_MESSAGES.multipleIssues.title(grouped.length),
            issuesList: grouped
        }
    }

    // Single issue - show specific message
    if (missingCredentials.length > 0) {
        const credNames = missingCredentials.map((c) => c.label)
        return {
            type: 'missingCredentials',
            ...FRIENDLY_MESSAGES.missingCredentials,
            title: FRIENDLY_MESSAGES.missingCredentials.title(credNames),
            description: FRIENDLY_MESSAGES.missingCredentials.description(credNames),
            quickFixes: FRIENDLY_MESSAGES.missingCredentials.quickFixes(credNames, missingCredentials),
            credentials: missingCredentials
        }
    }

    if (missingParams.length > 0) {
        const paramNames = missingParams.map((p) => p.paramLabel)
        return {
            type: 'missingParams',
            ...FRIENDLY_MESSAGES.missingParams,
            description: FRIENDLY_MESSAGES.missingParams.description(paramNames)
        }
    }

    if (issues.length > 0) {
        // Detect specific issue types
        const issue = issues[0]

        // Missing entry point
        if (issue.includes('entry point') || issue.includes('Agent or Chat Model')) {
            return {
                type: 'missingEntryPoint',
                ...FRIENDLY_MESSAGES.missingEntryPoint
            }
        }

        // Disconnected node
        const disconnectedMatch = issue.match(/Node "([^"]+)" is not connected/)
        if (disconnectedMatch) {
            const nodeName = disconnectedMatch[1]
            return {
                type: 'disconnectedNode',
                emoji: FRIENDLY_MESSAGES.disconnectedNode.emoji,
                title: FRIENDLY_MESSAGES.disconnectedNode.title(nodeName),
                description: FRIENDLY_MESSAGES.disconnectedNode.description(nodeName),
                quickFixes: FRIENDLY_MESSAGES.disconnectedNode.quickFixes(nodeName),
                tip: FRIENDLY_MESSAGES.disconnectedNode.tip
            }
        }

        // Generic issue
        return {
            type: 'generic',
            emoji: '⚠️',
            title: 'This workflow has an issue',
            description: transformSingleIssue(issue),
            quickFixes: [
                { label: 'Help me fix this', action: 'getHelp', variant: 'primary' },
                { label: 'Let me fix it manually', action: 'dismiss', variant: 'secondary' }
            ]
        }
    }

    return null
}

/**
 * Transform a single technical issue into plain language
 */
const transformSingleIssue = (issue) => {
    const transforms = {
        'entry point': 'starting point (AI model)',
        graph: 'workflow',
        node: 'component',
        'is not connected to the graph': "isn't connected to your workflow",
        'must have at least one': 'needs a'
    }

    let friendly = issue
    for (const [technical, plain] of Object.entries(transforms)) {
        friendly = friendly.replace(new RegExp(technical, 'gi'), plain)
    }

    return friendly
}

