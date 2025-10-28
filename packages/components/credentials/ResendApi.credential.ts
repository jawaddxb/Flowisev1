import { INodeParams, INodeCredential } from '../src/Interface'

class ResendApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Resend API'
        this.name = 'resendApi'
        this.version = 1.0
        this.description =
            'You can find your API key at <a target="_blank" href="https://resend.com/api-keys">Resend API Keys</a>'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                placeholder: 're_...'
            },
            {
                label: 'From Email',
                name: 'fromEmail',
                type: 'string',
                placeholder: 'noreply@yourdomain.com',
                description: 'Default sender email address',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: ResendApi }


