import type { WorkflowSpec } from './WorkflowCompilerService'
import { isPlatformManaged } from './IntegrationCatalog'

export interface CostEstimate {
    predictions_per_run: number
    external_api_calls: number
    platform_managed_calls: number
    personal_calls: number
    estimated_monthly_cost?: number
    complexity: 'low' | 'medium' | 'high'
}

export class CostEstimator {
    /**
     * Estimate cost for a workflow based on primitives
     */
    static estimateCost(workflowSpec: WorkflowSpec, schedule?: string): CostEstimate {
        let predictions = 0
        let platformCalls = 0
        let personalCalls = 0
        let totalAPICalls = 0

        const nodes = workflowSpec.workflow.nodes || []

        for (const node of nodes) {
            // AI agents consume predictions
            if (node.primitive === 'ai_agent') {
                predictions += 1
            }

            // Data sources are API calls
            if (node.primitive === 'data_source') {
                totalAPICalls += 1
                // Check if platform-managed
                const service = this.getServiceFromImplementation(node.implementation)
                if (service && isPlatformManaged(service)) {
                    platformCalls += 1
                } else {
                    personalCalls += 1
                }
            }

            // Integrators are API calls
            if (node.primitive === 'integrator') {
                totalAPICalls += 1
                personalCalls += 1  // Most integrations are personal
            }

            // Communicators are API calls
            if (node.primitive === 'communicator') {
                totalAPICalls += 1
                const service = this.getServiceFromImplementation(node.implementation)
                if (service && isPlatformManaged(service)) {
                    platformCalls += 1
                } else {
                    personalCalls += 1
                }
            }
        }

        // Estimate monthly cost based on schedule
        let estimatedMonthly: number | undefined
        if (schedule === 'Daily') {
            estimatedMonthly = predictions * 30
        } else if (schedule === 'Weekly') {
            estimatedMonthly = predictions * 4
        }

        // Determine complexity
        const complexity = this.determineComplexity(workflowSpec)

        return {
            predictions_per_run: Math.max(1, predictions),
            external_api_calls: totalAPICalls,
            platform_managed_calls: platformCalls,
            personal_calls: personalCalls,
            estimated_monthly_cost: estimatedMonthly,
            complexity
        }
    }

    /**
     * Determine workflow complexity
     */
    private static determineComplexity(workflowSpec: WorkflowSpec): 'low' | 'medium' | 'high' {
        const nodeCount = workflowSpec.workflow.nodes?.length || 0
        const hasParallel = workflowSpec.workflow.nodes?.some(n => n.parallel_group !== null && n.parallel_group !== undefined)
        const hasController = workflowSpec.workflow.nodes?.some(n => n.primitive === 'controller')
        const aiAgentCount = workflowSpec.workflow.nodes?.filter(n => n.primitive === 'ai_agent').length || 0

        if (nodeCount > 8 || aiAgentCount > 3 || hasParallel || hasController) {
            return 'high'
        } else if (nodeCount > 4 || aiAgentCount > 1) {
            return 'medium'
        } else {
            return 'low'
        }
    }

    /**
     * Map implementation to service name
     */
    private static getServiceFromImplementation(implementation: string): string | null {
        const mapping: Record<string, string> = {
            'twitter': 'Twitter',
            'youtube': 'YouTube',
            'gmail': 'Email',
            'email': 'Email',
            'slack': 'Slack',
            'discord': 'Discord',
            'web_search': 'Web Search',
            'shopify': 'Shopify',
            'stripe': 'Stripe',
            'hubspot': 'HubSpot',
            'notion': 'Notion',
            'blog': 'Blog',
            'web_scraper': 'Web Scraper'
        }

        return mapping[implementation] || null
    }
}


