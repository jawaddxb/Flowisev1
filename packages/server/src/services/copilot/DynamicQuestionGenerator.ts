import type { WorkflowSpec } from './WorkflowCompilerService'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import logger from '../../utils/logger'

export interface DynamicQuestion {
    id: string
    text: string
    type: 'text' | 'number' | 'choice' | 'multiselect' | 'credential'
    options?: string[]
    default?: any
    required: boolean
    credentialType?: string
    credentialName?: string
    isPersonal?: boolean
}

export class DynamicQuestionGenerator {
    /**
     * Generate dynamic questions from WorkflowSpec
     * Combines LLM-suggested questions with system-detected gaps
     */
    static async generateQuestions(
        workflowSpec: WorkflowSpec,
        workspaceId?: string
    ): Promise<DynamicQuestion[]> {
        const questions: DynamicQuestion[] = []

        // 1. Add LLM-provided questions (high priority)
        for (const q of workflowSpec.workflow.questions_for_user || []) {
            questions.push({
                id: q.field,
                text: q.question,
                type: q.type,
                options: q.options,
                default: q.default,
                required: q.required ?? true
            })
        }

        // 2. Add credential gaps
        for (const cred of workflowSpec.workflow.credentials_needed || []) {
            const exists = await this.credentialExists(cred.service, cred.type, workspaceId)

            if (!exists) {
                const credName = this.serviceToCredentialName(cred.service)
                if (credName) {
                    questions.push({
                        id: `credential_${cred.service.toLowerCase().replace(/\s+/g, '_')}`,
                        text: `Connect your ${cred.service} account`,
                        type: 'credential',
                        credentialType: cred.type,
                        credentialName: credName,
                        isPersonal: cred.personal,
                        required: true
                    })
                }
            }
        }

        // 3. Add questions for nodes with needsUserInput
        for (const node of workflowSpec.workflow.nodes) {
            if (node.config?.needsUserInput && Array.isArray(node.config.needsUserInput)) {
                for (const field of node.config.needsUserInput) {
                    // Skip if already asked by LLM
                    if (questions.find(q => q.id === field)) continue

                    questions.push({
                        id: field,
                        text: `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}?`,
                        type: 'text',
                        required: true
                    })
                }
            }
        }

        logger.debug(`[DynamicQuestionGenerator] Generated ${questions.length} questions`)

        return questions
    }

    /**
     * Check if a credential exists for a service
     */
    private static async credentialExists(
        serviceName: string,
        credType: string,
        workspaceId?: string
    ): Promise<boolean> {
        try {
            const app = getRunningExpressApp()
            const credRepo = app.AppDataSource.getRepository(Credential)

            const credentialName = this.serviceToCredentialName(serviceName)
            if (!credentialName) return false

            const cred = await credRepo.findOne({
                where: {
                    credentialName,
                    ...(workspaceId ? { workspaceId } : {})
                }
            })

            return !!cred
        } catch (err: any) {
            logger.error(`[DynamicQuestionGenerator] Error checking credential:`, err.message)
            return false
        }
    }

    /**
     * Map service name to credential name
     */
    private static serviceToCredentialName(serviceName: string): string | null {
        const mapping: Record<string, string> = {
            'Twitter': 'twitterOAuth2',
            'YouTube': 'youtubeOAuth2',
            'Gmail': 'gmailOAuth2',
            'Email': 'resendApi',  // Platform default
            'Slack': 'slackApi',
            'Discord': 'discordWebhook',
            'Telegram': 'telegramBot',
            'WhatsApp': 'twilioApi',
            'Notion': 'notionApi',
            'Airtable': 'airtableApi',
            'Google Sheets': 'googleSheetsOAuth2',
            'Google Docs': 'googleDocsOAuth2',
            'Google Drive': 'googleDriveOAuth2',
            'Google Calendar': 'googleCalendarOAuth2',
            'HubSpot': 'hubspotApi',
            'Salesforce': 'salesforceOAuth2',
            'Shopify': 'shopifyApi',
            'Stripe': 'stripeApi',
            'Web Search': 'serperApi',
            'OpenAI': 'openAIApi',
            'Anthropic': 'anthropicApi',
            'Whisper': 'assemblyAIApi',
            'Blog': 'wordpressApi',
            'Instagram': 'instagramApi',
            'LinkedIn': 'linkedinOAuth2',
            'Microsoft Teams': 'microsoftTeamsOAuth2',
            'Microsoft Outlook': 'microsoftOutlookOAuth2'
        }

        return mapping[serviceName] || null
    }

    /**
     * Merge user answers into questions (mark as answered)
     */
    static mergeAnswers(questions: DynamicQuestion[], answers: Record<string, any>): DynamicQuestion[] {
        return questions.map(q => ({
            ...q,
            answered: answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
        })) as any
    }
}

