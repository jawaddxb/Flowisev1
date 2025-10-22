import { Request, Response, NextFunction } from 'express'
import providerService from '../../services/orchestrator/providers'

const getProviders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        const providers = await providerService.getProviders(workspaceId)
        return res.json(providers)
    } catch (error) {
        next(error)
    }
}

const getProviderWorkflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { provider } = req.params
        const workspaceId = req.user?.activeWorkspaceId
        const workflows = await providerService.getProviderWorkflows(provider, workspaceId)
        return res.json(workflows)
    } catch (error) {
        next(error)
    }
}

const getWorkflowPreview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { provider, workflowId } = req.params
        const workspaceId = req.user?.activeWorkspaceId
        const preview = await providerService.getWorkflowPreview(provider, workflowId, workspaceId)
        return res.json(preview)
    } catch (error) {
        next(error)
    }
}

export default {
    getProviders,
    getProviderWorkflows,
    getWorkflowPreview
}

