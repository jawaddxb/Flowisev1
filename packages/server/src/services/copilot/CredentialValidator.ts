import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'

export interface CredentialGap {
    field: string
    label: string
    type: 'credential'
    credentialName: string
    isPersonal: boolean
}

export interface CredentialMapping {
    nodeName: string
    credentialId: string
    credentialName: string
}

/**
 * Validates if required credentials exist for nodes
 */
export class CredentialValidator {
    /**
     * Check if required credentials exist for the given node names
     * @param nodeNames - Array of node names that will be created
     * @param workspaceId - Optional workspace ID for scoped credentials
     * @returns Object with gaps and available credential mappings
     */
    static async validateNodeCredentials(
        nodeNames: string[], 
        workspaceId?: string
    ): Promise<{ gaps: CredentialGap[]; credentialMappings: CredentialMapping[] }> {
        const app = getRunningExpressApp()
        const gaps: CredentialGap[] = []
        const credentialMappings: CredentialMapping[] = []

        for (const nodeName of nodeNames) {
            const nodeTemplate = app.nodesPool.componentNodes[nodeName]
            if (!nodeTemplate) continue

            // Check if node requires credentials
            const credentialParam = nodeTemplate.credential
            if (!credentialParam || credentialParam.optional) continue

            const credentialNames = credentialParam.credentialNames || []
            
            for (const credName of credentialNames) {
                // Check if credential exists in database
                const credRepo = app.AppDataSource.getRepository(Credential)
                const existingCred = await credRepo.findOne({
                    where: { 
                        credentialName: credName,
                        ...(workspaceId ? { workspaceId } : {})
                    }
                })

                if (existingCred) {
                    // Credential exists - add to mappings
                    credentialMappings.push({
                        nodeName,
                        credentialId: existingCred.id,
                        credentialName: credName
                    })
                } else {
                    // Credential missing - add to gaps
                    const companyManagedCreds = ['braveSearchApi', 'openRouterApi', 'serperApi', 'serpApi']
                    const isPersonal = !companyManagedCreds.includes(credName)

                    gaps.push({
                        field: `credential:${credName}`,
                        label: `${nodeTemplate.label} - ${credName}`,
                        type: 'credential',
                        credentialName: credName,
                        isPersonal
                    })
                }
            }
        }

        return { gaps, credentialMappings }
    }

    /**
     * Check if a specific credential exists
     */
    static async credentialExists(credentialName: string, workspaceId?: string): Promise<boolean> {
        const app = getRunningExpressApp()
        const credRepo = app.AppDataSource.getRepository(Credential)
        const existingCred = await credRepo.findOne({
            where: { 
                credentialName,
                ...(workspaceId ? { workspaceId } : {})
            }
        })
        return !!existingCred
    }
}

