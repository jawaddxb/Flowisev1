import { v4 as uuidv4 } from 'uuid'
import { NodeTemplateResolver } from './NodeTemplateResolver'
import { INTEGRATION_CATALOG, getPrimaryNode } from './IntegrationCatalog'
import type { PrimitiveNode, WorkflowSpec } from './WorkflowCompilerService'
import logger from '../../utils/logger'

export interface FlowiseWorkflow {
    nodes: any[]
    edges: any[]
}

export class PrimitiveMapper {
    /**
     * Map LLM primitive graph to Flowise nodes and edges
     */
    static mapPrimitiveGraph(workflowSpec: WorkflowSpec, credentialMappings: any[] = []): FlowiseWorkflow {
        const nodes: any[] = []
        const edges: any[] = []
        const nodeIdMap = new Map<string, string>() // primitive ID → Flowise node ID

        logger.debug(`[PrimitiveMapper] Mapping ${workflowSpec.workflow.nodes.length} primitive nodes`)

        // Create Flowise nodes from primitives
        for (const primitive of workflowSpec.workflow.nodes) {
            try {
                const flowiseNode = this.createFlowiseNode(primitive, credentialMappings)
                if (flowiseNode) {
                    nodes.push(flowiseNode)
                    nodeIdMap.set(primitive.id, flowiseNode.id)
                }
            } catch (err: any) {
                logger.error(`[PrimitiveMapper] Failed to create node for ${primitive.id}:`, err.message)
                // Continue with other nodes
            }
        }

        // Create edges based on primitive dependencies
        for (const primitive of workflowSpec.workflow.nodes) {
            if (!primitive.inputs || primitive.inputs.length === 0) continue

            const targetNodeId = nodeIdMap.get(primitive.id)
            if (!targetNodeId) continue

            for (const inputPrimitiveId of primitive.inputs) {
                const sourceNodeId = nodeIdMap.get(inputPrimitiveId)
                if (!sourceNodeId) continue

                // Create edge from source to target
                edges.push({
                    id: `edge_${sourceNodeId}_${targetNodeId}_${uuidv4().substring(0, 8)}`,
                    source: sourceNodeId,
                    target: targetNodeId,
                    sourceHandle: `${sourceNodeId}-output-0`,
                    targetHandle: `${targetNodeId}-input-0`,
                    type: 'buttonedge'
                })
            }
        }

        logger.info(`[PrimitiveMapper] Mapped to ${nodes.length} nodes and ${edges.length} edges`)

        return { nodes, edges }
    }

    /**
     * Create a single Flowise node from a primitive
     */
    private static createFlowiseNode(primitive: PrimitiveNode, credentialMappings: any[]): any {
        const position = primitive.position_hint || { x: 100, y: 100 }
        const credential = this.findCredentialId(primitive, credentialMappings)

        switch (primitive.primitive) {
            case 'data_source':
                return this.createDataSourceNode(primitive, position, credential)
            case 'processor':
                return this.createProcessorNode(primitive, position, credential)
            case 'ai_agent':
                return this.createAIAgentNode(primitive, position, credential)
            case 'integrator':
                return this.createIntegratorNode(primitive, position, credential)
            case 'controller':
                return this.createControllerNode(primitive, position, credential)
            case 'storage':
                return this.createStorageNode(primitive, position, credential)
            case 'communicator':
                return this.createCommunicatorNode(primitive, position, credential)
            default:
                logger.warn(`[PrimitiveMapper] Unknown primitive type: ${primitive.primitive}`)
                return null
        }
    }

    private static createDataSourceNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        const nodeMapping: Record<string, string> = {
            'twitter': 'twitterSearch',
            'youtube': 'youtubeSearch',
            'gmail': 'gmail',
            'google_sheets': 'googleSheets',
            'rss': 'requestsGet',
            'webhook': 'requestsPost',
            'web_search': 'serper'  // Default to Serper (platform-managed)
        }

        const nodeName = nodeMapping[primitive.implementation] || 'requestsPost'

        return NodeTemplateResolver.createNode({
            name: nodeName,
            label: primitive.label,
            position,
            inputs: primitive.config || {},
            credential
        })
    }

    private static createProcessorNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        const nodeMapping: Record<string, string> = {
            'filter': 'ifElse',
            'aggregator': 'calculator',
            'parser': 'customCode',
            'json_transformer': 'customCode',
            'validator': 'ifElse'
        }

        const nodeName = nodeMapping[primitive.implementation] || 'customCode'

        return NodeTemplateResolver.createNode({
            name: nodeName,
            label: primitive.label,
            position,
            inputs: primitive.config || {},
            credential
        })
    }

    private static createAIAgentNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        const systemMessages: Record<string, string> = {
            'sentiment_analysis': 'Analyze the sentiment of the following text. Return: positive, negative, or neutral with confidence score.',
            'text_generation': 'Generate high-quality content based on the following input.',
            'summarization': 'Summarize the following content concisely, focusing on key points.',
            'classification': 'Classify the following input into the appropriate category.',
            'translation': 'Translate the following text to the target language.',
            'qa': 'Answer questions based on the provided context.',
            'transcription': 'Transcribe the audio accurately.'
        }

        const systemMessage = systemMessages[primitive.implementation] || 'Process the following input:'

        // Most AI agents use chat models
        if (primitive.implementation === 'transcription') {
            return NodeTemplateResolver.createNode({
                name: 'assemblyAI',
                label: primitive.label,
                position,
                inputs: primitive.config || {},
                credential
            })
        } else if (primitive.implementation === 'image_generation') {
            return NodeTemplateResolver.createNode({
                name: 'dalle',
                label: primitive.label,
                position,
                inputs: primitive.config || {},
                credential
            })
        } else {
            // Default to chatOpenAI with custom system message
            return NodeTemplateResolver.createNode({
                name: 'chatOpenAI',
                label: primitive.label,
                position,
                inputs: {
                    modelName: 'gpt-4o-mini',
                    systemMessage,
                    temperature: 0.3,
                    ...primitive.config
                },
                credential
            })
        }
    }

    private static createIntegratorNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        // Most integrators are HTTP requests
        const method = primitive.config?.method || 'POST'
        const nodeName = method === 'GET' ? 'requestsGet' : method === 'PUT' ? 'requestsPut' : method === 'DELETE' ? 'requestsDelete' : 'requestsPost'
        
        return NodeTemplateResolver.createNode({
            name: nodeName,
            label: primitive.label,
            position,
            inputs: {
                url: primitive.config?.url || '{{api_endpoint}}',
                headers: primitive.config?.headers || '{"Content-Type": "application/json"}',
                body: primitive.config?.body || '{{payload}}',
                ...primitive.config
            },
            credential
        })
    }

    private static createControllerNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        const nodeMapping: Record<string, string> = {
            'time_filter': 'ifElse',
            'conditional_branch': 'ifElse',
            'loop': 'customCode',
            'delay': 'customCode'
        }

        const nodeName = nodeMapping[primitive.implementation] || 'ifElse'

        return NodeTemplateResolver.createNode({
            name: nodeName,
            label: primitive.label,
            position,
            inputs: primitive.config || {},
            credential
        })
    }

    private static createStorageNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        const nodeMapping: Record<string, string> = {
            'postgres': 'postgres',
            'mongodb': 'mongodb',
            'redis': 'redis',
            'file_system': 'writeFile',
            's3': 'httpRequest'
        }

        const nodeName = nodeMapping[primitive.implementation] || 'writeFile'

        return NodeTemplateResolver.createNode({
            name: nodeName,
            label: primitive.label,
            position,
            inputs: primitive.config || {},
            credential
        })
    }

    private static createCommunicatorNode(primitive: PrimitiveNode, position: any, credential?: string): any {
        const nodeMapping: Record<string, string> = {
            'email': 'resend',  // Default to platform email
            'slack': 'slackMCP',
            'discord': 'requestsPost',
            'telegram': 'requestsPost',
            'sms': 'requestsPost',
            'webhook': 'requestsPost',
            'blog': 'requestsPost',
            'social_media': 'requestsPost'
        }

        let nodeName = nodeMapping[primitive.implementation] || 'requestsPost'

        // Handle email provider selection
        if (primitive.implementation === 'email') {
            const provider = primitive.config?.provider
            if (provider === 'gmail') nodeName = 'gmail'
            else if (provider === 'outlook') nodeName = 'microsoftOutlook'
            else nodeName = 'resend'  // Platform default
        }

        return NodeTemplateResolver.createNode({
            name: nodeName,
            label: primitive.label,
            position,
            inputs: primitive.config || {},
            credential
        })
    }

    /**
     * Helper to create generic HTTP node
     */
    static createHTTPNode(label: string, config?: any, position?: any): any {
        const method = config?.method || 'POST'
        const nodeName = method === 'GET' ? 'requestsGet' : method === 'PUT' ? 'requestsPut' : method === 'DELETE' ? 'requestsDelete' : 'requestsPost'
        
        return NodeTemplateResolver.createNode({
            name: nodeName,
            label,
            position: position || { x: 100, y: 100 },
            inputs: {
                url: config?.url || '{{api_endpoint}}',
                headers: config?.headers || '{"Content-Type": "application/json"}',
                body: config?.body || '{{payload}}',
                ...config
            }
        })
    }

    /**
     * Find credential ID for a primitive from mappings
     */
    private static findCredentialId(primitive: PrimitiveNode, credentialMappings: any[]): string | undefined {
        if (!primitive.config?.credential) return undefined

        const mapping = credentialMappings.find((m: any) =>
            m.credentialName === primitive.config?.credential ||
            m.service === primitive.implementation
        )

        return mapping?.credentialId
    }

    /**
     * Extract all services used in workflow (for credential detection)
     */
    static extractServices(workflowSpec: WorkflowSpec): string[] {
        const services = new Set<string>()

        for (const node of workflowSpec.workflow.nodes) {
            // Try to map implementation to service name
            const service = this.implementationToService(node.implementation)
            if (service) services.add(service)
        }

        // Also add from credentials_needed
        for (const cred of workflowSpec.workflow.credentials_needed || []) {
            services.add(cred.service)
        }

        return Array.from(services)
    }

    /**
     * Map implementation string to service name
     */
    private static implementationToService(implementation: string): string | null {
        const mapping: Record<string, string> = {
            'twitter': 'Twitter',
            'youtube': 'YouTube',
            'gmail': 'Email',
            'email': 'Email',
            'slack': 'Slack',
            'discord': 'Discord',
            'telegram': 'Telegram',
            'blog': 'Blog',
            'web_search': 'Web Search',
            'shopify': 'Shopify',
            'stripe': 'Stripe',
            'hubspot': 'HubSpot',
            'notion': 'Notion',
            'airtable': 'Airtable',
            'google_sheets': 'Google Sheets',
            'sentiment_analysis': 'OpenAI',
            'text_generation': 'OpenAI',
            'summarization': 'OpenAI',
            'classification': 'OpenAI',
            'transcription': 'Whisper',
            'web_scraper': 'Web Scraper'
        }

        return mapping[implementation] || null
    }
}

