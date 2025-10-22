import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { v4 as uuidv4 } from 'uuid'
import { ICommonObject } from 'flowise-components'

interface CreateNodeOptions {
    name: string
    label?: string
    position: { x: number; y: number }
    inputs?: Record<string, any>
    credential?: string
}

/**
 * Resolves node templates from NodesPool and creates fully-shaped ReactFlow nodes
 */
export class NodeTemplateResolver {
    /**
     * Create a fully-shaped node for ReactFlow canvas
     */
    static createNode(options: CreateNodeOptions): any {
        const { name, label, position, inputs = {}, credential } = options
        const app = getRunningExpressApp()
        const nodeTemplate = app.nodesPool.componentNodes[name]
        
        if (!nodeTemplate) {
            throw new Error(`Node template not found: ${name}`)
        }

        const nodeId = `${name}_${uuidv4().substring(0, 8)}`
        
        // Build inputAnchors and outputAnchors from template
        const inputAnchors = (nodeTemplate.inputs || [])
            .filter((param: any) => param.type && !['string', 'number', 'boolean', 'password', 'json', 'code', 'options', 'credential'].includes(param.type))
            .map((param: any) => ({
                id: `${nodeId}-input-${param.name}-${param.type}`,
                name: param.name,
                label: param.label || param.name,
                type: param.type,
                optional: param.optional || false,
                list: param.list || false
            }))

        const outputAnchors = (nodeTemplate.baseClasses || []).map((cls: string, idx: number) => ({
            id: `${nodeId}-output-${nodeTemplate.name}-${cls}`,
            name: nodeTemplate.name,
            label: nodeTemplate.label,
            type: cls
        }))

        // Build inputParams from template
        const inputParams = (nodeTemplate.inputs || []).map((param: any) => ({
            label: param.label || param.name,
            name: param.name,
            type: param.type,
            optional: param.optional || false,
            default: param.default,
            description: param.description,
            rows: param.rows,
            placeholder: param.placeholder,
            list: param.list,
            options: param.options,
            acceptVariable: param.acceptVariable,
            additionalParams: param.additionalParams,
            credentialNames: param.credentialNames
        }))

        const node: any = {
            id: nodeId,
            type: 'customNode',
            position,
            positionAbsolute: position,
            width: 300,
            height: NodeTemplateResolver.estimateHeight(nodeTemplate),
            data: {
                id: nodeId,
                label: label || nodeTemplate.label,
                version: nodeTemplate.version || 1,
                name: nodeTemplate.name,
                type: nodeTemplate.type,
                baseClasses: nodeTemplate.baseClasses || [],
                category: nodeTemplate.category,
                description: nodeTemplate.description || '',
                inputParams,
                inputAnchors,
                inputs: { ...inputs },
                outputAnchors,
                outputs: {},
                selected: false
            },
            selected: false,
            dragging: false
        }

        // Add credential if specified (bind to data, not root)
        if (credential && nodeTemplate.credential) {
            node.data.credential = credential
        }

        return node
    }

    /**
     * Estimate node height based on number of inputs
     */
    private static estimateHeight(nodeTemplate: any): number {
        const inputCount = (nodeTemplate.inputs || []).length
        const baseHeight = 200
        const perInputHeight = 60
        return Math.max(baseHeight, baseHeight + inputCount * perInputHeight)
    }

    /**
     * Create an edge between two nodes
     */
    static createEdge(sourceId: string, sourceHandle: string, targetId: string, targetHandle: string): any {
        return {
            id: `${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            sourceHandle,
            targetHandle,
            type: 'buttonedge',
            data: {}
        }
    }

    /**
     * Find output handle for a node by type
     */
    static findOutputHandle(node: any, targetType: string): string | null {
        const outputAnchors = node.data?.outputAnchors || []
        const match = outputAnchors.find((anchor: any) => 
            anchor.type === targetType || 
            anchor.type.includes(targetType) ||
            targetType.includes(anchor.type)
        )
        return match?.id || (outputAnchors[0]?.id || null)
    }

    /**
     * Find input handle for a node by type
     */
    static findInputHandle(node: any, sourceType: string): string | null {
        const inputAnchors = node.data?.inputAnchors || []
        const match = inputAnchors.find((anchor: any) => 
            anchor.type === sourceType || 
            anchor.type.includes(sourceType) ||
            sourceType.includes(anchor.type)
        )
        return match?.id || (inputAnchors[0]?.id || null)
    }
}

