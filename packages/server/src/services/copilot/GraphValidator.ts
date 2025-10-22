/**
 * Validates graph structure for completeness and correctness
 */
export class GraphValidator {
    /**
     * Validate a flow graph
     * @param flowData - The flow data with nodes and edges
     * @returns Validation result with issues
     */
    static validateGraph(flowData: any): { valid: boolean; issues: string[] } {
        const issues: string[] = []
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []

        if (nodes.length === 0) {
            issues.push('Graph must have at least one node')
            return { valid: false, issues }
        }

        // Check for entry point (agent or standalone chat model)
        const agentNodes = nodes.filter((n: any) => n.data?.category === 'Agents')
        const chatModelNodes = nodes.filter((n: any) => n.data?.category === 'Chat Models')
        
        if (agentNodes.length === 0 && chatModelNodes.length === 0) {
            issues.push('Graph must have at least one Agent or Chat Model as entry point')
        }

        // Check for tool nodes without agent
        const toolNodes = nodes.filter((n: any) => n.data?.category === 'Tools')
        if (toolNodes.length > 0 && agentNodes.length === 0) {
            issues.push('Tool nodes require an Agent to use them')
        }

        // Validate edges reference existing nodes
        const nodeIds = new Set(nodes.map((n: any) => n.id))
        for (const edge of edges) {
            if (!nodeIds.has(edge.source)) {
                issues.push(`Edge references non-existent source node: ${edge.source}`)
            }
            if (!nodeIds.has(edge.target)) {
                issues.push(`Edge references non-existent target node: ${edge.target}`)
            }
        }

        // Check if agent has required inputs (model + tools)
        for (const agentNode of agentNodes) {
            const agentId = agentNode.id
            const incomingEdges = edges.filter((e: any) => e.target === agentId)
            
            // Check for model connection
            const hasModelInput = incomingEdges.some((e: any) => {
                const sourceNode = nodes.find((n: any) => n.id === e.source)
                return sourceNode?.data?.category === 'Chat Models'
            })
            
            if (!hasModelInput) {
                issues.push(`Agent "${agentNode.data.label}" requires a Chat Model connection`)
            }
            
            // Check for tool connections
            const hasToolInput = incomingEdges.some((e: any) => {
                const sourceNode = nodes.find((n: any) => n.id === e.source)
                return sourceNode?.data?.category === 'Tools'
            })
            
            if (!hasToolInput) {
                issues.push(`Agent "${agentNode.data.label}" requires at least one Tool connection`)
            }
        }

        // Check for orphaned nodes (nodes with no connections in either direction)
        // Allow sticky notes to be orphaned
        for (const node of nodes) {
            if (node.type === 'stickyNote') continue
            
            const hasConnection = edges.some((e: any) => e.source === node.id || e.target === node.id)
            if (!hasConnection && nodes.length > 1) {
                issues.push(`Node "${node.data?.label || node.id}" is not connected to the graph`)
            }
        }

        return {
            valid: issues.length === 0,
            issues
        }
    }

    /**
     * Check if a graph has any entry points
     */
    static hasEntryPoint(flowData: any): boolean {
        const nodes = flowData.nodes || []
        return nodes.some((n: any) => 
            n.data?.category === 'Agents' || 
            n.data?.category === 'Chat Models'
        )
    }
}

