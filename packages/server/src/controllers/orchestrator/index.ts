import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import orchestratorService from '../../services/orchestrator'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const getAllOrchestrators = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        const orchestrators = await orchestratorService.getAllOrchestrators(workspaceId)
        return res.json(orchestrators)
    } catch (error) {
        next(error)
    }
}

const getOrchestrator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const orchestrator = await orchestratorService.getOrchestrator(id)
        return res.json(orchestrator)
    } catch (error) {
        next(error)
    }
}

const createOrchestrator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        const orchestrator = await orchestratorService.createOrchestrator(req.body, workspaceId)
        return res.status(StatusCodes.CREATED).json(orchestrator)
    } catch (error) {
        next(error)
    }
}

const updateOrchestrator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const orchestrator = await orchestratorService.updateOrchestrator(id, req.body)
        return res.json(orchestrator)
    } catch (error) {
        next(error)
    }
}

const deleteOrchestrator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        await orchestratorService.deleteOrchestrator(id)
        return res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
        next(error)
    }
}

const runOrchestrator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const run = await orchestratorService.runOrchestrator(id, req.body)
        return res.json(run)
    } catch (error) {
        next(error)
    }
}

const getOrchestratorRuns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const runs = await orchestratorService.getOrchestratorRuns(id)
        return res.json(runs)
    } catch (error) {
        next(error)
    }
}

const handleCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params
        await orchestratorService.handleCallback(token, req.body)
        return res.json({ success: true })
    } catch (error) {
        next(error)
    }
}

export default {
    getAllOrchestrators,
    getOrchestrator,
    createOrchestrator,
    updateOrchestrator,
    deleteOrchestrator,
    runOrchestrator,
    getOrchestratorRuns,
    handleCallback
}

