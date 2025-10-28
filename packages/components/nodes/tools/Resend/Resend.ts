import { getCredentialData, getCredentialParam } from '../../../src/utils'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class Resend_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Resend'
        this.name = 'resend'
        this.version = 1.0
        this.type = 'Resend'
        this.icon = 'resend.svg'
        this.category = 'Tools'
        this.description = 'Send emails using Resend API'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['resendApi']
        }
        this.inputs = [
            {
                label: 'To',
                name: 'to',
                type: 'string',
                description: 'Recipient email address(es), comma-separated',
                placeholder: 'user@example.com',
                optional: true
            },
            {
                label: 'From',
                name: 'from',
                type: 'string',
                description: 'Sender email address (must be verified domain)',
                placeholder: 'noreply@yourdomain.com',
                optional: true
            },
            {
                label: 'Subject',
                name: 'subject',
                type: 'string',
                description: 'Email subject',
                placeholder: 'Your Daily Update',
                optional: true
            },
            {
                label: 'Body',
                name: 'body',
                type: 'string',
                description: 'Email body content (supports HTML)',
                placeholder: '<p>Hello!</p>',
                rows: 4,
                optional: true
            },
            {
                label: 'CC',
                name: 'cc',
                type: 'string',
                description: 'CC email address(es), comma-separated',
                placeholder: 'cc@example.com',
                optional: true
            },
            {
                label: 'BCC',
                name: 'bcc',
                type: 'string',
                description: 'BCC email address(es), comma-separated',
                placeholder: 'bcc@example.com',
                optional: true
            },
            {
                label: 'Reply To',
                name: 'replyTo',
                type: 'string',
                description: 'Reply-to email address',
                placeholder: 'support@yourdomain.com',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const defaultFrom = getCredentialParam('fromEmail', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('Resend API key is required')
        }

        // Get parameters
        const to = nodeData.inputs?.to as string
        const from = (nodeData.inputs?.from as string) || defaultFrom || 'onboarding@resend.dev'
        const subject = nodeData.inputs?.subject as string
        const body = nodeData.inputs?.body as string
        const cc = nodeData.inputs?.cc as string
        const bcc = nodeData.inputs?.bcc as string
        const replyTo = nodeData.inputs?.replyTo as string

        const sendEmail = async (input: string): Promise<string> => {
            try {
                // Parse input if it contains email params
                let emailParams: any = {}
                try {
                    emailParams = JSON.parse(input)
                } catch {
                    // If not JSON, treat as body text
                    emailParams = { body: input }
                }

                const payload: any = {
                    from: emailParams.from || from,
                    to: emailParams.to || to || '',
                    subject: emailParams.subject || subject || 'No Subject',
                    html: emailParams.html || emailParams.body || body || ''
                }

                // Add optional fields
                if (emailParams.cc || cc) payload.cc = emailParams.cc || cc
                if (emailParams.bcc || bcc) payload.bcc = emailParams.bcc || bcc
                if (emailParams.replyTo || replyTo) payload.reply_to = emailParams.replyTo || replyTo

                // Validate required fields
                if (!payload.to) {
                    throw new Error('Recipient email (to) is required')
                }

                // Call Resend API
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(result.message || `Resend API error: ${response.status}`)
                }

                return JSON.stringify({
                    success: true,
                    emailId: result.id,
                    message: `Email sent successfully to ${payload.to}`
                })
            } catch (error: any) {
                throw new Error(`Failed to send email: ${error.message}`)
            }
        }

        return [{
            name: 'send_email',
            description: 'Send an email using Resend. Input should be a JSON string with fields: to, subject, body (or html), from (optional), cc (optional), bcc (optional), replyTo (optional). Or just plain text which will be used as the email body.',
            func: sendEmail
        }]
    }
}

module.exports = { nodeClass: Resend_Tools }


